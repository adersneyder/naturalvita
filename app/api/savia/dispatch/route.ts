/**
 * app/api/savia/dispatch/route.ts
 *
 * Dispatcher de Savia. Lo invoca pg_cron cada minuto (net.http_post con
 * Bearer SAVIA_DISPATCH_TOKEN). Lee la cola, envía y registra eventos.
 *
 * Por qué vive aquí y no en una Edge Function Deno: reutiliza el transporte
 * Resend, las plantillas react-email, el suppression check y el reintento
 * 429 que ya existen en lib/ — cero duplicación, un solo lenguaje.
 *
 * Flujo por invocación:
 *   1. Auth por Bearer token.
 *   2. Claim atómico de hasta 50 jobs vencidos (RPC savia_claim_jobs, marca
 *      'sending' con FOR UPDATE SKIP LOCKED → sin doble-envío entre ticks).
 *   3. Por cada job: render del template (dinámico), envío, y resolución:
 *        - suppressed → 'skipped'
 *        - éxito      → 'sent' + message_id, evento 'sent'
 *        - error      → reintenta (vuelve a 'queued') hasta attempts>=3 → 'failed'
 *
 * Throttle: 50 jobs/invocación × 1/min = 50/min (warmup mes 1).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { saviaSendEmail } from "@/lib/savia/transport/resend";
import { renderSaviaTemplate, shouldSkipSend } from "@/lib/savia/templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 50;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

async function dispatch(): Promise<{
  claimed: number;
  sent: number;
  skipped: number;
  failed: number;
  requeued: number;
}> {
  const supabase = createAdminClient();

  const { data: jobs, error: claimErr } = await supabase.rpc(
    "savia_claim_jobs",
    { p_limit: BATCH_SIZE },
  );
  if (claimErr) {
    console.error("[savia/dispatch] error en claim:", claimErr.message);
    throw new Error(claimErr.message);
  }

  const claimed = jobs ?? [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let requeued = 0;

  for (const job of claimed) {
    const payload = (job.payload ?? {}) as Record<string, unknown>;
    const unsubscribeToken = String(payload.unsubscribeToken ?? "");

    try {
      // Predicate de tiempo de envío: si el contexto cambió (ej. el carrito
      // se compró tras el enrolamiento), saltamos sin enviar ni cobrar margen.
      const ctx = {
        toEmail: job.to_email,
        unsubscribeToken,
        jobId: job.id,
        payload,
      };
      if (await shouldSkipSend(job.template, ctx)) {
        await supabase
          .from("email_jobs")
          .update({ status: "skipped", last_error: "predicate_skip" })
          .eq("id", job.id);
        skipped++;
        continue;
      }

      const react = await renderSaviaTemplate(job.template, ctx);

      const result = await saviaSendEmail({
        to: job.to_email,
        subject: job.subject,
        react,
        unsubscribeToken,
        flowId: job.flow_id ?? undefined,
        flowStepId: job.flow_step_id ?? undefined,
        jobId: job.id,
      });

      if (result.suppressed) {
        await supabase
          .from("email_jobs")
          .update({ status: "skipped", last_error: "suppressed" })
          .eq("id", job.id);
        skipped++;
        continue;
      }

      if (result.success) {
        await supabase
          .from("email_jobs")
          .update({ status: "sent", message_id: result.messageId ?? null })
          .eq("id", job.id);
        await supabase.from("email_events").insert({
          job_id: job.id,
          message_id: result.messageId ?? null,
          event_type: "sent",
          metadata: { flow_id: job.flow_id, template: job.template },
        });
        sent++;
        continue;
      }

      // Fallo de transporte: reintentar hasta MAX_ATTEMPTS.
      const attempts = (job.attempts ?? 0) + 1;
      const definitive = attempts >= MAX_ATTEMPTS;
      await supabase
        .from("email_jobs")
        .update({
          status: definitive ? "failed" : "queued",
          attempts,
          last_error: result.error ?? "transport_error",
        })
        .eq("id", job.id);
      if (definitive) {
        await supabase.from("email_events").insert({
          job_id: job.id,
          message_id: null,
          event_type: "failed",
          metadata: { error: result.error ?? "transport_error" },
        });
        failed++;
      } else {
        requeued++;
      }
    } catch (err) {
      // Error inesperado (ej. template desconocido o render): cuenta intento.
      const attempts = (job.attempts ?? 0) + 1;
      const definitive = attempts >= MAX_ATTEMPTS;
      const message = err instanceof Error ? err.message : "error_desconocido";
      await supabase
        .from("email_jobs")
        .update({
          status: definitive ? "failed" : "queued",
          attempts,
          last_error: message,
        })
        .eq("id", job.id);
      if (definitive) failed++;
      else requeued++;
      console.error(`[savia/dispatch] job ${job.id} falló:`, message);
    }
  }

  return { claimed: claimed.length, sent, skipped, failed, requeued };
}

export async function POST(request: NextRequest) {
  const token = process.env.SAVIA_DISPATCH_TOKEN;
  if (!token) {
    console.error("[savia/dispatch] SAVIA_DISPATCH_TOKEN no configurado.");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${token}`) return unauthorized();

  try {
    const summary = await dispatch();
    return NextResponse.json({ status: "ok", ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
