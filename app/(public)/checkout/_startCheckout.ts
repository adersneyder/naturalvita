"use server";

import {
  createPendingOrder,
  type CreateOrderInput,
  type CreateOrderResult,
} from "@/lib/checkout/orders";
import { sendEmail } from "@/lib/email/client";
import { OrderReceived } from "@/lib/email/templates/order-received";
import { createClient } from "@/lib/supabase/server";
import { trackOrderPlaced } from "@/lib/events/track";

/**
 * Server action invocada al hacer click "Confirmar y pagar" en /checkout.
 *
 * Crea la orden en BD con anti-tampering, dispara email de "pedido recibido"
 * + evento Klaviyo "Placed Order", y devuelve los datos para Bold.
 */
export async function startCheckout(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const result = await createPendingOrder(input);

  if (!result.ok) return result;

  // Side effects no bloqueantes (el cliente ya ve la pasarela Bold)
  void sendOrderReceivedEmail(result.order.order_number);
  void trackOrderPlacedFromOrder(result.order.order_number);

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

async function trackOrderPlacedFromOrder(orderNumber: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select(
        `customer_email, customer_name, total_cop,
         shipping_city, shipping_department,
         items:order_items!order_id(product_id, product_name, quantity, unit_price_cop)`,
      )
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (!data) return;

    await trackOrderPlaced({
      order_number: orderNumber,
      customer_email: data.customer_email,
      customer_name: data.customer_name,
      total_cop: data.total_cop,
      shipping: {
        city: data.shipping_city,
        department: data.shipping_department,
      },
      items: (data.items as Array<{
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
  } catch (err) {
    console.error("[startCheckout] error en trackOrderPlaced:", err);
  }
}
