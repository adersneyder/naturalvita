import { createClient } from "@/lib/supabase/server";

export type CustomerOrderRow = {
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  total_cop: number;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  items_count: number;
};

export type CustomerOrderDetail = CustomerOrderRow & {
  id: string;
  customer_email: string;
  subtotal_cop: number;
  shipping_cop: number;
  tax_cop: number;
  discount_cop: number;
  shipping_recipient: string;
  shipping_phone: string;
  shipping_street: string;
  shipping_details: string | null;
  shipping_city: string;
  shipping_department: string;
  shipping_postal_code: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  notes: string | null;
  bold_payment_id: string | null;
  items: Array<{
    product_id: string;
    product_name: string;
    product_sku: string | null;
    product_image_url: string | null;
    quantity: number;
    unit_price_cop: number;
    subtotal_cop: number;
  }>;
};

/**
 * Lista todos los pedidos del cliente actual ordenados del más reciente.
 * RLS de orders permite SELECT donde customer_id = auth.uid().
 */
export async function listCustomerOrders(
  customerId: string,
): Promise<CustomerOrderRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `order_number, status, payment_status, fulfillment_status, total_cop,
       created_at, paid_at, shipped_at, delivered_at,
       items:order_items!order_id(quantity)`,
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listCustomerOrders]", error);
    return [];
  }

  type Row = Omit<CustomerOrderRow, "items_count"> & {
    items: Array<{ quantity: number }>;
  };

  return (data as Row[]).map((row) => ({
    order_number: row.order_number,
    status: row.status,
    payment_status: row.payment_status,
    fulfillment_status: row.fulfillment_status,
    total_cop: row.total_cop,
    created_at: row.created_at,
    paid_at: row.paid_at,
    shipped_at: row.shipped_at,
    delivered_at: row.delivered_at,
    items_count: row.items.reduce((acc, i) => acc + i.quantity, 0),
  }));
}

/**
 * Detalle completo de un pedido del cliente (validando que sea suyo).
 * Devuelve null si no existe o no pertenece al cliente.
 */
export async function getCustomerOrderDetail(
  customerId: string,
  orderNumber: string,
): Promise<CustomerOrderDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, payment_status, fulfillment_status,
       total_cop, subtotal_cop, shipping_cop, tax_cop, discount_cop,
       customer_email,
       created_at, paid_at, shipped_at, delivered_at,
       shipping_recipient, shipping_phone, shipping_street, shipping_details,
       shipping_city, shipping_department, shipping_postal_code, shipping_carrier,
       tracking_number, notes, bold_payment_id,
       items:order_items!order_id(
         product_id, product_name, product_sku, product_image_url,
         quantity, unit_price_cop, subtotal_cop
       )`,
    )
    .eq("customer_id", customerId)
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getCustomerOrderDetail]", error);
    return null;
  }

  const detail = data as CustomerOrderDetail & { items: CustomerOrderDetail["items"] };
  return {
    ...detail,
    items_count: detail.items.reduce((acc, i) => acc + i.quantity, 0),
  };
}

/**
 * Etapas del timeline visible al cliente: pendiente → pagado → enviado → entregado.
 * Devuelve la lista de etapas con su estado (done/current/pending) según
 * los timestamps de la orden.
 */
export type TimelineStage = {
  key: "placed" | "paid" | "shipped" | "delivered";
  label: string;
  description: string;
  state: "done" | "current" | "pending" | "skipped";
  date: string | null;
};

export function buildOrderTimeline(order: {
  status: string;
  payment_status: string;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}): TimelineStage[] {
  const isCancelled = order.status === "cancelled";
  const isRefunded = order.status === "refunded";
  const isPaid = !!order.paid_at;
  const isShipped = !!order.shipped_at;
  const isDelivered = !!order.delivered_at;

  function stageState(
    happened: boolean,
    nextHappened: boolean,
  ): TimelineStage["state"] {
    if (isCancelled || isRefunded) {
      return happened ? "done" : "skipped";
    }
    if (happened && nextHappened) return "done";
    if (happened && !nextHappened) return "current";
    return "pending";
  }

  return [
    {
      key: "placed",
      label: "Pedido recibido",
      description: "Generamos tu número de pedido",
      state: stageState(true, isPaid),
      date: order.created_at,
    },
    {
      key: "paid",
      label: "Pago confirmado",
      description: "Bold confirmó el cobro",
      state: stageState(isPaid, isShipped),
      date: order.paid_at,
    },
    {
      key: "shipped",
      label: "Pedido despachado",
      description: "Salió rumbo a tu dirección",
      state: stageState(isShipped, isDelivered),
      date: order.shipped_at,
    },
    {
      key: "delivered",
      label: "Pedido entregado",
      description: "Disfruta tu compra",
      state: isDelivered ? "done" : isCancelled || isRefunded ? "skipped" : "pending",
      date: order.delivered_at,
    },
  ];
}
