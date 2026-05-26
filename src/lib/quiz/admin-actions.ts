// lib/quiz/admin-actions.ts
"use server";

// Acciones de administración del motor de recomendaciones del quiz.
// - triggerQuizRecalcAction: dispara la reclasificación masiva (botón admin).
// - getQuizSyncStatusAction: estado de la última corrida + cuántos sucios hay.
// Requiere sesión de admin. TODO(repo): ajustar el guard de admin al del repo.

import { quizServiceClient } from "./_internal/supabase";
import { requireQuizAdmin } from "./_internal/session";

export async function triggerQuizRecalcAction() {
  await requireQuizAdmin();
  const supabase = quizServiceClient();

  // Invoca la función SQL que llama a la Edge Function si hay sucios.
  const { data, error } = await supabase.rpc("trigger_quiz_reco_sync", {
    p_source: "admin_manual",
  });
  if (error) {
    console.error("triggerQuizRecalcAction:", error.message);
    return { ok: false as const, error: error.message };
  }
  // data es el request_id de pg_net (o null si no había sucios)
  return { ok: true as const, requestId: data ?? null, nothingToDo: data == null };
}

export async function getQuizSyncStatusAction() {
  await requireQuizAdmin();
  const supabase = quizServiceClient();

  const [{ data: dirty }, { data: lastRun }] = await Promise.all([
    supabase.from("quiz_reco_dirty_products").select("id"),
    supabase
      .from("quiz_reco_sync_runs")
      .select("trigger_source,dirty_count,processed,failed,status,started_at,finished_at")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    ok: true as const,
    dirtyCount: dirty?.length ?? 0,
    lastRun: lastRun ?? null,
  };
}
