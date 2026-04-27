import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";
import PresentationsList, { type PresentationRow } from "./_components/PresentationsList";

export default async function PresentationsPage() {
  await requireRole(["owner", "admin"]);

  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("presentation_types")
    .select("id, code, name, description, default_unit, unit_family, sort_order, is_active")
    .order("sort_order")
    .order("name");

  // Conteo de productos por código
  const { data: products } = await supabase
    .from("products")
    .select("presentation_type")
    .not("presentation_type", "is", null);

  const counts = new Map<string, number>();
  for (const p of products ?? []) {
    const pt = (p as { presentation_type: string }).presentation_type;
    if (pt) counts.set(pt, (counts.get(pt) ?? 0) + 1);
  }

  const out: PresentationRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    default_unit: r.default_unit,
    unit_family: r.unit_family,
    sort_order: r.sort_order,
    is_active: r.is_active,
    products_count: counts.get(r.code) ?? 0,
  }));

  return <PresentationsList rows={out} />;
}
