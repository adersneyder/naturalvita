/**
 * Tracking de eventos del e-commerce vía Klaviyo.
 *
 * API pública igual que el stub anterior — los call sites NO cambian.
 * Solo cambia la implementación interna: en lugar de console.log,
 * ahora dispara eventos reales a Klaviyo.
 *
 * Diseño defensivo heredado del stub:
 *   - Nunca lanza excepción al consumidor.
 *   - Si Klaviyo falla, loguea y sigue. El flujo de negocio no se rompe.
 *   - En dev sin KLAVIYO_PRIVATE_API_KEY, solo hace console.log.
 *
 * Convención de nombres de evento (Klaviyo Commerce):
 *   - "Placed Order"     → pedido creado (al confirmar checkout)
 *   - "Ordered Product"  → por cada línea del pedido (al confirmar pago)
 *   - "Fulfilled Order"  → pedido enviado (al marcar shipped en admin)
 *   - "Refunded Order"   → reembolso completado
 */

import { trackEvent, identifyProfile, subscribeToList } from "@/lib/klaviyo/client";

export type TrackedAddress = {
  city: string;
  department: string;
};

export type TrackedItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_cop: number;
};

export type OrderEventBase = {
  order_number: string;
  customer_email: string;
  customer_name: string;
  total_cop: number;
  shipping: TrackedAddress;
  items: TrackedItem[];
};

export type OrderShippedEvent = OrderEventBase & {
  tracking_number: string | null;
  carrier?: string | null;
};

function copToUsdApprox(cop: number): number {
  return Math.round((cop / 4100) * 100) / 100;
}

function buildItems(items: TrackedItem[]) {
  return items.map((item) => ({
    ProductID: item.product_id,
    ProductName: item.product_name,
    Quantity: item.quantity,
    ItemPrice: item.unit_price_cop / 100,
    RowTotal: (item.unit_price_cop * item.quantity) / 100,
    Currency: "COP",
  }));
}

export async function trackOrderPlaced(payload: OrderEventBase): Promise<void> {
  try {
    const nameParts = payload.customer_name.trim().split(" ");
    await identifyProfile({
      email: payload.customer_email,
      firstName: nameParts[0] ?? null,
      lastName: nameParts.slice(1).join(" ") || null,
    });
    await trackEvent({
      email: payload.customer_email,
      eventName: "Placed Order",
      uniqueId: `placed-${payload.order_number}`,
      valueCop: payload.total_cop,
      properties: {
        OrderId: payload.order_number,
        $value: copToUsdApprox(payload.total_cop),
        ItemNames: payload.items.map((i) => i.product_name),
        Items: buildItems(payload.items),
        ShippingCity: payload.shipping.city,
        ShippingDepartment: payload.shipping.department,
        Currency: "COP",
      },
    });
  } catch (err) {
    console.error("[track] trackOrderPlaced falló:", err);
  }
}

export async function trackOrderPaid(payload: OrderEventBase): Promise<void> {
  try {
    await Promise.all(
      payload.items.map((item) =>
        trackEvent({
          email: payload.customer_email,
          eventName: "Ordered Product",
          uniqueId: `ordered-${payload.order_number}-${item.product_id}`,
          valueCop: item.unit_price_cop * item.quantity,
          properties: {
            OrderId: payload.order_number,
            $value: copToUsdApprox(item.unit_price_cop * item.quantity),
            ProductID: item.product_id,
            ProductName: item.product_name,
            Quantity: item.quantity,
            ItemPrice: item.unit_price_cop / 100,
            RowTotal: (item.unit_price_cop * item.quantity) / 100,
            Currency: "COP",
          },
        }),
      ),
    );
  } catch (err) {
    console.error("[track] trackOrderPaid falló:", err);
  }
}

export async function trackOrderShipped(payload: OrderShippedEvent): Promise<void> {
  try {
    await trackEvent({
      email: payload.customer_email,
      eventName: "Fulfilled Order",
      uniqueId: `shipped-${payload.order_number}`,
      valueCop: payload.total_cop,
      properties: {
        OrderId: payload.order_number,
        $value: copToUsdApprox(payload.total_cop),
        TrackingNumber: payload.tracking_number ?? undefined,
        Carrier: payload.carrier ?? undefined,
        Items: buildItems(payload.items),
        Currency: "COP",
      },
    });
  } catch (err) {
    console.error("[track] trackOrderShipped falló:", err);
  }
}

export async function trackOrderRefunded(payload: OrderEventBase): Promise<void> {
  try {
    await trackEvent({
      email: payload.customer_email,
      eventName: "Refunded Order",
      uniqueId: `refunded-${payload.order_number}`,
      valueCop: payload.total_cop,
      properties: {
        OrderId: payload.order_number,
        $value: copToUsdApprox(payload.total_cop),
        Items: buildItems(payload.items),
        Currency: "COP",
      },
    });
  } catch (err) {
    console.error("[track] trackOrderRefunded falló:", err);
  }
}

export async function trackNewsletterSubscribed(params: {
  email: string;
  source: string;
  couponCode?: string;
}): Promise<void> {
  try {
    const listId = process.env.KLAVIYO_NEWSLETTER_LIST_ID;
    if (!listId) {
      console.warn("[track] KLAVIYO_NEWSLETTER_LIST_ID no configurado");
      return;
    }
    await subscribeToList(params.email, listId, params.source);
    await trackEvent({
      email: params.email,
      eventName: "Newsletter Subscribed",
      uniqueId: `newsletter-sub-${params.email}-${Date.now()}`,
      properties: {
        Source: params.source,
        CouponCode: params.couponCode ?? "WELCOME10",
      },
    });
  } catch (err) {
    console.error("[track] trackNewsletterSubscribed falló:", err);
  }
}
