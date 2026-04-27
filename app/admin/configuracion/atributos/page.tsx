import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";
import AttributesList, { type AttributeRow } from "./_components/AttributesList";

export default async function AttributesPage() {
  const adminUser = await requireRole(["owner", "admin", "editor"]);
  const canDelete = adminUser.role === "owner" || adminUser.role === "admin";

  const supabase = await createClient();

  const { data: attributes } = await supabase
    .from("product_attributes")
    .select(
      `id, name, slug, description, attribute_type, is_filterable, show_in_card, sort_order, is_active,
       options:product_attribute_options(id, value, slug, sort_order)`,
    )
    .order("sort_order")
    .order("name");

  // Conteo de productos por atributo
  const { data: counts } = await supabase
    .from("product_attribute_values")
    .select("attribute_id");

  const countMap = new Map<string, Set<string>>();
  for (const row of counts ?? []) {
    const r = row as { attribute_id: string; product_id?: string };
    if (!countMap.has(r.attribute_id)) countMap.set(r.attribute_id, new Set());
  }

  // Para conteo de productos únicos por atributo, hacer una query mejor
  const productCountMap = new Map<string, number>();
  if (attributes && attributes.length > 0) {
    const ids = attributes.map((a) => a.id);
    const { data: pavs } = await supabase
      .from("product_attribute_values")
      .select("attribute_id, product_id")
      .in("attribute_id", ids);
    const m = new Map<string, Set<string>>();
    for (const r of pavs ?? []) {
      const rr = r as { attribute_id: string; product_id: string };
      if (!m.has(rr.attribute_id)) m.set(rr.attribute_id, new Set());
      m.get(rr.attribute_id)!.add(rr.product_id);
    }
    for (const [k, v] of m.entries()) {
      productCountMap.set(k, v.size);
    }
  }

  const rows: AttributeRow[] = (attributes ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    description: a.description,
    attribute_type: a.attribute_type,
    is_filterable: a.is_filterable,
    show_in_card: a.show_in_card,
    sort_order: a.sort_order,
    is_active: a.is_active,
    products_count: productCountMap.get(a.id) ?? 0,
    options: ((a.options as Array<{ id: string; value: string; slug: string; sort_order: number | null }> | null) ?? [])
      .slice()
      .sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0))
      .map((o) => ({
        id: o.id,
        value: o.value,
        slug: o.slug,
        sort_order: o.sort_order ?? 0,
      })),
  }));

  return <AttributesList rows={rows} canDelete={canDelete} />;
}
