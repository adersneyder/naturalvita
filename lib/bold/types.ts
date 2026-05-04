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

type StatusTransition = { payment_status: string; status: string };

export const BOLD_EVENT_TO_STATUS: Record<BoldWebhookEvent, StatusTransition> = {
  SALE_APPROVED: { payment_status: "paid", status: "paid" },
  SALE_REJECTED: { payment_status: "failed", status: "cancelled" },
  VOID_APPROVED: { payment_status: "refunded", status: "refunded" },
  VOID_REJECTED: { payment_status: "failed", status: "cancelled" },
};
