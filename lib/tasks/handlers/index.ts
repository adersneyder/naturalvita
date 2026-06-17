import "server-only";
import type { Json } from "@/lib/supabase/types";
import type { TaskRow, TaskType } from "../types";

import { handleSaviaEnrollFlow } from "./savia-enroll-flow";
import { handleSaviaSuppressList } from "./savia-suppress-list";
import { handleCouponCreate } from "./coupon-create";
import { handleManualNoop } from "./manual-noop";

/**
 * Resultado de ejecutar el handler de una tarea aprobada.
 *   ok=true → la acción se realizó. `result` se persiste en
 *             admin_tasks.execution_result.
 *   ok=false → la acción falló. `error` se persiste en
 *              admin_tasks.execution_error y status pasa a 'failed'.
 *
 * No lanzar excepciones desde un handler — capturar y devolver `ok:
 * false` con mensaje legible. El runner ya tiene try/catch defensivo
 * por si algo se nos escapa, pero el contrato es retornar el resultado.
 */
export type HandlerResult =
  | { ok: true; result: Json }
  | { ok: false; error: string };

export type TaskHandler = (task: TaskRow) => Promise<HandlerResult>;

/**
 * Registro de handlers por task_type. Si un task_type no tiene handler,
 * se trata como "manual" (la aprobación lo marca executed sin efectos
 * secundarios — sirve para señalización humana).
 */
const HANDLERS: Partial<Record<TaskType, TaskHandler>> = {
  "savia.enroll_flow": handleSaviaEnrollFlow,
  "savia.suppress_list": handleSaviaSuppressList,
  "coupon.create": handleCouponCreate,
  // product.review y pricing.review son "señalización pura": aprobar no
  // ejecuta nada automático — el equipo hace el siguiente paso a mano.
  manual: handleManualNoop,
  "product.review": handleManualNoop,
  "pricing.review": handleManualNoop,
};

export function getHandler(taskType: string): TaskHandler {
  return HANDLERS[taskType as TaskType] ?? handleManualNoop;
}
