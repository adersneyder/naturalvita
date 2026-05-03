"use server";

import {
  createPendingOrder,
  type CreateOrderInput,
  type CreateOrderResult,
} from "@/lib/checkout/orders";
import { sendEmail } from "@/lib/email/client";
import { OrderReceived } from "@/lib/email/templates/order-received";
import { createClient } from "@/lib/supabase/server";

/**
 * Server action invocada al hacer click "Confirmar y pagar" en /checkout.
 *
 * Crea la orden en BD con anti-tampering, dispara email de "pedido recibido",
 * y devuelve los datos necesarios para inicializar el botón de Bold en el
 * cliente (api_key, integrity_signature, order_number, total).
 */
export async function startCheckout(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const result = await createPendingOrder(input);

  if (!result.ok) return result;

  // Email de "pedido recibido" (no bloqueante: si falla, el flujo de pago
  // continúa porque el cliente ya está viendo la pasarela de Bold)
  void sendOrderReceivedEmail(result.order.order_number);

  return result;
}

async function sendOrderReceivedEmail(orderNumber: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select("customer_email, customer_name, total_cop")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (!data) return;

    await sendEmail({
      to: data.customer_email,
      subject: `Recibimos tu pedido ${orderNumber}`,
      template: OrderReceived({
        customerName: data.customer_name,
        orderNumber,
        totalCop: data.total_cop,
      }),
      tags: [
        { name: "type", value: "order_received" },
        { name: "order", value: orderNumber },
      ],
    });
  } catch (err) {
    console.error("[startCheckout] error en email order-received:", err);
  }
}
