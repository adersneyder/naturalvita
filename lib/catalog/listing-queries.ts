import { createClient } from "@/lib/supabase/server";
import { computeStockBadge, type PublicProductSummary } from "./types";

/**
 * Filtros aceptados por el catálogo público.
 * Todos opcionales. La página los recibe desde nuqs (URL como source-of-truth).
 */
export type CatalogFilters = {
  /** Slug de categoría: incluye la categoría y todas sus descendientes. */
  categorySlug?: string | null;
  /** Slugs de colección a intersectar (producto debe estar en TODAS). */
  collectionSlugs?: string[];
  /** Slugs de laboratorio (OR: producto en CUALQUIERA). */
  laboratorySlugs?: string[];
  /** Slugs de opción de atributo (producto debe tener TODOS). */
  attributeOptionSlugs?: string[];
  /** Rango de precio público en COP (incluye IVA si aplica). */
  priceMin?: number | null;
  priceMax?: number | null;
  /** Solo productos con stock disponible. */
  inStockOnly?: boolean;
  /** Búsqueda full-text sobre name + short_description. */
  q?: string | null;
};

export type CatalogSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "name_asc";

export type CatalogPagination = {
  page: number;
  pageSize: number;
};

export type CatalogPageResult = {
  products: PublicProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Listado paginado de productos públicos con filtros.
 *
 * Estrategia:
 *   1. Resolver IDs de los slugs (categoría + descendientes, colecciones, labs,
 *      opciones de atributo) en queries auxiliares pequeñas.
 *   2. Construir la query principal a `products` aplicando todos los filtros
 *      en una sola pasada con joins implícitos a `product_collections`,
 *      `product_attribute_values` e `images`.
 *   3. Filtrar en aplicación los productos sin imagen (regla de negocio:
 *      sin imagen no se publica al público).
 *
 * Performance:
 *   - Usamos `count: "exact"` con `head: false` en la query principal para
 *     obtener total y filas en una sola llamada.
 *   - Limitamos page_size a 60 como techo para evitar abuso.
 */
export async function listProducts(
  filters: CatalogFilters,
  sort: CatalogSort,
  pagination: CatalogPagination,
): Promise<CatalogPageResult> {
  const supabase = await createClient();
  const pageSize = Math.min(Math.max(pagination.pageSize, 1), 60);
  const page = Math.max(pagination.page, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // --- 1. Resolver IDs de relaciones a partir de slugs ---

  // Categoría + descendientes (jerarquía simple de un nivel; si más niveles, recursivo)
  let categoryIds: string[] | null = null;
  if (filters.categorySlug) {
    const { data: rootCat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categorySlug)
      .maybeSingle();

    if (rootCat) {
      const { data: descendants } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", rootCat.id);
      categoryIds = [rootCat.id, ...(descendants ?? []).map((c) => c.id)];
    } else {
      categoryIds = []; // categoría inexistente → no devolver nada
    }
  }

  // Laboratorios
  let laboratoryIds: string[] | null = null;
  if (filters.laboratorySlugs && filters.laboratorySlugs.length > 0) {
    const { data } = await supabase
      .from("laboratories")
      .select("id")
      .in("slug", filters.laboratorySlugs);
    laboratoryIds = (data ?? []).map((l) => l.id);
    if (laboratoryIds.length === 0) return emptyPage(page, pageSize);
  }

  // Colecciones: necesitamos product_ids que estén en TODAS las colecciones.
  // Para "todas" usamos N consultas y hacemos intersección. Para Sesión B
  // simplificamos: si llegan colecciones, productos en CUALQUIERA (OR).
  // Esto es lo más común en e-commerce y evita ediciones complejas en SQL.
  let collectionProductIds: string[] | null = null;
  if (filters.collectionSlugs && filters.collectionSlugs.length > 0) {
    const { data: cols } = await supabase
      .from("collections")
      .select("id")
      .in("slug", filters.collectionSlugs)
      .eq("is_active", true);
    const collectionIds = (cols ?? []).map((c) => c.id);
    if (collectionIds.length === 0) return emptyPage(page, pageSize);

    const { data: pcs } = await supabase
      .from("product_collections")
      .select("product_id")
      .in("collection_id", collectionIds);
    collectionProductIds = Array.from(
      new Set((pcs ?? []).map((p) => p.product_id)),
    );
    if (collectionProductIds.length === 0) return emptyPage(page, pageSize);
  }

  // Atributos: producto debe tener TODAS las options seleccionadas.
  // Esto es exigente: agrupamos por attribute y dentro del mismo attribute es OR,
  // entre attributes es AND. Para Sesión B simplificamos a AND plano por option.
  let attributeProductIds: string[] | null = null;
  if (
    filters.attributeOptionSlugs &&
    filters.attributeOptionSlugs.length > 0
  ) {
    const { data: opts } = await supabase
      .from("product_attribute_options")
      .select("id")
      .in("slug", filters.attributeOptionSlugs);
    const optionIds = (opts ?? []).map((o) => o.id);
    if (optionIds.length === 0) return emptyPage(page, pageSize);

    // Productos que tienen al MENOS una de las options. Para "todas" haríamos
    // un GROUP BY product_id HAVING count = N en una RPC; aquí lo dejamos en OR
    // y refinamos en hito futuro si hace falta.
    const { data: pavs } = await supabase
      .from("product_attribute_values")
      .select("product_id")
      .in("option_id", optionIds);
    attributeProductIds = Array.from(
      new Set((pavs ?? []).map((p) => p.product_id)),
    );
    if (attributeProductIds.length === 0) return emptyPage(page, pageSize);
  }

  // Intersectar product_ids restrictivos
  let restrictiveProductIds: string[] | null = null;
  if (collectionProductIds !== null && attributeProductIds !== null) {
    const set = new Set(attributeProductIds);
    restrictiveProductIds = collectionProductIds.filter((id) => set.has(id));
    if (restrictiveProductIds.length === 0)
      return emptyPage(page, pageSize);
  } else if (collectionProductIds !== null) {
    restrictiveProductIds = collectionProductIds;
  } else if (attributeProductIds !== null) {
    restrictiveProductIds = attributeProductIds;
  }

  // --- 2. Query principal con count exacto + filas paginadas ---

  let query = supabase
    .from("products")
    .select(
      `id, slug, name, short_description, presentation, price_cop, compare_at_price_cop,
       stock, track_stock, created_at,
       category:categories!category_id(slug, name),
       laboratory:laboratories!laboratory_id(slug, name),
       images:product_images!product_id(url, alt_text, is_primary, sort_order)`,
      { count: "exact" },
    )
    .eq("status", "active");

  if (categoryIds !== null) {
    if (categoryIds.length === 0) return emptyPage(page, pageSize);
    query = query.in("category_id", categoryIds);
  }
  if (laboratoryIds !== null) {
    query = query.in("laboratory_id", laboratoryIds);
  }
  if (restrictiveProductIds !== null) {
    query = query.in("id", restrictiveProductIds);
  }
  if (filters.priceMin != null) query = query.gte("price_cop", filters.priceMin);
  if (filters.priceMax != null) query = query.lte("price_cop", filters.priceMax);
  if (filters.inStockOnly) {
    // Disponible = !track_stock OR stock > 0. En PostgREST: track_stock.eq.false,stock.gt.0 con or().
    query = query.or("track_stock.eq.false,stock.gt.0");
  }
  if (filters.q && filters.q.trim()) {
    // Búsqueda full-text sobre `search_vector` (columna generada con pesos
    // A=name, B=short_description, C=presentation/keywords, D=full_description).
    // Soporta operadores web ("frase", -negar, OR explícito) gracias a
    // `websearch_to_tsquery('spanish', ...)`.
    query = query.textSearch("search_vector", filters.q.trim(), {
      type: "websearch",
      config: "spanish",
    });
  }

  // Ordenamiento
  switch (sort) {
    case "price_asc":
      query = query.order("price_cop", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price_cop", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "name_asc":
      query = query.order("name", { ascending: true });
      break;
    case "relevance":
    default:
      // Heurística: destacados primero, luego más recientes
      query = query
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
  }

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error("[listProducts] error:", error.message, error.code);
    return emptyPage(page, pageSize);
  }

  const products = (data ?? [])
    .map(rawToSummary)
    .filter((p): p is PublicProductSummary => p !== null);

  const total = count ?? products.length;
  return {
    products,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function emptyPage(page: number, pageSize: number): CatalogPageResult {
  return { products: [], total: 0, page, pageSize, totalPages: 1 };
}

type RawListRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  presentation: string | null;
  price_cop: number;
  compare_at_price_cop: number | null;
  stock: number;
  track_stock: boolean;
  created_at: string;
  category:
    | { slug: string; name: string }
    | Array<{ slug: string; name: string }>
    | null;
  laboratory:
    | { slug: string; name: string }
    | Array<{ slug: string; name: string }>;
  images: Array<{
    url: string;
    alt_text: string | null;
    is_primary: boolean;
    sort_order: number | null;
  }> | null;
};

function unwrap<T>(rel: T | T[] | null): T | null {
  if (rel === null || rel === undefined) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function rawToSummary(row: RawListRow): PublicProductSummary | null {
  const images = row.images ?? [];
  if (images.length === 0) return null;

  const sorted = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order ?? 999) - (b.sort_order ?? 999);
  });
  const primary = sorted[0];

  const lab = unwrap(row.laboratory);
  if (!lab) return null;
  const cat = unwrap(row.category);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    short_description: row.short_description,
    presentation: row.presentation,
    price_cop: row.price_cop,
    compare_at_price_cop: row.compare_at_price_cop,
    stock_badge: computeStockBadge(row.stock, row.track_stock),
    primary_image: {
      url: primary.url,
      alt: primary.alt_text,
      is_primary: true,
    },
    category: cat,
    laboratory: lab,
  };
}

