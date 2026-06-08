import { createClient } from "@/lib/supabase/server";
import {
  computeStockBadge,
  type PublicProductSummary,
} from "./types";

/**
 * Fila "Selección destacada" del Home — cascada de prioridad.
 *
 * La lógica de cascada vive en la función SQL `get_home_featured`
 * (Supabase), que ordena en un solo paso eficiente:
 *
 *   Nivel 1 · CURADOS (is_featured=true) — tu vitrina editorial, SIEMPRE
 *     primero. Es tu decisión sobre qué mostrar, no se subordina a ventas.
 *   Nivel 2 · MÁS VENDIDOS (últimos 60 días, pedidos pagados) — rellena
 *     los espacios libres con señal real de demanda. Se activa solo cuando
 *     hay ventas; pre-launch no aporta y no estorba.
 *   Nivel 3 · MEJOR CALIFICADOS (rating con reseñas) — siguiente relleno.
 *   Nivel 4 · NOVEDADES (created_at reciente) — relleno final para no
 *     dejar la fila vacía nunca.
 *
 * Un producto nunca se repite: aparece en su nivel más alto. La función
 * devuelve ya ordenado y deduplicado; aquí solo hidratamos el detalle
 * (imágenes, laboratorio, badges) para construir PublicProductSummary,
 * conservando el orden que entrega la RPC.
 *
 * Stock es SEÑAL, no filtro duro (coherente con el quiz y la tienda):
 * un producto sin stock puede aparecer; el badge "Agotado" lo comunica.
 * Filtra productos sin imagen (regla de negocio del catálogo).
 */

const SELECT_PRODUCT_SUMMARY = `id, slug, name, short_description, presentation, presentation_type, price_cop, compare_at_price_cop,
   stock, track_stock, created_at,
   category:categories!category_id(slug, name),
   laboratory:laboratories!laboratory_id(slug, name),
   images:product_images!product_id(url, alt_text, is_primary, sort_order)`;

export async function getFeaturedProducts(
  limit = 6,
): Promise<PublicProductSummary[]> {
  const supabase = await createClient();

  // La función SQL devuelve los product_id ya ordenados por la cascada
  // (curado -> más vendido -> mejor calificado -> novedad). Pedimos un
  // margen extra porque luego filtramos productos sin imagen.
  type FeaturedRow = { product_id: string };
  const { data: ranked, error } = await supabase.rpc("get_home_featured", {
    p_limit: limit * 3,
  });

  // Fallback defensivo: si la RPC fallara por lo que sea, caemos a
  // is_featured directo para no dejar el Home sin fila.
  if (error || !ranked) {
    return fetchCuratedFallback(supabase, limit);
  }

  const orderedIds = ((ranked ?? []) as unknown as FeaturedRow[]).map(
    (r) => r.product_id,
  );
  if (orderedIds.length === 0) {
    return fetchCuratedFallback(supabase, limit);
  }

  // Hidratar el detalle completo de esos productos.
  const products = await fetchByIds(supabase, orderedIds);

  // Conservar el orden exacto de la cascada (la RPC ya lo definió) y
  // filtrar los que se cayeron por no tener imagen.
  const ordered = orderedIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is PublicProductSummary => p != null);

  return ordered.slice(0, limit);
}

/** Lee productos por lista de IDs, conservando solo activos. */
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

/**
 * Fallback directo a is_featured si la RPC no respondiera. Garantiza que
 * el Home nunca quede sin fila aunque haya un problema con la función.
 */
async function fetchCuratedFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  limit: number,
): Promise<PublicProductSummary[]> {
  const { data } = await supabase
    .from("products")
    .select(SELECT_PRODUCT_SUMMARY)
    .eq("status", "active")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit * 2);
  return mapRows(data).slice(0, limit);
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
  presentation_type: string | null;
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
    presentation_type: row.presentation_type,
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
