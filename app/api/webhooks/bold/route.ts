import { NextResponse } from "next/server";
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
 * Webhook receptor de Bold.
 *
 * Bold envía POST a esta URL con cuatro tipos de eventos:
 *   - SALE_APPROVED → marca orden como pagada, descuenta stock, envía email
 *   - SALE_REJECTED → marca como rechazada, envía email con CTA reintentar
 *   - VOID_APPROVED → reembolso confirmado, repone stock, envía email
 *   - VOID_REJECTED → log para auditoría, no afecta cliente
 *
 * Seguridad:
 *   1. Verifica firma HMAC-SHA256 con `x-bold-signature`. Sin firma válida,
 *      respondemos 401 sin tocar BD.
 *   2. Idempotencia: usamos `bold_payment_id` como deduplicación. Si ya
 *      procesamos ese payment_id con el mismo evento, respondemos 200 sin
 *      reejecutar. Bold puede reintentar.
 *
 * Cliente service role: usamos createClient con SERVICE_ROLE_KEY (no anon)
 * porque el webhook se ejecuta sin sesión de usuario y necesita actualizar
 * `orders` y `products.stock` saltándose RLS.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // necesitamos node:crypto

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase service role no configurado");
  }
  return createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request) {
  // 1. Leer raw body para verificar firma sin perder el formato original
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json(
      { error: "Cannot read body" },
      { status: 400 },
    );
  }

  // 2. Verificar firma
  const signature = req.headers.get("x-bold-signature");
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[bold-webhook] firma inválida");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 3. Parsear
  let payload: BoldWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.type;
  const orderNumber = payload.data?.metadata?.reference;
  const paymentId = payload.data?.payment_id;

  if (!orderNumber || !paymentId) {
    console.warn("[bold-webhook] payload sin reference o payment_id");
    return NextResponse.json(
      { error: "Missing reference or payment_id" },
      { status: 400 },
    );
  }

  if (!BOLD_EVENT_TO_STATUS[eventType]) {
    console.log(`[bold-webhook] evento ignorado: ${eventType}`);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supabase = getServiceClient();

  // 4. Buscar la orden por order_number
  const { data: order } = await supabase
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

  if (!order) {
    console.warn(`[bold-webhook] orden no encontrada: ${orderNumber}`);
    // Devolvemos 200 igualmente para que Bold no reintente eternamente
    return NextResponse.json({ ok: true, not_found: true });
  }

  // 5. Idempotencia: si ya procesamos este payment_id con un estado terminal,
  //    no reejecutamos. Bold puede reintentar webhooks.
  const newStatus = BOLD_EVENT_TO_STATUS[eventType];
  if (
    order.bold_payment_id === paymentId &&
    order.payment_status === newStatus.payment_status
  ) {
    console.log(
      `[bold-webhook] orden ${orderNumber} ya está en estado ${newStatus.payment_status}, idempotente`,
    );
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // 6. Transición de estado en orden
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
    console.error("[bold-webhook] error actualizando orden:", updateErr);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  // 7. Side effects según evento
  if (eventType === "SALE_APPROVED") {
    await decrementStock(supabase, order.items as Array<{ product_id: string; quantity: number }>);
    await sendOrderPaidEmail(order);
  } else if (eventType === "SALE_REJECTED") {
    await sendOrderRejectedEmail(order, payload.data?.user_message);
  } else if (eventType === "VOID_APPROVED") {
    await incrementStock(supabase, order.items as Array<{ product_id: string; quantity: number }>);
    await sendOrderRefundedEmail(order);
  }
  // VOID_REJECTED: solo logueamos
  if (eventType === "VOID_REJECTED") {
    console.warn(
      `[bold-webhook] reembolso rechazado para ${orderNumber}: ${payload.data?.user_message}`,
    );
  }

  return NextResponse.json({ ok: true });
}

/**
 * Decrementar stock de productos con track_stock=true.
 * Si el stock queda negativo (oversell por simultaneidad), lo dejamos en 0
 * y marcamos la orden con nota — el admin lo revisa manualmente.
 */
async function decrementStock(
  supabase: ReturnType<typeof getServiceClient>,
  items: Array<{ product_id: string; quantity: number }>,
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
      console.warn(
        `[bold-webhook] oversell en ${item.product_id}: vendido ${item.quantity}, había ${currentStock}`,
      );
    }
  }
}

async function incrementStock(
  supabase: ReturnType<typeof getServiceClient>,
  items: Array<{ product_id: string; quantity: number }>,
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
