/**
 * Tracking de eventos del e-commerce.
 *
 * Hoy: stub que loguea a console (suficiente para QA).
 * Mañana (Hito 2): se reemplaza el cuerpo de cada función por una
 * llamada al API HTTP de Klaviyo. El resto del código del proyecto
 * NO cambia — los call sites siguen llamando `trackOrderPaid(...)`
 * sin enterarse del cambio.
 *
 * Diseño:
 *   - Una función por evento de negocio (semántica clara).
 *   - Payloads tipados, con la información mínima útil.
 *   - Nunca tira excepción al consumidor: tracking fallido NO debe
 *     romper el flujo principal (pago, envío, etc.).
 *   - Sin dependencias de framework (importable desde server actions,
 *     route handlers, edge functions, scripts CLI).
 *
 * Convención de nombres de evento Klaviyo (cuando se active):
 *   - "Placed Order"     → trackOrderPlaced
 *   - "Ordered Product"  → trackOrderPaid (uno por línea)
 *   - "Fulfilled Order"  → trackOrderShipped
 *   - "Refunded Order"   → trackOrderRefunded
 *   Todos en inglés siguiendo la convención estándar del ecommerce
 *   trackingsystems para que después funcione con cualquier reporte
 *   pre-armado de Klaviyo o herramientas tipo segment.
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

async function logEvent(name: string, payload: unknown): Promise<void> {
  // Tracking nunca debe romper el flujo principal.
  // Cuando entre Klaviyo, el try/catch sigue protegiendo igual.
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[track] ${name}`, JSON.stringify(payload));
      return;
    }
    // Log mínimo en producción para auditoría sin spam.
    console.log(`[track] ${name} order=${(payload as { order_number?: string }).order_number ?? "?"}`);
  } catch {
    // ignored
  }
}

export async function trackOrderPlaced(payload: OrderEventBase): Promise<void> {
  await logEvent("Placed Order", payload);
}

export async function trackOrderPaid(payload: OrderEventBase): Promise<void> {
  await logEvent("Ordered Product", payload);
}

export async function trackOrderShipped(payload: OrderShippedEvent): Promise<void> {
  await logEvent("Fulfilled Order", payload);
}

export async function trackOrderRefunded(payload: OrderEventBase): Promise<void> {
  await logEvent("Refunded Order", payload);
}
