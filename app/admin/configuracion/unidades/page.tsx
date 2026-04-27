import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";
import UnitsList, { type UnitRow } from "./_components/UnitsList";

export default async function UnitsPage() {
  await requireRole(["owner", "admin"]);

  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("content_units")
    .select("id, code, name, symbol, unit_family, sort_order, is_active")
    .order("sort_order")
    .order("name");

  // Conteo por código
  const { data: products } = await supabase
    .from("products")
    .select("content_unit")
    .not("content_unit", "is", null);

  const counts = new Map<string, number>();
  for (const p of products ?? []) {
    const cu = (p as { content_unit: string }).content_unit;
    if (cu) counts.set(cu, (counts.get(cu) ?? 0) + 1);
  }

  const out: UnitRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    symbol: r.symbol,
    unit_family: r.unit_family,
    sort_order: r.sort_order,
    is_active: r.is_active,
    products_count: counts.get(r.code) ?? 0,
  }));

  return <UnitsList rows={out} />;
}
