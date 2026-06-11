import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin-auth";
import type { RunPayload } from "@/lib/price-sync/types";
import { createAdminClient } from "@/lib/supabase/admin";
import RunDetail from "./_RunDetail";

export const dynamic = "force-dynamic";

export default async function PriceSyncDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminUser = await requireRole(["owner", "admin", "editor"]);
  const { id } = await params;

  const admin = createAdminClient();
  const { data: run } = await admin
    .from("price_sync_runs")
    .select(
      "id, laboratory_id, source_filename, source_format, status, lines_parsed, lines_matched, lines_applied, payload, created_at, applied_at, laboratory:laboratories!laboratory_id(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!run) notFound();

  const labName =
    (run.laboratory as unknown as { name: string } | null)?.name ?? "—";
  const payload = run.payload as unknown as RunPayload;

  return (
    <RunDetail
      run={{
        id: run.id,
        laboratoryId: run.laboratory_id,
        laboratoryName: labName,
        sourceFilename: run.source_filename,
        sourceFormat: run.source_format,
        status: run.status as "parsed" | "matched" | "applied" | "cancelled",
        linesParsed: run.lines_parsed,
        linesMatched: run.lines_matched,
        linesApplied: run.lines_applied,
        createdAt: run.created_at,
        appliedAt: run.applied_at,
      }}
      payload={payload}
      canApply={["owner", "admin"].includes(adminUser.role)}
    />
  );
}

export function generateMetadata() {
  return {
    title: "Sincronización de precios",
  };
}
