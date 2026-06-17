"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCapability } from "@/lib/admin-capabilities";
import { approveTask, createTask, rejectTask } from "@/lib/tasks/api";
import { createAdminClient } from "@/lib/supabase/admin";

export type TaskActionResult =
  | { ok: true; message?: string; status?: string }
  | { ok: false; error: string };

const DecisionSchema = z.object({
  taskId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
});

export async function approveTaskAction(
  input: z.infer<typeof DecisionSchema>,
): Promise<TaskActionResult> {
  const actor = await requireCapability("tasks.decide");
  const parsed = DecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const res = await approveTask({
    taskId: parsed.data.taskId,
    decidedBy: actor.id,
    decisionNote: parsed.data.note,
  });

  revalidatePath("/admin/tareas");
  if (!res.ok) return res;
  return {
    ok: true,
    status: res.status,
    message:
      res.status === "executed"
        ? "Tarea aprobada y ejecutada"
        : "Tarea aprobada pero la ejecución falló — revisa el detalle",
  };
}

export async function rejectTaskAction(
  input: z.infer<typeof DecisionSchema>,
): Promise<TaskActionResult> {
  const actor = await requireCapability("tasks.decide");
  const parsed = DecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const res = await rejectTask({
    taskId: parsed.data.taskId,
    decidedBy: actor.id,
    decisionNote: parsed.data.note,
  });

  revalidatePath("/admin/tareas");
  if (!res.ok) return res;
  return { ok: true, message: "Tarea rechazada" };
}

/**
 * Generador: clientes en segmento RFM 'at_risk' (R<=2, F>=3) que aún no
 * tienen una tarea pendiente de Sembrado.churn. Crea una tarea por
 * cliente proponiendo enrolarlo en el flow de recuperación.
 *
 * Idempotente: createTask deduplica por (source, entity_type, entity_id)
 * cuando status=pending. Re-ejecutar no inunda la bandeja.
 *
 * Hardcodeado el flow 'reactivation_60d' por ahora; cuando exista la UI
 * de "elegir flow" para tareas, se parametriza.
 */
const CHURN_FLOW_ID = "reactivation_60d";

export async function generateChurnTasksAction(): Promise<TaskActionResult> {
  await requireCapability("tasks.decide");

  const admin = createAdminClient();
  const { data: rfm } = await admin.rpc("customer_rfm");
  if (!rfm) return { ok: true, message: "Sin datos de RFM aún" };

  const atRisk = rfm.filter(
    (r) =>
      r.segment_code === "at_risk" && r.customer_email && r.lifetime_revenue_cop > 0,
  );

  let created = 0;
  let deduped = 0;

  for (const c of atRisk) {
    const res = await createTask({
      task_type: "savia.enroll_flow",
      source: "sembrado.churn",
      title: `Recuperar a ${c.customer_name ?? c.customer_email}`,
      description: `Cliente at_risk (R${c.r_score} F${c.f_score} M${c.m_score}). Ha gastado ${c.lifetime_revenue_cop.toLocaleString("es-CO")} COP en ${c.orders_count} pedidos. Última compra hace ${c.days_since_last_order} días.`,
      priority: c.m_score >= 4 ? "high" : "normal",
      proposed_action: {
        flow_id: CHURN_FLOW_ID,
        customer_emails: [c.customer_email],
      },
      entity_type: "customer",
      entity_id: c.customer_email.toLowerCase(),
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (res.ok && res.deduplicated) deduped++;
    else if (res.ok) created++;
  }

  revalidatePath("/admin/tareas");
  return {
    ok: true,
    message: `Generadas ${created} tareas nuevas. ${deduped} ya existían pendientes.`,
  };
}
