import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/admin-auth";
import CategoriesList, {
  type CategoryRow,
  type TaxRateOption,
} from "./_components/CategoriesList";

export default async function CategoriasPage() {
  const adminUser = await getAdminUser();
  const supabase = await createClient();

  // Traer categorías con join a parent + tarifa sugerida + conteo de productos
  const { data: categoriesRaw } = await supabase
    .from("categories")
    .select(
      `id, name, slug, description, parent_id, suggested_tax_rate_id, sort_order, is_active,
       parent:categories!parent_id(name),
       tax_rate:tax_rates!suggested_tax_rate_id(name)`,
    )
    .order("sort_order", { ascending: true });

  // Contar productos por categoría
  const { data: productCounts } = await supabase
    .from("products")
    .select("category_id")
    .neq("status", "archived");

  const countByCategory = new Map<string, number>();
  (productCounts ?? []).forEach((row: { category_id: string | null }) => {
    if (!row.category_id) return;
    countByCategory.set(row.category_id, (countByCategory.get(row.category_id) ?? 0) + 1);
  });

  const categories: CategoryRow[] = (categoriesRaw ?? []).map((c: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parent_id: string | null;
    suggested_tax_rate_id: string | null;
    sort_order: number;
    is_active: boolean;
    parent: { name: string } | { name: string }[] | null;
    tax_rate: { name: string } | { name: string }[] | null;
  }) => {
    const parent = Array.isArray(c.parent) ? c.parent[0] : c.parent;
    const taxRate = Array.isArray(c.tax_rate) ? c.tax_rate[0] : c.tax_rate;
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      parent_id: c.parent_id,
      parent_name: parent?.name ?? null,
      suggested_tax_rate_id: c.suggested_tax_rate_id,
      suggested_tax_rate_name: taxRate?.name ?? null,
      sort_order: c.sort_order,
      is_active: c.is_active,
      product_count: countByCategory.get(c.id) ?? 0,
    };
  });

  // Traer tarifas IVA activas
  const { data: taxRatesRaw } = await supabase
    .from("tax_rates")
    .select("id, code, name")
    .eq("is_active", true)
    .order("sort_order");

  const taxRates: TaxRateOption[] = taxRatesRaw ?? [];

  const canDelete = hasRole(adminUser.role, ["owner", "admin"]);

  return <CategoriesList categories={categories} taxRates={taxRates} canDelete={canDelete} />;
}
