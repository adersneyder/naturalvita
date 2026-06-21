import type { Json } from "@/lib/supabase/types";

/**
 * Contrato compartido de la bandeja de tareas semi-automatizadas
 * (Capa 5 del BI). Sembrado y otros agentes generan tareas; el equipo
 * las aprueba o rechaza; el handler correspondiente ejecuta al aprobar.
 *
 * Si añades un task_type nuevo:
 *   1. Añadirlo a TASK_TYPES (debajo) — habilita filtros UI.
 *   2. Crear handler en lib/tasks/handlers/<type>.ts.
 *   3. Registrarlo en lib/tasks/handlers/index.ts.
 *   4. Documentar el shape de proposed_action aquí abajo.
 *
 * Shapes de proposed_action por tipo (contrato con los handlers):
 *
 *   savia.enroll_flow   { flow_id: string, customer_emails: string[] }
 *   savia.suppress_list { emails: string[], reason?: string }
 *   coupon.create       { code: string, discount_type: 'percentage'|'fixed',
 *                         discount_value: number, max_uses_per_customer?: number,
 *                         expires_at?: string, description: string }
 *   product.review      {} (no ejecuta nada — solo señal de "revisa esto")
 *   pricing.review      { product_ids: string[], note?: string }
 *   manual              {} (nota textual del equipo)
 */

export const TASK_TYPES = [
  "savia.enroll_flow",
  "savia.suppress_list",
  "coupon.create",
  "product.review",
  "pricing.review",
  "manual",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export type TaskStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "failed"
  | "expired";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

/**
 * Fuentes registradas (qué módulo crea la tarea). Los códigos son
 * estables — al ver la bandeja el admin puede filtrar por origen y
 * tener confianza de qué automatización lo generó.
 */
export const TASK_SOURCES = [
  "manual",
  "sembrado.churn",
  "sembrado.cart_abandonment",
  "sembrado.wishlist_gap",
  "sembrado.anomaly",
] as const;
export type TaskSource = (typeof TASK_SOURCES)[number];

export type TaskRow = {
  id: string;
  task_type: TaskType;
  source: TaskSource;
  priority: TaskPriority;
  title: string;
  description: string | null;
  proposed_action: Json;
  entity_type: string | null;
  entity_id: string | null;
  status: TaskStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  executed_at: string | null;
  execution_result: Json | null;
  execution_error: string | null;
  expires_at: string | null;
  created_at: string;
};

/** Etiquetas visibles para humanos. */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  "savia.enroll_flow": "Enrolar en flow Savia",
  "savia.suppress_list": "Añadir a suppression list",
  "coupon.create": "Crear cupón sugerido",
  "product.review": "Revisar producto",
  "pricing.review": "Revisar precio",
  manual: "Tarea manual",
};

export const TASK_SOURCE_LABELS: Record<TaskSource, string> = {
  manual: "Manual",
  "sembrado.churn": "Sembrado · churn",
  "sembrado.cart_abandonment": "Sembrado · carrito abandonado",
  "sembrado.wishlist_gap": "Sembrado · wishlist sin compra",
  "sembrado.anomaly": "Sembrado · anomalía",
};

export const TASK_PRIORITY_STYLES: Record<
  TaskPriority,
  { label: string; tone: string }
> = {
  urgent: { label: "Urgente", tone: "bg-[#FCE9E5] text-[#B23A1F]" },
  high: { label: "Alta", tone: "bg-[#FAEEDA] text-[#854F0B]" },
  normal: { label: "Normal", tone: "bg-[#E8F0FE] text-[#1A56DB]" },
  low: {
    label: "Baja",
    tone: "bg-[var(--color-earth-100)] text-[var(--color-earth-700)]",
  },
};
