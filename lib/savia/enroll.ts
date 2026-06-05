/**
 * lib/savia/enroll.ts
 *
 * Enrolador de flows de Savia. Cuando ocurre un evento de negocio
 * (suscripción, carrito abandonado, ...), materializa los jobs de un flow
 * en la cola `email_jobs`, con los delays declarados en `email_flow_steps`.
 *
 * Garantías:
 *   - Predicates (#3): no encola si el correo está en suppression. Punto
 *     extensible para reglas como "no compró en 7d" o "no está en otro flow".
 *   - Idempotencia: la idempotency_key `{flow}:{step}:{email}` impide
 *     doble-encolado si el trigger se dispara dos veces (ej. doble submit).
 *   - Render diferido: el payload guarda datos/IDs, no HTML; el dispatcher
 *     resuelve el contenido al enviar.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type EnrollSubscriber = {
  email: string;
  /** Token único para el link de baja; se guarda en el payload del job. */
  unsubscribeToken: string;
  /** Nombre para personalizar; opcional. */
  customerName?: string | null;
};

export type EnrollResult =
  | { ok: true; enrolled: number }
  | { ok: false; reason: string };

/**
 * Enrola a un suscriptor en un flow activo. Devuelve cuántos jobs encoló
 * (0 si todos los pasos ya estaban encolados por una corrida previa).
 */
export async function enrollInFlow(
  flowSlug: string,
  subscriber: EnrollSubscriber,
  payload: Record<string, unknown> = {},
): Promise<EnrollResult> {
  const email = subscriber.email.trim().toLowerCase();
  if (!email) return { ok: false, reason: "email_vacio" };

  const supabase = createAdminClient();

  // Predicate (#3): suppression global. Si está suprimido, no encolamos nada.
  const { data: suppressed } = await supabase
    .from("email_suppressions")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (suppressed) return { ok: false, reason: "suppressed" };

  // Flow activo + sus pasos activos en orden.
  const { data: flow } = await supabase
    .from("email_flows")
    .select("id, active")
    .eq("id", flowSlug)
    .eq("active", true)
    .maybeSingle();
  if (!flow) return { ok: false, reason: "flow_inactivo_o_inexistente" };

  const { data: steps } = await supabase
    .from("email_flow_steps")
    .select("id, step_order, delay_seconds, template, subject, active")
    .eq("flow_id", flowSlug)
    .eq("active", true)
    .order("step_order", { ascending: true });

  if (!steps || steps.length === 0) {
    return { ok: false, reason: "flow_sin_pasos" };
  }

  // Payload base compartido por todos los jobs del flow. Incluye el token de
  // baja y el nombre para que el dispatcher pueda renderizar sin re-consultar.
  const basePayload = {
    ...payload,
    customerName: subscriber.customerName ?? null,
    unsubscribeToken: subscriber.unsubscribeToken,
  };

  const now = Date.now();
  let cumulativeDelay = 0;

  const rows = steps.map((step) => {
    cumulativeDelay += step.delay_seconds ?? 0;
    const scheduledAt = new Date(now + cumulativeDelay * 1000).toISOString();
    return {
      to_email: email,
      subject: step.subject,
      template: step.template,
      payload: basePayload,
      scheduled_at: scheduledAt,
      status: "queued",
      flow_id: flowSlug,
      flow_step_id: step.id,
      idempotency_key: `${flowSlug}:${step.id}:${email}`,
    };
  });

  // Upsert ignorando duplicados: si un step ya estaba encolado para este
  // email (misma idempotency_key), no se reinserta.
  const { data: inserted, error } = await supabase
    .from("email_jobs")
    .upsert(rows, { onConflict: "idempotency_key", ignoreDuplicates: true })
    .select("id");

  if (error) {
    console.error("[savia/enroll] error encolando jobs:", error.message);
    return { ok: false, reason: "db_error" };
  }

  return { ok: true, enrolled: inserted?.length ?? 0 };
}
