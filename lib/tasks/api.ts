import "server-only";
import type { Json } from "@/lib/supabase/types";
import { logAdminAction } from "@/lib/audit-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHandler } from "./handlers";
import type {
  TaskPriority,
  TaskRow,
  TaskSource,
  TaskType,
} from "./types";

/**
 * API server-side de la bandeja de tareas. Reusada por server actions
 * (UI) y por generadores automáticos (Sembrado).
 *
 * Idempotencia de creación: si pasas entity_type + entity_id + source,
 * la BD impide tener 2 tareas pendientes para la misma entidad+fuente
 * (índice único parcial). Si ya hay una pendiente devolvemos { ok: true,
 * deduplicated: true } sin tocar la BD.
 */

export type CreateTaskInput = {
  task_type: TaskType;
  source: TaskSource;
  title: string;
  description?: string;
  priority?: TaskPriority;
  proposed_action?: Record<string, unknown>;
  entity_type?: string;
  entity_id?: string;
  expires_at?: string;
};

export async function createTask(
  input: CreateTaskInput,
): Promise<{ ok: true; id: string; deduplicated: boolean } | { ok: false; error: string }> {
  const admin = createAdminClient();

  // Dedup: si hay tarea pending para misma entidad+source, no creamos otra.
  if (input.entity_type && input.entity_id) {
    const { data: existing } = await admin
      .from("admin_tasks")
      .select("id")
      .eq("source", input.source)
      .eq("entity_type", input.entity_type)
      .eq("entity_id", input.entity_id)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) {
      return { ok: true, id: existing.id, deduplicated: true };
    }
  }

  const { data, error } = await admin
    .from("admin_tasks")
    .insert({
      task_type: input.task_type,
      source: input.source,
      priority: input.priority ?? "normal",
      title: input.title,
      description: input.description ?? null,
      proposed_action: (input.proposed_action ?? {}) as Json,
      entity_type: input.entity_type ?? null,
      entity_id: input.entity_id ?? null,
      expires_at: input.expires_at ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No pudimos crear la tarea" };
  }
  return { ok: true, id: data.id, deduplicated: false };
}

/**
 * Aprobar una tarea: cambia status a approved, ejecuta el handler
 * correspondiente y persiste el resultado (executed o failed).
 *
 * Idempotente: una tarea ya executed/failed/rejected/expired no se
 * re-ejecuta — devolvemos error claro.
 */
export async function approveTask(params: {
  taskId: string;
  decidedBy: string;
  decisionNote?: string;
}): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data: task } = await admin
    .from("admin_tasks")
    .select("*")
    .eq("id", params.taskId)
    .maybeSingle();
  if (!task) return { ok: false, error: "Tarea no encontrada" };
  if (task.status !== "pending") {
    return { ok: false, error: `La tarea ya está en estado "${task.status}"` };
  }

  // Marcar aprobada antes de ejecutar (defensa contra doble-click).
  await admin
    .from("admin_tasks")
    .update({
      status: "approved",
      decided_by: params.decidedBy,
      decided_at: new Date().toISOString(),
      decision_note: params.decisionNote ?? null,
    })
    .eq("id", params.taskId)
    .eq("status", "pending");

  // Ejecutar handler.
  let executionStatus: "executed" | "failed" = "executed";
  let executionResult: Json | null = null;
  let executionError: string | null = null;

  try {
    const handler = getHandler(task.task_type);
    const res = await handler(task as TaskRow);
    if (res.ok) {
      executionResult = res.result;
    } else {
      executionStatus = "failed";
      executionError = res.error;
    }
  } catch (err) {
    executionStatus = "failed";
    executionError = err instanceof Error ? err.message : String(err);
  }

  await admin
    .from("admin_tasks")
    .update({
      status: executionStatus,
      executed_at: new Date().toISOString(),
      execution_result: executionResult,
      execution_error: executionError,
    })
    .eq("id", params.taskId);

  await logAdminAction({
    action: "config.update",
    entityType: "config",
    entityId: `task:${params.taskId}`,
    summary: `Aprobó tarea "${task.title}" (${executionStatus})`,
    metadata: {
      task_type: task.task_type,
      execution_status: executionStatus,
      execution_error: executionError,
    },
  });

  return { ok: true, status: executionStatus };
}

export async function rejectTask(params: {
  taskId: string;
  decidedBy: string;
  decisionNote?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: task } = await admin
    .from("admin_tasks")
    .select("title, status")
    .eq("id", params.taskId)
    .maybeSingle();
  if (!task) return { ok: false, error: "Tarea no encontrada" };
  if (task.status !== "pending") {
    return { ok: false, error: `La tarea ya está en estado "${task.status}"` };
  }

  const { error } = await admin
    .from("admin_tasks")
    .update({
      status: "rejected",
      decided_by: params.decidedBy,
      decided_at: new Date().toISOString(),
      decision_note: params.decisionNote ?? null,
    })
    .eq("id", params.taskId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };

  await logAdminAction({
    action: "config.update",
    entityType: "config",
    entityId: `task:${params.taskId}`,
    summary: `Rechazó tarea "${task.title}"`,
    metadata: { decision_note: params.decisionNote ?? null },
  });

  return { ok: true };
}
