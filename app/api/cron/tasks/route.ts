import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAllTasks } from "@/lib/tasks/generators";
import { logAdminAction } from "@/lib/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron diario de tareas. Hace dos cosas:
 *   1. expire_overdue_tasks(): marca como expired las tareas pending
 *      con expires_at vencido.
 *   2. generateAllTasks(): corre los 3 generadores (churn, cart,
 *      wishlist). createTask deduplica por entidad, así que correr
 *      diario no inunda.
 *
 * Protección: Vercel Cron firma cada request con
 * `Authorization: Bearer ${CRON_SECRET}`. Si la env var no está
 * configurada, rechazamos todo (defensa contra activación accidental
 * pública). Pruebas manuales: invocar con el header puesto a mano.
 *
 * Configuración en vercel.json: corre 1x al día a las 14:00 UTC
 * (~09:00 hora Colombia) para que el equipo entre y vea la bandeja
 * fresca.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const started = Date.now();
  const admin = createAdminClient();

  let expired = 0;
  try {
    const { data } = await admin.rpc("expire_overdue_tasks");
    expired = typeof data === "number" ? data : 0;
  } catch (err) {
    console.error("[cron/tasks] expire_overdue_tasks falló", err);
  }

  let result: Awaited<ReturnType<typeof generateAllTasks>> | null = null;
  let generationError: string | null = null;
  try {
    result = await generateAllTasks();
  } catch (err) {
    generationError = err instanceof Error ? err.message : String(err);
    console.error("[cron/tasks] generateAllTasks falló", generationError);
  }

  const duration_ms = Date.now() - started;

  // Audit log con quién (sistema) y qué pasó. Actor null = sistema.
  await logAdminAction({
    action: "config.update",
    entityType: "config",
    entityId: "cron:tasks",
    summary: `Cron tareas: ${result ? result.churn.created + result.cart.created + result.wishlist.created + result.chatEscalation.created : 0} creadas, ${expired} expiradas`,
    metadata: {
      expired,
      result,
      generation_error: generationError,
      duration_ms,
    },
  });

  return NextResponse.json({
    ok: !generationError,
    expired,
    generated: result,
    duration_ms,
  });
}