// ---------- Resolvers de slug a entidad (para hero y breadcrumbs) ----------

export type CategoryWithChildren = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  children: Array<{ slug: string; name: string }>;
};

export async function getCategoryBySlug(
  slug: string,
): Promise<CategoryWithChildren | null> {
  const supabase = await createClient();
  const { data: cat } = await supabase
    .from("categories")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!cat) return null;

  const { data: children } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("parent_id", cat.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return {
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    description: cat.description,
    children: children ?? [],
  };
}

export type CollectionDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

export async function getCollectionBySlug(
  slug: string,
): Promise<CollectionDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select(
      "id, slug, name, description, cover_image_url, meta_title, meta_description",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export type LaboratoryDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
};

export async function getLaboratoryBySlug(
  slug: string,
): Promise<LaboratoryDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("laboratories")
    .select("id, slug, name, description, logo_url, website_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

// ---------- Filtros disponibles para el sidebar ----------

export type FilterableAttribute = {
  slug: string;
  name: string;
  type: "boolean" | "select" | "multi_select";
  options: Array<{ slug: string; value: string }>;
};

export async function listFilterableAttributes(): Promise<FilterableAttribute[]> {
  const supabase = await createClient();
  const { data: attrs } = await supabase
    .from("product_attributes")
    .select(
      `id, slug, name, attribute_type,
       options:product_attribute_options!attribute_id(slug, value, sort_order)`,
    )
    .eq("is_filterable", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (attrs ?? []).map((a) => ({
    slug: a.slug,
    name: a.name,
    type: a.attribute_type as "boolean" | "select" | "multi_select",
    options: ((a.options ?? []) as Array<{
      slug: string;
      value: string;
      sort_order: number | null;
    }>)
      .slice()
      .sort((x, y) => (x.sort_order ?? 999) - (y.sort_order ?? 999))
      .map((o) => ({ slug: o.slug, value: o.value })),
  }));
}

export async function listActiveLaboratories(): Promise<
  Array<{ slug: string; name: string }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("laboratories")
    .select("slug, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  return data ?? [];
}

export async function listActiveCategoriesTree(): Promise<
  Array<{ slug: string; name: string; children: Array<{ slug: string; name: string }> }>
> {
  const supabase = await createClient();
  const { data: roots } = await supabase
    .from("categories")
    .select("id, slug, name")
    .is("parent_id", null)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!roots) return [];

  const all: Array<{
    slug: string;
    name: string;
    children: Array<{ slug: string; name: string }>;
  }> = [];

  for (const r of roots) {
    const { data: children } = await supabase
      .from("categories")
      .select("slug, name")
      .eq("parent_id", r.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    all.push({
      slug: r.slug,
      name: r.name,
      children: children ?? [],
    });
  }

  return all;
}

export async function listActiveCollections(): Promise<
  Array<{ slug: string; name: string; is_featured: boolean }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select("slug, name, is_featured")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getPriceRange(): Promise<{ min: number; max: number }> {
  const supabase = await createClient();
  const { data: minRow } = await supabase
    .from("products")
    .select("price_cop")
    .eq("status", "active")
    .order("price_cop", { ascending: true })
    .limit(1)
    .maybeSingle();
  const { data: maxRow } = await supabase
    .from("products")
    .select("price_cop")
    .eq("status", "active")
    .order("price_cop", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    min: minRow?.price_cop ?? 0,
    max: maxRow?.price_cop ?? 1000000,
  };
}

// ---------- Landing /tienda enriquecida ----------

export type FeaturedCollection = {
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
};

export async function listFeaturedCollections(
  limit = 4,
): Promise<FeaturedCollection[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select("slug, name, description, cover_image_url, sort_order")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
  return (data ?? []).map(({ slug, name, description, cover_image_url }) => ({
    slug,
    name,
    description,
    cover_image_url,
  }));
}

/**
 * Productos destacados del catálogo (is_featured=true). Para el carrusel
 * de la landing /tienda. Usa la misma forma de PublicProductSummary para
 * que la grilla los renderice sin código duplicado.
 */
export async function listFeaturedProducts(
  limit = 8,
): Promise<PublicProductSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      `id, slug, name, short_description, presentation, price_cop, compare_at_price_cop,
       stock, track_stock, created_at,
       category:categories!category_id(slug, name),
       laboratory:laboratories!laboratory_id(slug, name),
       images:product_images!product_id(url, alt_text, is_primary, sort_order)`,
    )
    .eq("status", "active")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit * 2); // pedimos margen para filtrar los sin imagen

  return (data ?? [])
    .map(rawToSummary)
    .filter((p): p is PublicProductSummary => p !== null)
    .slice(0, limit);
}

