import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TaskHandler } from "./index";

/**
 * Handler: añade emails a la suppression list de Savia.
 *
 * Shape esperado en proposed_action:
 *   { emails: string[], reason?: string, notes?: string }
 *
 * Idempotente vía upsert con onConflict en email.
 */

const Schema = z.object({
  emails: z.array(z.string().email()).min(1).max(1000),
  reason: z.string().max(80).optional(),
  notes: z.string().max(500).optional(),
});

export const handleSaviaSuppressList: TaskHandler = async (task) => {
  const parsed = Schema.safeParse(task.proposed_action);
  if (!parsed.success) {
    return {
      ok: false,
      error: `proposed_action inválido: ${parsed.error.issues[0]?.message ?? "schema"}`,
    };
  }
  const { emails, reason, notes } = parsed.data;

  const admin = createAdminClient();
  const rows = emails.map((e) => ({
    email: e.trim().toLowerCase(),
    reason: reason ?? "unsubscribe",
    source: "task_approval",
    notes: notes ?? `Aprobado via tarea ${task.id}`,
  }));

  const { error } = await admin
    .from("email_suppressions")
    .upsert(rows, { onConflict: "email" });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    result: { suppressed_count: rows.length },
  };
};
