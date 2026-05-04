import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyWebhookSignature } from "@/lib/bold/integrity";
import {
  BOLD_EVENT_TO_STATUS,
  type BoldWebhookPayload,
} from "@/lib/bold/types";
import { sendEmail } from "@/lib/email/client";
import { OrderPaid } from "@/lib/email/templates/order-paid";
import { OrderRejected } from "@/lib/email/templates/order-rejected";
import { OrderRefunded } from "@/lib/email/templates/order-refunded";

/**
 * Webhook receptor de Bold (refactor 2026-05-04 patrón ack-temprano).
 *
 * Bold envía POST a esta URL con cuatro tipos de eventos:
 *   - SALE_APPROVED → marca orden pagada, descuenta stock, envía email
 *   - SALE_REJECTED → marca rechazada, envía email con CTA reintentar
 *   - VOID_APPROVED → reembolso confirmado, repone stock, envía email
 *   - VOID_REJECTED → log para auditoría, no afecta cliente
 *
 * Diseño anti-timeout (recomendado por Bold):
 *   1. Operaciones críticas DENTRO del response window:
 *      - Validar firma HMAC.
 *      - Validar idempotencia.
 *      - UPDATE orders en Supabase.
 *      - decrementStock/incrementStock (transaccional).
 *   2. Operaciones diferidas via `after()` (ejecutan POST-response, sin
 *      bloquear el ack a Bold):
 *      - sendEmail al cliente.
 *      - Tracking events (futuro Klaviyo).
 *
 * Esto reduce el tiempo de respuesta del webhook de potencialmente 3-5
 * segundos (esperando a Resend) a sub-segundo, eliminando timeouts.
 *
 * Try/catch global: si CUALQUIER cosa rompe, capturamos, logueamos y
 * respondemos 500 con info del error. Bold reintenta automáticamente.
 *
 * Cliente service role: usamos SERVICE_ROLE_KEY porque el webhook se
 * ejecuta sin sesión y necesita actualizar `orders` y `products.stock`
 * saltándose RLS.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // necesitamos node:crypto

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service role no configurado (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY ausente)",
    );
  }
  return createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Generador de request ID corto para correlacionar logs de un mismo
 * webhook. Aparece como prefijo en cada log relacionado con esa request.
 */
function newRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(req: Request) {
  const reqId = newRequestId();
  const t0 = Date.now();
  const log = (msg: string, extra?: Record<string, unknown>) => {
    const elapsed = Date.now() - t0;
    if (extra) {
      console.log(`[bold-webhook ${reqId} +${elapsed}ms] ${msg}`, extra);
    } else {
      console.log(`[bold-webhook ${reqId} +${elapsed}ms] ${msg}`);
    }
  };
  const logErr = (msg: string, err: unknown) => {
    const elapsed = Date.now() - t0;
    console.error(`[bold-webhook ${reqId} +${elapsed}ms ERROR] ${msg}`, err);
  };

  // Try/catch global: nada debe escapar como excepción no manejada.
  try {
    log("inicio");

    // 1. Leer raw body
    let rawBody: string;
    try {
      rawBody = await req.text();
    } catch (err) {
      logErr("no se pudo leer body", err);
      return NextResponse.json({ error: "Cannot read body" }, { status: 400 });
    }
    log("body leído", { bytes: rawBody.length });

    // 2. Verificar firma HMAC
    const signature = req.headers.get("x-bold-signature");
    if (!verifyWebhookSignature(rawBody, signature)) {
      log("firma inválida o ausente, rechazando 401");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }
    log("firma válida");

    // 3. Parsear payload JSON
    let payload: BoldWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      logErr("JSON inválido", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventType = payload.type;
    const orderNumber = payload.data?.metadata?.reference;
    const paymentId = payload.data?.payment_id;

    log("payload parseado", {
      eventType,
      orderNumber,
      paymentId,
    });

    if (!orderNumber || !paymentId) {
      log("payload sin reference o payment_id, rechazando 400");
      return NextResponse.json(
        { error: "Missing reference or payment_id" },
        { status: 400 },
      );
    }

    if (!BOLD_EVENT_TO_STATUS[eventType]) {
      log(`evento ignorado: ${eventType}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    // 4. Buscar la orden por order_number
    const supabase = getServiceClient();
    const { data: order, error: queryErr } = await supabase
      .from("orders")
      .select(
        `id, order_number, customer_email, customer_name, customer_phone,
         subtotal_cop, shipping_cop, tax_cop, total_cop, payment_status,
         bold_payment_id,
         shipping_recipient, shipping_street, shipping_details,
         shipping_city, shipping_department,
         items:order_items!order_id(product_id, product_name, quantity, subtotal_cop, unit_price_cop)`,
      )
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (queryErr) {
      logErr("query orders falló", queryErr);
      return NextResponse.json({ error: "DB query failed" }, { status: 500 });
    }

    if (!order) {
      log(`orden no encontrada: ${orderNumber} (responde 200 para no reintentar)`);
      // 200 deliberado: si la orden no existe en BD (raro), no queremos
      // que Bold reintente eternamente. Logueamos y damos por procesado.
      return NextResponse.json({ ok: true, not_found: true });
    }
    log("orden encontrada", { id: order.id, current_status: order.payment_status });

    // 5. Idempotencia
    const newStatus = BOLD_EVENT_TO_STATUS[eventType];
    if (
      order.bold_payment_id === paymentId &&
      order.payment_status === newStatus.payment_status
    ) {
      log("idempotente, ya procesado");
      return NextResponse.json({ ok: true, idempotent: true });
    }

    // 6. UPDATE orders (CRÍTICO, dentro del response window)
    const updateData: Record<string, unknown> = {
      payment_status: newStatus.payment_status,
      status: newStatus.status,
      bold_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    };
    if (eventType === "SALE_APPROVED") {
      updateData.paid_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", order.id);

    if (updateErr) {
      logErr("UPDATE orders falló", updateErr);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }
    log("UPDATE orders exitoso", {
      payment_status: newStatus.payment_status,
      status: newStatus.status,
    });

    // 7. Stock (dentro del response window porque es transaccional crítico).
    //    Si el webhook responde 200 sin descontar stock y la lambda muere,
    //    otro cliente podría comprar el mismo item ya vendido.
    const items = order.items as Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price_cop: number;
      subtotal_cop: number;
    }>;

    if (eventType === "SALE_APPROVED") {
      try {
        await decrementStock(supabase, items, log);
      } catch (err) {
        // Si el stock falla, NO retornamos 500 — el pago ya está confirmado
        // en BD y el cliente debe recibir su email. Logueamos para alertar
        // al admin que revise stock manualmente.
        logErr("decrementStock falló (continuando, pago ya confirmado)", err);
      }
    } else if (eventType === "VOID_APPROVED") {
      try {
        await incrementStock(supabase, items, log);
      } catch (err) {
        logErr("incrementStock falló (continuando, reembolso ya marcado)", err);
      }
    }

    // 8. Side effects diferidos via `after()`. Estos NO bloquean la
    //    respuesta a Bold. Vercel mantiene la lambda viva hasta que
    //    completen, pero Bold ya tiene su 200 OK desde antes.
    after(async () => {
      const sideT0 = Date.now();
      const sideLog = (msg: string) =>
        console.log(
          `[bold-webhook ${reqId} after +${Date.now() - sideT0}ms] ${msg}`,
        );

      try {
        if (eventType === "SALE_APPROVED") {
          sideLog("enviando email order-paid");
          await sendOrderPaidEmail(order as OrderForEmail);
          sideLog("email order-paid enviado");
        } else if (eventType === "SALE_REJECTED") {
          sideLog("enviando email order-rejected");
          await sendOrderRejectedEmail(
            order as OrderForEmail,
            payload.data?.user_message,
          );
          sideLog("email order-rejected enviado");
        } else if (eventType === "VOID_APPROVED") {
          sideLog("enviando email order-refunded");
          await sendOrderRefundedEmail(order as OrderForEmail);
          sideLog("email order-refunded enviado");
        } else if (eventType === "VOID_REJECTED") {
          sideLog(
            `reembolso rechazado para ${orderNumber}: ${payload.data?.user_message}`,
          );
        }
      } catch (err) {
        // No retropropagar — el response ya se mandó. Solo logueamos.
        console.error(
          `[bold-webhook ${reqId} after ERROR] side effect falló:`,
          err,
        );
      }
    });

    // 9. ACK 200 (Bold lo recibe ya, sin esperar emails)
    log("respondiendo 200");
    return NextResponse.json({ ok: true, request_id: reqId });
  } catch (err) {
    // Catch global: cualquier excepción no manejada termina aquí.
    logErr("excepción no manejada en handler", err);
    return NextResponse.json(
      { error: "Internal error", request_id: reqId },
      { status: 500 },
    );
  }
}

/**
 * Decrementar stock de productos con track_stock=true.
 * Si el stock queda negativo (oversell por simultaneidad), lo dejamos en 0.
 */
async function decrementStock(
  supabase: ReturnType<typeof getServiceClient>,
  items: Array<{ product_id: string; quantity: number }>,
  log: (msg: string, extra?: Record<string, unknown>) => void,
) {
  for (const item of items) {
    const { data: product } = await supabase
      .from("products")
      .select("id, stock, track_stock")
      .eq("id", item.product_id)
      .maybeSingle();

    if (!product || !product.track_stock) continue;

    const currentStock = product.stock ?? 0;
    const newStock = Math.max(0, currentStock - item.quantity);

    await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", item.product_id);

    if (currentStock < item.quantity) {
      log(
        `oversell en ${item.product_id}: vendido ${item.quantity}, había ${currentStock}`,
      );
    }
  }
}

async function incrementStock(
  supabase: ReturnType<typeof getServiceClient>,
  items: Array<{ product_id: string; quantity: number }>,
  log: (msg: string, extra?: Record<string, unknown>) => void,
) {
  for (const item of items) {
    const { data: product } = await supabase
      .from("products")
      .select("id, stock, track_stock")
      .eq("id", item.product_id)
      .maybeSingle();
    if (!product || !product.track_stock) continue;
    const currentStock = product.stock ?? 0;
    await supabase
      .from("products")
      .update({ stock: currentStock + item.quantity })
      .eq("id", item.product_id);
    log(`stock repuesto en ${item.product_id}: +${item.quantity}`);
  }
}

type OrderForEmail = {
  order_number: string;
  customer_email: string;
  customer_name: string;
  subtotal_cop: number;
  shipping_cop: number;
  tax_cop: number;
  total_cop: number;
  shipping_recipient: string;
  shipping_street: string;
  shipping_details: string | null;
  shipping_city: string;
  shipping_department: string;
  items: Array<{
    product_name: string;
    quantity: number;
    subtotal_cop: number;
  }>;
};

async function sendOrderPaidEmail(order: OrderForEmail) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co";
  await sendEmail({
    to: order.customer_email,
    subject: `Pago confirmado · pedido ${order.order_number}`,
    template: OrderPaid({
      customerName: order.customer_name,
      orderNumber: order.order_number,
      items: order.items.map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        line_total: i.subtotal_cop,
      })),
      subtotal: order.subtotal_cop,
      shipping: order.shipping_cop,
      tax: order.tax_cop,
      total: order.total_cop,
      shippingAddress: {
        recipient: order.shipping_recipient,
        street: order.shipping_street,
        details: order.shipping_details,
        city: order.shipping_city,
        department: order.shipping_department,
      },
      trackingUrl: `${baseUrl}/pedido/${order.order_number}/exito`,
    }),
    tags: [
      { name: "type", value: "order_paid" },
      { name: "order", value: order.order_number },
    ],
  });
}

async function sendOrderRejectedEmail(
  order: OrderForEmail,
  reason: string | undefined,
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co";
  await sendEmail({
    to: order.customer_email,
    subject: `No pudimos procesar tu pago · pedido ${order.order_number}`,
    template: OrderRejected({
      customerName: order.customer_name,
      orderNumber: order.order_number,
      totalCop: order.total_cop,
      reason: reason,
      retryUrl: `${baseUrl}/checkout`,
    }),
    tags: [
      { name: "type", value: "order_rejected" },
      { name: "order", value: order.order_number },
    ],
  });
}

async function sendOrderRefundedEmail(order: OrderForEmail) {
  await sendEmail({
    to: order.customer_email,
    subject: `Reembolso procesado · pedido ${order.order_number}`,
    template: OrderRefunded({
      customerName: order.customer_name,
      orderNumber: order.order_number,
      totalCop: order.total_cop,
    }),
    tags: [
      { name: "type", value: "order_refunded" },
      { name: "order", value: order.order_number },
    ],
  });
}
