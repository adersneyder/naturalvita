"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/audit-log";
import { parseCsv, parseXlsx } from "@/lib/price-sync/parse";
import { matchLines } from "@/lib/price-sync/match";
import type { RunPayload } from "@/lib/price-sync/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

export type SyncResult =
  | { ok: true; runId: string }
  | { ok: false; error: string };

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTS = ["xlsx", "csv"] as const;

/**
 * Acción del Step 1: el admin sube el archivo + selecciona lab.
 * Parsea localmente, crea el run con status="parsed", redirige al detalle.
 *
 * Notas:
 * - PDF se acepta como TODO futuro (necesitaría Claude API document).
 * - Tamaño máximo 5MB — listas de precios reales no pasan de ~200KB.
 */
export async function createPriceSyncRun(
  formData: FormData,
): Promise<SyncResult> {
  const adminUser = await requireRole(["owner", "admin", "editor"]);

  const labId = String(formData.get("laboratoryId") ?? "");
  if (!z.string().uuid().safeParse(labId).success) {
    return { ok: false, error: "Laboratorio inválido" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Debes adjuntar un archivo" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "El archivo es muy grande (máximo 5 MB)" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTS.includes(ext as (typeof ALLOWED_EXTS)[number])) {
    return {
      ok: false,
      error: "Formato no soportado. Acepta .xlsx o .csv (PDF próximamente).",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    if (ext === "xlsx") {
      parsed = await parseXlsx(buffer);
    } else {
      parsed = parseCsv(buffer.toString("utf-8"));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al parsear archivo";
    return { ok: false, error: msg };
  }

  if (parsed.length === 0) {
    return {
      ok: false,
      error: "No encontramos líneas válidas en el archivo",
    };
  }

  const admin = createAdminClient();
  const payload: RunPayload = {
    version: 1,
    // En Step 1 aún no hay matching. Lo guardamos plano con candidates: [].
    lines: parsed.map((line) => ({
      ...line,
      candidates: [],
      confidence: "none",
      decision: null,
    })),
  };

  const { data: run, error } = await admin
    .from("price_sync_runs")
    .insert({
      laboratory_id: labId,
      source_filename: file.name,
      source_format: ext as "xlsx" | "csv",
      status: "parsed",
      lines_parsed: parsed.length,
      payload: payload as unknown as Json,
      created_by: adminUser.id,
    })
    .select("id")
    .single();

  if (error || !run) {
    console.error("[createPriceSyncRun]", error?.message);
    return { ok: false, error: "No pudimos guardar la corrida" };
  }

  revalidatePath("/admin/precios/sincronizar");
  redirect(`/admin/precios/sincronizar/${run.id}`);
}

/**
 * Step 2: dispara el matching. Lee el catálogo del lab, ejecuta el
 * algoritmo local sobre las líneas parseadas, guarda los candidatos.
 */
export async function runMatching(runId: string): Promise<SyncResult> {
  await requireRole(["owner", "admin", "editor"]);
  if (!z.string().uuid().safeParse(runId).success) {
    return { ok: false, error: "ID inválido" };
  }

  const admin = createAdminClient();
  const { data: run, error: runErr } = await admin
    .from("price_sync_runs")
    .select("id, laboratory_id, status, payload")
    .eq("id", runId)
    .maybeSingle();

  if (runErr || !run) return { ok: false, error: "Corrida no encontrada" };
  if (run.status !== "parsed") {
    return { ok: false, error: "Esta corrida ya pasó del paso de matching" };
  }

  // Cargamos solo productos activos del lab; los inactivos no tiene sentido
  // ofrecerlos como destino.
  const { data: products, error: prodErr } = await admin
    .from("products")
    .select("id, name, sku, cost_cop, price_cop, is_active")
    .eq("laboratory_id", run.laboratory_id)
    .eq("is_active", true);

  if (prodErr) return { ok: false, error: "No pudimos leer el catálogo" };

  const catalog = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    cost_cop: p.cost_cop,
    price_cop: p.price_cop,
  }));

  const payload = run.payload as unknown as RunPayload;
  const matched = matchLines(payload.lines, catalog);
  const linesMatched = matched.filter((l) => l.decision !== null).length;

  const newPayload: RunPayload = { ...payload, lines: matched };

  const { error: updErr } = await admin
    .from("price_sync_runs")
    .update({
      status: "matched",
      lines_matched: linesMatched,
      payload: newPayload as unknown as Json,
    })
    .eq("id", runId);

  if (updErr) return { ok: false, error: "No pudimos guardar el matching" };

  revalidatePath(`/admin/precios/sincronizar/${runId}`);
  return { ok: true, runId };
}

