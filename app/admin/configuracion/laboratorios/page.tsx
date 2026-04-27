import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";
import LaboratoriesList, { type LaboratoryRow } from "./_components/LaboratoriesList";

export default async function LaboratoriesPage() {
  const adminUser = await requireRole(["owner", "admin", "editor"]);
  const canDelete = adminUser.role === "owner" || adminUser.role === "admin";

  const supabase = await createClient();

  const { data: labs } = await supabase
    .from("laboratories")
    .select("id, name, slug, website_url, scrape_url, logo_url, description, is_active")
    .order("name");

  const { data: products } = await supabase
    .from("products")
    .select("laboratory_id")
    .not("laboratory_id", "is", null);

  const { data: sources } = await supabase
    .from("data_sources")
    .select("laboratory_id")
    .not("laboratory_id", "is", null);

  const productCounts = new Map<string, number>();
  for (const p of products ?? []) {
    const id = (p as { laboratory_id: string }).laboratory_id;
    if (id) productCounts.set(id, (productCounts.get(id) ?? 0) + 1);
  }

  const sourceCounts = new Map<string, number>();
  for (const s of sources ?? []) {
    const id = (s as { laboratory_id: string }).laboratory_id;
    if (id) sourceCounts.set(id, (sourceCounts.get(id) ?? 0) + 1);
  }

  const rows: LaboratoryRow[] = (labs ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    website_url: l.website_url,
    scrape_url: l.scrape_url,
    logo_url: l.logo_url,
    description: l.description,
    is_active: l.is_active,
    products_count: productCounts.get(l.id) ?? 0,
    sources_count: sourceCounts.get(l.id) ?? 0,
  }));

  return <LaboratoriesList rows={rows} canDelete={canDelete} />;
}
