/**
 * Tracking de eventos de e-commerce de NaturalVita.
 *
 * ESTADO (jun-2026): Klaviyo fue DESCARTADO (branding + costo). Este módulo
 * dejó de enviar eventos a un proveedor externo. Hoy registra cada evento como
 * log estructurado en Vercel (prefijo `[track]`), sin dependencias externas
 * ni cables vivos hacia servicios de terceros.
 *
 * La API pública (firmas y tipos) se mantiene INTACTA a propósito: los call
 * sites en checkout, webhook de Bold, admin de pedidos y newsletter siguen
 * llamando exactamente igual. Cuando SAVIA (motor propio de marketing) esté
 * listo, se reemplaza SOLO el cuerpo de `recordEvent()` para persistir/encolar
 * el evento (p. ej. insertar en una tabla de eventos de commerce y disparar
 * flows como carrito abandonado o recompra). Ningún call site cambiará.
 *
 * Diseño defensivo (no negociable):
 *   - Nunca lanza excepción al consumidor. Un fallo de tracking jamás debe
 *     tumbar un pago, un envío de pedido ni una suscripción.
 *   - Si algo falla, loguea y sigue.
 *
 * Eventos de commerce que modela:
 *   - order_placed   → pedido creado (al confirmar checkout)
 *   - order_paid     → pago confirmado (webhook Bold)
 *   - order_shipped  → pedido enviado (admin)
 *   - order_refunded → reembolso completado (webhook Bold)
 *   - newsletter_subscribed → alta de newsletter
 */

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

/**
 * Punto único de registro de eventos. Hoy: log estructurado. Mañana (Savia):
 * persistir/encolar aquí. Mantener este helper como la ÚNICA salida hace que
 * conectar Savia sea un cambio local de una sola función.
 *
 * Defensivo: nunca propaga excepciones.
 */
async function recordEvent(
  name: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    console.info(`[track] ${name}`, payload);
    // SAVIA (pendiente): aquí persistir el evento de commerce y, si aplica,
    // disparar el flow correspondiente (carrito abandonado, recompra, etc.).
  } catch (err) {
    console.error(`[track] error registrando ${name}:`, err);
  }
}

export async function trackOrderPlaced(payload: OrderEventBase): Promise<void> {
  await recordEvent("order_placed", {
    order_number: payload.order_number,
    customer_email: payload.customer_email,
    total_cop: payload.total_cop,
    item_count: payload.items.length,
    shipping_city: payload.shipping.city,
    shipping_department: payload.shipping.department,
  });
}

export async function trackOrderPaid(payload: OrderEventBase): Promise<void> {
  await recordEvent("order_paid", {
    order_number: payload.order_number,
    customer_email: payload.customer_email,
    total_cop: payload.total_cop,
    items: payload.items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
    })),
  });
}

export async function trackOrderShipped(
  payload: OrderShippedEvent,
): Promise<void> {
  await recordEvent("order_shipped", {
    order_number: payload.order_number,
    customer_email: payload.customer_email,
    total_cop: payload.total_cop,
    tracking_number: payload.tracking_number,
    carrier: payload.carrier ?? null,
  });
}

export async function trackOrderRefunded(
  payload: OrderEventBase,
): Promise<void> {
  await recordEvent("order_refunded", {
    order_number: payload.order_number,
    customer_email: payload.customer_email,
    total_cop: payload.total_cop,
  });
}

export async function trackNewsletterSubscribed(params: {
  email: string;
  source: string;
  couponCode?: string;
}): Promise<void> {
  await recordEvent("newsletter_subscribed", {
    email: params.email,
    source: params.source,
    coupon_code: params.couponCode ?? "WELCOME10",
  });
}