const DecisionsSchema = z.object({
  runId: z.string().uuid(),
  // Map de "lineIndex" → "product_id" | "skip"
  decisions: z.record(z.string(), z.string()),
});

/**
 * Step 3: el admin aprueba qué líneas aplicar. Cada decisión es
 * product_id (lo aplica) o "skip" (no toca). Solo owner/admin.
 *
 * UPDATE atomicity: por simplicidad ejecutamos un UPDATE por producto.
 * Una corrida típica son <50 cambios — el roundtrip es asumible. Si
 * el catálogo crece a miles, conviene una RPC para hacerlo en batch.
 *
 * Side effect: cost_cop se actualiza al precio del proveedor. price_cop
 * (público) NO se toca — el margen lo decide el admin manualmente en
 * la ficha del producto. Esto es deliberado: el sincronizador es para
 * mantener el costo al día, no para repricing automático.
 */
export async function applyPriceSync(
  input: z.infer<typeof DecisionsSchema>,
): Promise<SyncResult> {
  await requireRole(["owner", "admin"]);

  const parsed = DecisionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const { runId, decisions } = parsed.data;
  const admin = createAdminClient();

  const { data: run, error: runErr } = await admin
    .from("price_sync_runs")
    .select("id, laboratory_id, status, payload, source_filename")
    .eq("id", runId)
    .maybeSingle();
  if (runErr || !run) return { ok: false, error: "Corrida no encontrada" };
  if (run.status !== "matched") {
    return { ok: false, error: "Esta corrida no está lista para aplicar" };
  }

  const payload = run.payload as unknown as RunPayload;
  const updatedLines = payload.lines.map((line) => {
    const dec = decisions[String(line.index)];
    if (!dec) return line;
    return { ...line, decision: dec };
  });

  let appliedCount = 0;
  for (const line of updatedLines) {
    if (!line.decision || line.decision === "skip") continue;
    const { error } = await admin
      .from("products")
      .update({
        cost_cop: line.price_cop,
        source_price_cop: line.price_cop,
        source_price_updated_at: new Date().toISOString(),
      })
      .eq("id", line.decision)
      .eq("laboratory_id", run.laboratory_id);
    if (error) {
      console.error("[applyPriceSync] update failed", error.message);
      // Continuamos: una línea fallida no debe abortar el resto. El
      // status de la corrida queda "applied" con lines_applied real.
      continue;
    }
    appliedCount++;
  }

  const finalPayload: RunPayload = { ...payload, lines: updatedLines };
  await admin
    .from("price_sync_runs")
    .update({
      status: "applied",
      lines_applied: appliedCount,
      payload: finalPayload as unknown as Json,
      applied_at: new Date().toISOString(),
    })
    .eq("id", runId);

  await logAdminAction({
    action: "price.sync",
    entityType: "price_sync",
    entityId: runId,
    summary: `Sincronizó ${appliedCount} precios de ${run.source_filename ?? "archivo"}`,
    metadata: {
      laboratory_id: run.laboratory_id,
      lines_total: payload.lines.length,
      lines_applied: appliedCount,
    },
  });

  revalidatePath("/admin/precios/sincronizar");
  revalidatePath(`/admin/precios/sincronizar/${runId}`);
  revalidatePath("/admin/productos");
  return { ok: true, runId };
}

/** Cancela una corrida sin aplicar nada. */
export async function cancelPriceSync(runId: string): Promise<SyncResult> {
  await requireRole(["owner", "admin", "editor"]);
  if (!z.string().uuid().safeParse(runId).success) {
    return { ok: false, error: "ID inválido" };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("price_sync_runs")
    .update({ status: "cancelled" })
    .eq("id", runId)
    .in("status", ["parsed", "matched"]);
  if (error) return { ok: false, error: "No pudimos cancelar la corrida" };
  revalidatePath("/admin/precios/sincronizar");
  revalidatePath(`/admin/precios/sincronizar/${runId}`);
  return { ok: true, runId };
}
