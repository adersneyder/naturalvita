/**
 * Tipos del payload de webhook de Bold.
 *
 * Estructura simplificada; Bold envia mas campos pero estos son los que
 * usamos. Documentacion: https://developers.bold.co/webhook
 */

export type BoldWebhookEvent =
  | "SALE_APPROVED"
  | "SALE_REJECTED"
  | "VOID_APPROVED"
  | "VOID_REJECTED";

export type BoldWebhookPayload = {
  type: BoldWebhookEvent;
  subscription: string;
  data: {
    metadata?: {
      reference?: string;
    };
    payment_id: string;
    status?: string;
    amount?: {
      total: number;
      currency: string;
    };
    payment_method?: string;
    card_brand?: string;
    last_four?: string;
    user_message?: string;
  };
};

/**
 * Mapeo de eventos de Bold a transiciones de estado en nuestra orden.
 *
 * IMPORTANTE: los valores deben respetar los CHECK constraints de la
 * tabla orders en Supabase:
 *   - status valido: pending, paid, processing, shipped, delivered, cancelled, refunded
 *   - payment_status valido: pending, paid, failed, refunded, partially_refunded
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
