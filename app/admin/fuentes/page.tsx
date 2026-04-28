import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/admin-auth";
import DataSourcesList, { type DataSourceRow } from "./_components/DataSourcesList";

export default async function FuentesPage() {
  const adminUser = await getAdminUser();
  const supabase = await createClient();

  const { data: sourcesRaw } = await supabase
    .from("data_sources")
    .select(
      `id, name, type, base_url, catalog_url, scraper_strategy, is_active,
       last_run_at, last_run_status, last_run_products_found,
       laboratory:laboratories!laboratory_id(id, name, slug)`,
    )
    .order("name");

  // Conteo de productos por data source
  const { data: productCounts } = await supabase
    .from("products")
    .select("data_source_id");

  const countByDs = new Map<string, number>();
  (productCounts ?? []).forEach((p: { data_source_id: string | null }) => {
    if (!p.data_source_id) return;
    countByDs.set(p.data_source_id, (countByDs.get(p.data_source_id) ?? 0) + 1);
  });

  // Cleanup: jobs en running/pending sin progreso en los últimos 5 minutos se consideran muertos.
  // Causas típicas: cliente cerró pestaña, timeout de Vercel, deploy en medio del job, error de red.
  // Sin este cleanup la UI muestra un modal estático perpetuo al volver a la pestaña.
  // Usamos COALESCE(last_progress_at, started_at) para cubrir jobs que nunca avanzaron.
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await supabase
    .from("scraping_jobs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: "Job expirado por inactividad (>5 min sin progreso)",
    })
    .in("status", ["pending", "running"])
    .or(`last_progress_at.lt.${fiveMinutesAgo},and(last_progress_at.is.null,started_at.lt.${fiveMinutesAgo})`);

  // Job en running por data source (si hay alguno)
  const { data: runningJobs } = await supabase
    .from("scraping_jobs")
    .select("id, data_source_id, status, last_offset, products_created, products_updated")
    .in("status", ["pending", "running"]);

  const runningByDs = new Map<string, { id: string; status: string; last_offset: number }>();
  (runningJobs ?? []).forEach((j) => {
    runningByDs.set(j.data_source_id, j);
  });

  const sources: DataSourceRow[] = (sourcesRaw ?? []).map((s: {
    id: string;
    name: string;
    type: string;
    base_url: string | null;
    catalog_url: string | null;
    scraper_strategy: string | null;
    is_active: boolean;
    last_run_at: string | null;
    last_run_status: string | null;
    last_run_products_found: number | null;
    laboratory: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
  }) => {
    const lab = Array.isArray(s.laboratory) ? s.laboratory[0] : s.laboratory;
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      base_url: s.base_url,
      catalog_url: s.catalog_url,
      scraper_strategy: s.scraper_strategy,
      is_active: s.is_active,
      last_run_at: s.last_run_at,
      last_run_status: s.last_run_status,
      last_run_products_found: s.last_run_products_found,
      laboratory_name: lab?.name ?? "—",
      laboratory_slug: lab?.slug ?? "",
      product_count: countByDs.get(s.id) ?? 0,
      running_job: runningByDs.get(s.id) ?? null,
    };
  });

  const canManage = hasRole(adminUser.role, ["owner", "admin"]);

  return <DataSourcesList sources={sources} canManage={canManage} />;
}