// ---------- Sitemap helpers ----------

/**
 * Slugs activos de cada entidad pública. Se consume desde app/sitemap.ts.
 * Los productos sin imagen quedan fuera del sitemap (regla de negocio:
 * sin imagen no se publica). Resto de entidades incluyen todas las activas.
 */
export async function listSitemapEntries(): Promise<{
  products: Array<{ slug: string; updated_at: string }>;
  categories: Array<{ slug: string; updated_at: string }>;
  collections: Array<{ slug: string; updated_at: string }>;
  laboratories: Array<{ slug: string; updated_at: string }>;
}> {
  const supabase = await createClient();

  const [
    { data: rawProducts },
    { data: cats },
    { data: cols },
    { data: labs },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("slug, updated_at, images:product_images!product_id(id)")
      .eq("status", "active"),
    supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true),
    supabase
      .from("collections")
      .select("slug, updated_at")
      .eq("is_active", true),
    supabase
      .from("laboratories")
      .select("slug, updated_at")
      .eq("is_active", true),
  ]);

  const products = (rawProducts ?? [])
    .filter((p) => {
      const imgs = (p.images ?? []) as Array<unknown>;
      return imgs.length > 0;
    })
    .map((p) => ({ slug: p.slug, updated_at: p.updated_at }));

  return {
    products,
    categories: cats ?? [],
    collections: cols ?? [],
    laboratories: labs ?? [],
  };
}
