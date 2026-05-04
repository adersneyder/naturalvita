"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";
import { sendEmail } from "@/lib/email/client";
import { OrderShipped } from "@/lib/email/templates/order-shipped";
import { trackOrderShipped, trackOrderRefunded } from "@/lib/events/track";

export type AdminActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/**
 * Marcar pedido como "processing" (en preparación). Sin side effect de email.
 * Solo cambia status, no fulfillment_status.
 */
export async function markOrderProcessing(
  orderId: string,
): Promise<AdminActionResult> {
  await requireRole(["owner", "admin"]);

  if (!z.string().uuid().safeParse(orderId).success) {
    return { ok: false, error: "ID inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error("[markOrderProcessing]", error);
    return { ok: false, error: "No pudimos actualizar el pedido" };
  }

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { ok: true };
}

/**
 * Marcar pedido como "shipped" + capturar tracking + carrier opcional.
 * Side effect: email "Pedido enviado" al cliente + evento Klaviyo (stub).
 */
const ShipSchema = z.object({
  orderId: z.string().uuid(),
  trackingNumber: z.string().trim().max(100).optional().or(z.literal("")),
  carrier: z.string().trim().max(60).optional().or(z.literal("")),
});

export async function markOrderShipped(
  input: z.infer<typeof ShipSchema>,
): Promise<AdminActionResult> {
  await requireRole(["owner", "admin"]);

  const parsed = ShipSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  const { orderId, trackingNumber, carrier } = parsed.data;
  const supabase = await createClient();

  // Cargar la orden completa para envío de email
  const { data: order, error: readErr } = await supabase
    .from("orders")
    .select(
      `id, order_number, customer_email, customer_name, total_cop,
       shipping_recipient, shipping_street, shipping_details,
       shipping_city, shipping_department,
       items:order_items!order_id(product_id, product_name, quantity, unit_price_cop)`,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (readErr || !order) {
    console.error("[markOrderShipped readErr]", readErr);
    return { ok: false, error: "Pedido no encontrado" };
  }

  const trackingClean = trackingNumber?.trim() || null;
  const carrierClean = carrier?.trim() || null;
  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status: "shipped",
      fulfillment_status: "fulfilled",
      tracking_number: trackingClean,
      shipped_at: now,
      updated_at: now,
    })
    .eq("id", orderId);

  if (updateErr) {
    console.error("[markOrderShipped update]", updateErr);
    return { ok: false, error: "No pudimos actualizar el pedido" };
  }

  // Side effects: email + tracking. Si fallan, NO revertimos el cambio de
  // estado — el pedido SÍ está enviado, solo perdimos la notificación.
  // Log explícito para que admin pueda reenviar manualmente si hace falta.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co";
  const emailRes = await sendEmail({
    to: order.customer_email,
    subject: `Tu pedido ${order.order_number} va en camino`,
    template: OrderShipped({
      customerName: order.customer_name,
      orderNumber: order.order_number,
      trackingNumber: trackingClean,
      carrier: carrierClean,
      shippingAddress: {
        recipient: order.shipping_recipient,
        street: order.shipping_street,
        details: order.shipping_details,
        city: order.shipping_city,
        department: order.shipping_department,
      },
      trackingUrl: `${baseUrl}/mi-cuenta/pedido/${order.order_number}`,
    }),
    tags: [
      { name: "type", value: "order_shipped" },
      { name: "order", value: order.order_number },
    ],
  });

  if (!emailRes.ok) {
    console.warn(
      `[markOrderShipped] email fallo para ${order.order_number}:`,
      emailRes.error,
    );
  }

  await trackOrderShipped({
    order_number: order.order_number,
    customer_email: order.customer_email,
    customer_name: order.customer_name,
    total_cop: order.total_cop,
    tracking_number: trackingClean,
    carrier: carrierClean,
    shipping: {
      city: order.shipping_city,
      department: order.shipping_department,
    },
    items: (order.items as Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price_cop: number;
    }>).map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price_cop: i.unit_price_cop,
    })),
  });

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  return {
    ok: true,
    message: emailRes.ok
      ? "Pedido marcado como enviado y notificación enviada al cliente"
      : "Pedido marcado como enviado, pero falló el email — revisa los logs",
  };
}

/**
 * Marcar pedido como "delivered" (entregado). Sin email automático
 * (el cliente ya recibió el paquete; un email "ya recibiste lo que ya
 * tienes" es redundante).
 */
