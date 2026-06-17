import "server-only";
import { z } from "zod";
import { enrollInFlow } from "@/lib/savia/enroll";
import { resolveUnsubscribeToken } from "@/lib/savia/unsubscribe-token";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TaskHandler } from "./index";

/**
 * Handler: enrola una lista de clientes en un flow Savia activo.
 *
 * Shape esperado en proposed_action:
 *   { flow_id: string, customer_emails: string[], payload?: object }
 *
 * Para cada email:
 *   - Si existe en public.customers, se enriquece con full_name.
 *   - enrollInFlow ya respeta suppression global + idempotency, así
 *     que reaprobar la misma tarea no duplica envíos.
 *
 * Resultado: { enrolled, skipped, by_reason }.
 */

const Schema = z.object({
  flow_id: z.string().min(1),
  customer_emails: z.array(z.string().email()).min(1).max(500),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const handleSaviaEnrollFlow: TaskHandler = async (task) => {
  const parsed = Schema.safeParse(task.proposed_action);
  if (!parsed.success) {
    return {
      ok: false,
      error: `proposed_action inválido: ${parsed.error.issues[0]?.message ?? "schema"}`,
    };
  }
  const { flow_id, customer_emails, payload } = parsed.data;

  const admin = createAdminClient();
  const emails = customer_emails.map((e) => e.trim().toLowerCase());

  const { data: customers } = await admin
    .from("customers")
    .select("email, full_name")
    .in("email", emails);

  const byEmail = new Map<string, { full_name: string | null }>();
  for (const c of customers ?? []) {
    byEmail.set(c.email.toLowerCase(), { full_name: c.full_name });
  }

  let enrolled = 0;
  let skipped = 0;
  const byReason: Record<string, number> = {};

  for (const email of emails) {
    const found = byEmail.get(email);
    const unsubscribeToken = await resolveUnsubscribeToken(email);
    const res = await enrollInFlow(
      flow_id,
      {
        email,
        unsubscribeToken,
        customerName: found?.full_name ?? null,
      },
      payload ?? {},
      { enrollmentRef: `task:${task.id}` },
    );
    if (res.ok) {
      enrolled++;
    } else {
      skipped++;
      const reason = res.reason ?? "unknown";
      byReason[reason] = (byReason[reason] ?? 0) + 1;
    }
  }

  return {
    ok: true,
    result: {
      enrolled,
      skipped,
      by_reason: byReason,
      flow_id,
    },
  };
};
