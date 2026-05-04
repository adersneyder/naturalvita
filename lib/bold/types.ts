/**
 * Tipos del payload de webhook de Bold.
 *
 * Estructura simplificada; Bold envía más campos pero estos son los que
 * usamos. Documentación: https://developers.bold.co/webhook
 */

export type BoldWebhookEvent =
  | "SALE_APPROVED"
  | "SALE_REJECTED"
  | "VOID_APPROVED"
  | "VOID_REJECTED";

export type BoldWebhookPayload = {
  type: BoldWebhookEvent;
  /** ISO 8601 timestamp del evento */
  subscription: string;
  /** Datos del pago/transacción */
  data: {
    /** order_number que enviamos al crear el botón */
    metadata?: {
      reference?: string;
    };
    /** ID interno de Bold de la transacción */
    payment_id: string;
    /** Estado actual del pago según Bold */
    status?: string;
    /** Monto cobrado (en COP, sin decimales) */
    amount?: {
      total: number;
      currency: string;
    };
    /** Método de pago usado: CARD, PSE, NEQUI, etc. */
    payment_method?: string;
    /** Marca de la tarjeta si aplica */
    card_brand?: string;
    /** Últimos 4 dígitos si aplica */
    last_four?: string;
    /** Mensaje de error o información adicional */
    user_message?: string;
  };
};

/**
 * Mapeo de eventos de Bold a transiciones de estado en nuestra orden.
 *
 * IMPORTANTE: los valores deben respetar los CHECK constraints de la
 * tabla `orders` en Supabase:
 *   - `status` valido: pending, paid, processing, shipped, delivered, cancelled, refunded
 *   - `payment_status` valido: pending, paid, failed, refunded, partially_refunded
 *
 * Si agregas un evento nuevo de Bold, verifica primero que los valores
 * que escribes coincidan con esos enums o agrega los nuevos al CHECK.
 */
export const BOLD_EVENT_TO_STATUS: Record
  BoldWebhookEvent,
  { payment_status: string; status: string }
> = {
  SALE_APPROVED: { payment_status: "paid", status: "paid" },
  SALE_REJECTED: { payment_status: "failed", status: "cancelled" },
  VOID_APPROVED: { payment_status: "refunded", status: "refunded" },
  VOID_REJECTED: { payment_status: "failed", status: "cancelled" },
};
