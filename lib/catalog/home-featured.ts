import { createClient } from "@/lib/supabase/server";
import {
  computeStockBadge,
  type PublicProductSummary,
} from "./types";

/**
 * Fila "Selección destacada" del Home — cascada de 3 niveles.
 *
 * Diseño (decisión Sprint 2 Sesión B):
 *   Nivel 1 · VENTAS REALES — cuando el catálogo ya tiene tracción, la fila
 *     se llena sola con lo más vendido (RPC home_top_selling_product_ids
 *     sobre order_items de pedidos pagados). Se activa SOLO si hay suficientes
 *     productos distintos vendidos para llenar la fila con dignidad
 *     (MIN_REAL_SELLERS), evitando el caso pobre "1 real + 5 rellenos".
 *   Nivel 2 · CURADOS — mientras no hay tracción, usa los productos marcados
 *     is_featured=true en el admin (curaduría humana). Es el estado actual
 *     pre-launch: 6 productos escogidos por correlación demanda-mercado.
 *   Nivel 3 · FALLBACK VARIADO — si por lo que sea no hay ni ventas ni
 *     destacados, una selección variada por categoría para no quedar vacío.
 *
 * En los tres niveles:
 *   - Retorna PublicProductSummary[] (mismo tipo que ProductCard espera).
 *   - Filtra productos sin imagen (regla de negocio del catálogo).
 *   - Stock es SEÑAL, no filtro duro (coherente con el quiz): un producto
 *     sin stock puede aparecer; el badge "Agotado" lo comunica en la tarjeta.
 *
 * La forma del SELECT y el mapeo rawToSummary se mantienen idénticos a
 * listing-queries.ts para coherencia total con la tienda.
 */

const SELECT_PRODUCT_SUMMARY = `id, slug, name, short_description, presentation, price_cop, compare_at_price_cop,
   stock, track_stock, created_at,
   category:categories!category_id(slug, name),
   laboratory:laboratories!laboratory_id(slug, name),
   images:product_images!product_id(url, alt_text, is_primary, sort_order)`;

/** Mínimo de productos distintos vendidos para activar el nivel 1. */
const MIN_REAL_SELLERS = 6;

export async function getFeaturedProducts(
  limit = 6,
): Promise<PublicProductSummary[]> {
  const supabase = await createClient();

  // ---- Nivel 1: ventas reales (se alimenta sola post-launch) ----
  // Tipamos el resultado localmente para no depender de que types.ts esté
  // regenerado con la firma de la RPC. Cast acotado y explícito.
  type TopSellerRow = { product_id: string; units_sold: number };
  const { data: topSellersRaw, error: rpcError } = await supabase.rpc(
    "home_top_selling_product_ids",
    { p_limit: limit, p_days: null },
  );
  const topSellers = (topSellersRaw ?? []) as unknown as TopSellerRow[];

  if (!rpcError && topSellers.length >= MIN_REAL_SELLERS) {
    const ids = topSellers.map((r) => r.product_id);
    const products = await fetchByIds(supabase, ids);
    // Conservar el orden de "más vendido" que trae la RPC
    const ordered = ids
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is PublicProductSummary => p != null);
    if (ordered.length >= limit) return ordered.slice(0, limit);
    // Si tras filtrar sin-imagen quedan pocos, completar con curados abajo
    const fill = await fetchCurated(supabase, limit, ordered.map((p) => p.id));
    return [...ordered, ...fill].slice(0, limit);
  }

  // ---- Nivel 2: curados (is_featured) — estado actual ----
  const curated = await fetchCurated(supabase, limit, []);
  if (curated.length >= limit) return curated.slice(0, limit);

  // ---- Nivel 3: fallback variado por categoría ----
  const excludeIds = curated.map((p) => p.id);
  const fallback = await fetchVariedFallback(supabase, limit - curated.length, excludeIds);
  return [...curated, ...fallback].slice(0, limit);
}

/** Lee productos destacados (is_featured), activos, recientes primero. */
async function fetchCurated(
  supabase: Awaited<ReturnType<typeof createClient>>,
  limit: number,
  excludeIds: string[],
): Promise<PublicProductSummary[]> {
  let query = supabase
    .from("products")
    .select(SELECT_PRODUCT_SUMMARY)
    .eq("status", "active")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit * 2); // margen para filtrar sin-imagen

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data } = await query;
  return mapRows(data).slice(0, limit);
}

/**
 * Fallback: selección variada tomando productos activos de distintas
 * categorías, para no repetir la misma categoría seguida. Ordena por
 * categoría y recencia, luego intercala.
 */
async function fetchVariedFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  needed: number,
  excludeIds: string[],
): Promise<PublicProductSummary[]> {
  if (needed <= 0) return [];

  let query = supabase
    .from("products")
    .select(SELECT_PRODUCT_SUMMARY)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60); // pool amplio para diversificar

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data } = await query;
  const pool = mapRows(data);

  // Intercalar por categoría: round-robin sobre grupos de categoría
  const byCategory = new Map<string, PublicProductSummary[]>();
  for (const p of pool) {
    const key = p.category?.slug ?? "_sin";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(p);
  }
  const groups = Array.from(byCategory.values());
  const interleaved: PublicProductSummary[] = [];
  let idx = 0;
  while (interleaved.length < needed && groups.some((g) => g.length > 0)) {
    const g = groups[idx % groups.length];
    if (g.length > 0) interleaved.push(g.shift()!);
    idx++;
  }
  return interleaved.slice(0, needed);
}

/** Lee productos por lista de IDs (para el nivel de ventas). */
async function fetchByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<PublicProductSummary[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("products")
    .select(SELECT_PRODUCT_SUMMARY)
    .eq("status", "active")
    .in("id", ids);
  return mapRows(data);
}

/* -------------------------------------------------------------------------- */
/*  Mapeo (idéntico al de listing-queries.ts para coherencia)                 */
/* -------------------------------------------------------------------------- */

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

function mapRows(data: unknown): PublicProductSummary[] {
  const rows = (data ?? []) as RawListRow[];
  return rows
    .map(rawToSummary)
    .filter((p): p is PublicProductSummary => p !== null);
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
