"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/audit-log";
import { createAdminClient } from "@/lib/supabase/admin";

export type SaviaActionResult = { ok: true } | { ok: false; error: string };

/**
 * Activa/desactiva un flow de Savia. Un flow inactivo no enrola nuevos
 * destinatarios (enrollInFlow lo filtra), pero los jobs YA encolados se
 * envían igual — si se quiere frenar también eso, habría que marcar los
 * jobs queued como skipped (decisión explícita, no la tomamos por defecto).
 */
export async function toggleFlow(
  flowId: string,
  active: boolean,
): Promise<SaviaActionResult> {
  const adminUser = await getAdminUser();
  if (!["owner", "admin"].includes(adminUser.role)) {
    return { ok: false, error: "Sin permisos" };
  }

  const admin = createAdminClient();
  // Cargamos el nombre del flow antes para escribir un summary legible.
  const { data: flow } = await admin
    .from("email_flows")
    .select("name")
    .eq("id", flowId)
    .maybeSingle();

  const { error } = await admin
    .from("email_flows")
    .update({ active })
    .eq("id", flowId);

  if (error) {
    console.error("[toggleFlow]", error.message);
    return { ok: false, error: "No pudimos actualizar el flow" };
  }

  revalidatePath("/admin/savia");
  revalidatePath("/admin/savia/flows");

  await logAdminAction({
    action: "flow.toggle",
    entityType: "flow",
    entityId: flowId,
    summary: `${active ? "Activó" : "Desactivó"} flow ${flow?.name ?? flowId}`,
    metadata: { active },
  });

  return { ok: true };
}

/**
 * Quita un email de la lista de suppressions. Usar con criterio: si el
 * email rebotó hard, volverá a rebotar; si fue complaint, reenviarle
 * marketing daña la reputación. El caso legítimo es la corrección de un
 * unsubscribe accidental pedido por el propio cliente.
 */
export async function removeSuppression(
  email: string,
): Promise<SaviaActionResult> {
  const adminUser = await getAdminUser();
  if (!["owner", "admin"].includes(adminUser.role)) {
    return { ok: false, error: "Sin permisos" };
  }

  const admin = createAdminClient();
  const clean = email.trim().toLowerCase();
  const { error } = await admin
    .from("email_suppressions")
    .delete()
    .eq("email", clean);

  if (error) {
    console.error("[removeSuppression]", error.message);
    return { ok: false, error: "No pudimos quitar la suppression" };
  }

  revalidatePath("/admin/savia/suppressions");

  await logAdminAction({
    action: "suppression.remove",
    entityType: "suppression",
    entityId: clean,
    summary: `Quitó de suppression a ${clean}`,
  });

  return { ok: true };
}

/**
 * Añade un email a suppressions manualmente (ej. petición directa del
 * cliente por otro canal, o limpieza preventiva).
 */
export async function addSuppression(
  email: string,
  notes: string,
): Promise<SaviaActionResult> {
  const adminUser = await getAdminUser();
  if (!["owner", "admin"].includes(adminUser.role)) {
    return { ok: false, error: "Sin permisos" };
  }

  const clean = email.trim().toLowerCase();
  if (!clean.includes("@") || clean.length < 5) {
    return { ok: false, error: "Email inválido" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("email_suppressions").upsert(
    {
      email: clean,
      reason: "unsubscribe",
      source: "admin_manual",
      notes: notes.trim() || `Añadido manualmente por ${adminUser.email}`,
    },
    { onConflict: "email" },
  );

  if (error) {
    console.error("[addSuppression]", error.message);
    return { ok: false, error: "No pudimos añadir la suppression" };
  }

  revalidatePath("/admin/savia/suppressions");

  await logAdminAction({
    action: "suppression.add",
    entityType: "suppression",
    entityId: clean,
    summary: `Añadió a suppression ${clean}`,
    metadata: { notes: notes.trim() || null },
  });

  return { ok: true };
}

/**
 * Reintenta un job fallido: lo devuelve a 'queued' con attempts=0 para
 * que el próximo tick del dispatcher lo procese.
 */
export async function retryJob(jobId: string): Promise<SaviaActionResult> {
  const adminUser = await getAdminUser();
  if (!["owner", "admin"].includes(adminUser.role)) {
    return { ok: false, error: "Sin permisos" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("email_jobs")
    .update({ status: "queued", attempts: 0, last_error: null })
    .eq("id", jobId)
    .eq("status", "failed");

  if (error) {
    console.error("[retryJob]", error.message);
    return { ok: false, error: "No pudimos reencolar el job" };
  }

  revalidatePath("/admin/savia/jobs");
  return { ok: true };
}
