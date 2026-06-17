"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCapability } from "@/lib/admin-capabilities";
import { approveTask, rejectTask } from "@/lib/tasks/api";
import {
  generateAllTasks,
  generateCartAbandonmentTasks,
  generateChurnTasks,
  generateWishlistGapTasks,
} from "@/lib/tasks/generators";

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

const GeneratorSchema = z.enum(["churn", "cart", "wishlist", "all"]);

/**
 * Ejecuta uno o todos los generadores manualmente desde la UI.
 * Cada generador es idempotente (createTask deduplica por entity_id +
 * source cuando status=pending), así que re-correr no daña.
 */
export async function runGeneratorAction(
  which: z.infer<typeof GeneratorSchema>,
): Promise<TaskActionResult> {
  await requireCapability("tasks.decide");
  if (!GeneratorSchema.safeParse(which).success) {
    return { ok: false, error: "Generador inválido" };
  }

  try {
    if (which === "all") {
      const r = await generateAllTasks();
      const created =
        r.churn.created + r.cart.created + r.wishlist.created;
      const deduped =
        r.churn.deduplicated +
        r.cart.deduplicated +
        r.wishlist.deduplicated;
      revalidatePath("/admin/tareas");
      return {
        ok: true,
        message: `Generadas ${created} tareas nuevas (${r.churn.created} churn, ${r.cart.created} carrito, ${r.wishlist.created} wishlist). ${deduped} ya existían pendientes.`,
      };
    }

    const r =
      which === "churn"
        ? await generateChurnTasks()
        : which === "cart"
          ? await generateCartAbandonmentTasks()
          : await generateWishlistGapTasks();
    revalidatePath("/admin/tareas");
    return {
      ok: true,
      message: `Generadas ${r.created} tareas nuevas. ${r.deduplicated} ya existían pendientes.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    console.error("[runGeneratorAction]", which, msg);
    return { ok: false, error: msg };
  }
}
