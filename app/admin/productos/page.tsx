import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin-auth";
import ProductsList, { type ProductRow, type FilterOptions } from "./_components/ProductsList";

const PAGE_SIZE = 50;

type SearchParams = {
  q?: string;
  status?: string;
  laboratory?: string;
  category?: string;
  presentation_type?: string;
  missing?: string; // "invima" | "images" | "category" | "tax"
  page?: string;
};

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await getAdminUser();
  const supabase = await createClient();
  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Query base
  let query = supabase
    .from("products")
    .select(
      `id, name, slug, sku, status, needs_review, price_cop, source_price_cop, stock,
       invima_number, presentation, presentation_type, content_value, content_unit,
       laboratory_id, category_id, tax_rate_id, is_featured, last_synced_at,
       laboratory:laboratories!laboratory_id(name, slug),
       category:categories!category_id(name),
       tax_rate:tax_rates!tax_rate_id(name, rate_percent),
       primary_image:product_images!product_id(url, is_primary)`,
      { count: "exact" },
    );

  if (params.q) {
    query = query.or(
      `name.ilike.%${params.q}%,invima_number.ilike.%${params.q}%,sku.ilike.%${params.q}%,slug.ilike.%${params.q}%`,
    );
  }
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.laboratory && params.laboratory !== "all") {
    query = query.eq("laboratory_id", params.laboratory);
  }
  if (params.category && params.category !== "all") {
    if (params.category === "none") {
      query = query.is("category_id", null);
    } else {
      query = query.eq("category_id", params.category);
    }
  }
  if (params.presentation_type && params.presentation_type !== "all") {
    query = query.eq("presentation_type", params.presentation_type);
  }
  if (params.missing === "invima") query = query.is("invima_number", null);
  if (params.missing === "category") query = query.is("category_id", null);

  query = query
    .order("status", { ascending: true })
    .order("name", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  const { data: productsRaw, count } = await query;

  // Filtro post-query para "missing images" (el query no soporta easy not exists)
  let filtered = productsRaw ?? [];
  if (params.missing === "images") {
    const ids = filtered.map((p: { id: string }) => p.id);
    if (ids.length > 0) {
      const { data: withImages } = await supabase
        .from("product_images")
        .select("product_id")
        .in("product_id", ids);
      const withImagesSet = new Set((withImages ?? []).map((r: { product_id: string }) => r.product_id));
      filtered = filtered.filter((p: { id: string }) => !withImagesSet.has(p.id));
    }
  }

  const products: ProductRow[] = filtered.map((p: {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    status: string;
    needs_review: boolean;
    price_cop: number;
    source_price_cop: number | null;
    stock: number;
    invima_number: string | null;
    presentation: string | null;
    presentation_type: string | null;
    content_value: number | null;
    content_unit: string | null;
    laboratory_id: string;
    category_id: string | null;
    tax_rate_id: string | null;
    is_featured: boolean;
    last_synced_at: string | null;
    laboratory: { name: string; slug: string } | { name: string; slug: string }[] | null;
    category: { name: string } | { name: string }[] | null;
    tax_rate: { name: string; rate_percent: number } | { name: string; rate_percent: number }[] | null;
    primary_image: Array<{ url: string; is_primary: boolean }> | null;
  }) => {
    const lab = Array.isArray(p.laboratory) ? p.laboratory[0] : p.laboratory;
    const cat = Array.isArray(p.category) ? p.category[0] : p.category;
    const tax = Array.isArray(p.tax_rate) ? p.tax_rate[0] : p.tax_rate;
    const images = Array.isArray(p.primary_image) ? p.primary_image : p.primary_image ? [p.primary_image] : [];
    const primary = images.find((i) => i.is_primary) ?? images[0];

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      status: p.status,
      needs_review: p.needs_review,
      price_cop: p.price_cop,
      source_price_cop: p.source_price_cop,
      stock: p.stock,
      invima_number: p.invima_number,
      presentation: p.presentation,
      presentation_type: p.presentation_type,
      content_value: p.content_value,
      content_unit: p.content_unit,
      is_featured: p.is_featured,
      laboratory_id: p.laboratory_id,
      laboratory_name: lab?.name ?? "—",
      category_id: p.category_id,
      category_name: cat?.name ?? null,
      tax_rate_id: p.tax_rate_id,
      tax_rate_name: tax?.name ?? null,
      tax_rate_percent: tax?.rate_percent ?? null,
      primary_image_url: primary?.url ?? null,
      image_count: images.length,
      last_synced_at: p.last_synced_at,
    };
  });

  // Filter options para los dropdowns
  const [{ data: labs }, { data: cats }, { data: taxes }] = await Promise.all([
    supabase.from("laboratories").select("id, name").eq("is_active", true).order("name"),
    supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("tax_rates").select("id, name, rate_percent").eq("is_active", true).order("sort_order"),
  ]);

  const filterOptions: FilterOptions = {
    laboratories: labs ?? [],
    categories: cats ?? [],
    tax_rates: taxes ?? [],
  };

  // Conteos por estado para los tabs
  const { data: statusCounts } = await supabase
    .from("products")
    .select("status");

  const counts = {
    all: statusCounts?.length ?? 0,
    draft: statusCounts?.filter((s: { status: string }) => s.status === "draft").length ?? 0,
    active: statusCounts?.filter((s: { status: string }) => s.status === "active").length ?? 0,
    archived: statusCounts?.filter((s: { status: string }) => s.status === "archived").length ?? 0,
  };

  return (
    <ProductsList
      products={products}
      filterOptions={filterOptions}
      counts={counts}
      currentParams={params}
      pagination={{
        page,
        page_size: PAGE_SIZE,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / PAGE_SIZE),
      }}
    />
  );
}