export async function markOrderDelivered(
  orderId: string,
): Promise<AdminActionResult> {
  await requireRole(["owner", "admin"]);

  if (!z.string().uuid().safeParse(orderId).success) {
    return { ok: false, error: "ID inválido" };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("orders")
    .update({
      status: "delivered",
      delivered_at: now,
      updated_at: now,
    })
    .eq("id", orderId);

  if (error) {
    console.error("[markOrderDelivered]", error);
    return { ok: false, error: "No pudimos actualizar el pedido" };
  }

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { ok: true };
}

/**
 * Cancelar pedido. Acepta razón opcional que se acumula en `notes`.
 * Si el pedido ya está `paid`, este action NO ejecuta el reembolso por
 * pasarela — el admin debe hacerlo desde el panel de Bold y luego marcar
 * con `markOrderRefunded`. Esto refleja la realidad operativa con Bold.
 */
const CancelSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function cancelOrder(
  input: z.infer<typeof CancelSchema>,
): Promise<AdminActionResult> {
  await requireRole(["owner", "admin"]);

  const parsed = CancelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  const { orderId, reason } = parsed.data;
  const supabase = await createClient();

  // Concatenar nota de cancelación al campo notes
  const { data: existing } = await supabase
    .from("orders")
    .select("notes, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  const noteAddition = `[CANCELADO ${new Date().toISOString().split("T")[0]}]${
    reason ? ` ${reason}` : ""
  }`;
  const newNotes = existing?.notes
    ? `${existing.notes}\n${noteAddition}`
    : noteAddition;

  // Cuando hay pago confirmado, payment_status queda en "paid" hasta que
  // se procese el reembolso real. status sí pasa a "cancelled".
  const { error } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error("[cancelOrder]", error);
    return { ok: false, error: "No pudimos cancelar el pedido" };
  }

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);

  const wasPaid = existing?.payment_status === "paid";
  return {
    ok: true,
    message: wasPaid
      ? "Pedido cancelado. Recuerda procesar el reembolso desde el panel de Bold y después marcar como reembolsado."
      : "Pedido cancelado",
  };
}

/**
 * Marcar pedido como reembolsado (después de procesar reembolso real en Bold).
 * Side effect: email + tracking. El stock NO se repone aquí porque cuando
 * llegue el webhook real `VOID_APPROVED` de Bold, el código del webhook
 * lo hará idempotentemente. Esta acción es un "marcador manual" para casos
 * en que Bold no envía webhooks (situación actual real).
 */
const RefundSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function markOrderRefunded(
  input: z.infer<typeof RefundSchema>,
): Promise<AdminActionResult> {
  await requireRole(["owner", "admin"]);

  const parsed = RefundSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  const { orderId, reason } = parsed.data;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      `id, order_number, customer_email, customer_name, total_cop, notes,
       shipping_city, shipping_department,
       items:order_items!order_id(product_id, product_name, quantity, unit_price_cop)`,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return { ok: false, error: "Pedido no encontrado" };
  }

  const noteAddition = `[REEMBOLSADO ${new Date().toISOString().split("T")[0]}]${
    reason ? ` ${reason}` : ""
  }`;
  const newNotes = order.notes
    ? `${order.notes}\n${noteAddition}`
    : noteAddition;

  const { error } = await supabase
    .from("orders")
    .update({
      status: "refunded",
      payment_status: "refunded",
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error("[markOrderRefunded]", error);
    return { ok: false, error: "No pudimos marcar el reembolso" };
  }

  // Tracking event (no email custom — el del webhook ya cubre cuando llegue,
  // y enviar dos emails confunde al cliente).
  await trackOrderRefunded({
    order_number: order.order_number,
    customer_email: order.customer_email,
    customer_name: order.customer_name,
    total_cop: order.total_cop,
    shipping: {
      city: order.shipping_city,
      department: order.shipping_department,
    },
    items: (order.items as Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price_cop: number;
    }>).map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price_cop: i.unit_price_cop,
    })),
  });

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  return {
    ok: true,
    message:
      "Pedido marcado como reembolsado. Si querías notificar al cliente, considera enviarle un correo manual.",
  };
}

/**
 * Actualizar notas internas del pedido. Solo admins.
 * Estas notas son visibles solo en el panel admin, NO al cliente.
 */
const NotesSchema = z.object({
  orderId: z.string().uuid(),
  notes: z.string().max(2000),
});

export async function updateOrderNotes(
  input: z.infer<typeof NotesSchema>,
): Promise<AdminActionResult> {
  await requireRole(["owner", "admin"]);

  const parsed = NotesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.orderId);

  if (error) {
    console.error("[updateOrderNotes]", error);
    return { ok: false, error: "No pudimos guardar las notas" };
  }

  revalidatePath(`/admin/pedidos/${parsed.data.orderId}`);
  return { ok: true };
}
