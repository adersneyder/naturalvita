/**
 * lib/quiz/match-products.ts
 *
 * Capa de matching de productos del Quiz-Hero.
 *
 * Sprint 2 Sesión A. Estrategia Camino C (matching IA en tiempo real):
 *
 *   1. PRE-FILTRO multi-señal (barato, sin IA):
 *      - FTS sobre search_vector vía RPC search_products (keywords etapa+objetivo)
 *      - Acotado por categorías relevantes de la etapa
 *      - Solo productos activos, con stock, sobre el mínimo del cupón
 *      - Boost a is_featured
 *      → devuelve 15-20 candidatos rankeados
 *
 *   2. RANKING IA (Haiku 4.5):
 *      - Manda candidatos (id, name, short_description, categoría, precio)
 *        + contexto del quiz a Haiku
 *      - Haiku elige los 3 mejores y da una razón corta por cada uno
 *
 *   3. CACHÉ 24h (quiz_match_cache):
 *      - Combinaciones idénticas etapa+objetivo reutilizan resultado
 *      - Ahorra tokens en repeticiones
 *
 * Cuando se agreguen tags a los productos, el pre-filtro mejora
 * automáticamente sin tocar el frontend ni el contrato de esta función.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import {
  getStage,
  getGoal,
  cacheKeyFor,
  type StageOption,
  type GoalOption,
} from "@/components/home/quiz-data";

const MATCH_MODEL = "claude-haiku-4-5-20251001";
const CANDIDATE_LIMIT = 18;
const RESULT_COUNT = 3;
const COUPON_MIN_ORDER_COP = 30000; // alineado con WELCOME10

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchedProduct {
  id: string;
  name: string;
  slug: string;
  priceCop: number;
  imageUrl: string | null;
  /** Razón generada por Haiku de por qué este producto encaja */
  reason: string;
}

export interface MatchResult {
  products: MatchedProduct[];
  /** true si vino del caché (no se gastó IA) */
  cached: boolean;
}

interface Candidate {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  category_name: string | null;
  price_cop: number;
  image_url: string | null;
  is_featured: boolean;
  fts_rank: number;
  has_stock: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Anthropic
// ─────────────────────────────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("[quiz/match] ANTHROPIC_API_KEY no configurada.");
  }
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve los 3 productos top para una combinación etapa+objetivo.
 * Usa caché 24h. El frontend solo necesita llamar esta función.
 */
export async function matchProducts(
  etapa: string,
  objetivo: string,
): Promise<MatchResult> {
  const stage = getStage(etapa);
  const goal = getGoal(objetivo);

  if (!stage || !goal) {
    return { products: [], cached: false };
  }

  const supabase = createAdminClient();
  const key = cacheKeyFor(etapa, objetivo);

  // ── 1. Intentar caché ──────────────────────────────────────────────
  const cached = await readCache(supabase, key);
  if (cached) {
    const products = await hydrateProducts(supabase, cached);
    if (products.length > 0) {
      return { products, cached: true };
    }
    // Si el caché tenía productos ya inválidos (sin stock, etc), recalcula.
  }

  // ── 2. Pre-filtro ──────────────────────────────────────────────────
  const candidates = await prefilter(supabase, stage, goal);
  if (candidates.length === 0) {
    return { products: [], cached: false };
  }

  // ── 3. Ranking IA ──────────────────────────────────────────────────
  let ranked: Array<{ product_id: string; reason: string }>;
  try {
    ranked = await rankWithHaiku(stage, goal, candidates);
  } catch (err) {
    console.error("[quiz/match] Haiku falló, usando fallback FTS:", err);
    // Fallback: top 3 por FTS rank sin IA
    ranked = candidates.slice(0, RESULT_COUNT).map((c) => ({
      product_id: c.id,
      reason: `Recomendado para ${goal.label.toLowerCase()}.`,
    }));
  }

  // ── 4. Guardar en caché ────────────────────────────────────────────
  await writeCache(supabase, key, etapa, objetivo, ranked);

  // ── 5. Hidratar y devolver ─────────────────────────────────────────
  const products = await hydrateProducts(supabase, ranked);
  return { products, cached: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Pre-filtro multi-señal
// ─────────────────────────────────────────────────────────────────────────────

async function prefilter(
  supabase: ReturnType<typeof createAdminClient>,
  stage: StageOption,
  goal: GoalOption,
): Promise<Candidate[]> {
  // Construir query FTS combinando keywords de etapa + objetivo.
  // search_products espera un texto; usamos las keywords más relevantes.
  const ftsQuery = [...goal.keywords, ...stage.keywords].slice(0, 8).join(" ");

  // 1a. FTS para obtener ids rankeados
  const { data: ftsRows, error: ftsError } = await supabase.rpc(
    "search_products",
    { q: ftsQuery, page_size: 40, page_offset: 0 },
  );

  const ftsIds: string[] = [];
  const ftsRankMap = new Map<string, number>();
  if (!ftsError && ftsRows) {
    for (const row of ftsRows as Array<{ id: string; rank: number }>) {
      ftsIds.push(row.id);
      ftsRankMap.set(row.id, row.rank);
    }
  }

  // 1b. Traer detalle de productos: combina los FTS hits con productos de
  //     las categorías relevantes de la etapa. Filtra activos, con stock,
  //     y sobre el mínimo del cupón.
  let query = supabase
    .from("products")
    .select(
      "id, name, slug, short_description, price_cop, is_featured, stock, track_stock, category_id, categories(name, slug), product_images(url, is_primary)",
    )
    .eq("is_active", true)
    .eq("status", "active")
    .gte("price_cop", COUPON_MIN_ORDER_COP)
    .limit(60);

  const { data: products, error: prodError } = await query;
  if (prodError || !products) {
    console.error("[quiz/match] Error en pre-filtro:", prodError?.message);
    return [];
  }

  // 1c. Scoring en memoria: combina señales
  const scored: Candidate[] = [];
  for (const p of products as Array<Record<string, unknown>>) {
    const id = p.id as string;
    const trackStock = p.track_stock as boolean;
    const stock = p.stock as number;

    // Stock NO es filtro duro aquí: el quiz es una herramienta de
    // descubrimiento, no el carrito. La validación real de inventario ocurre
    // en la ficha de producto y en el checkout. Usamos el stock como señal de
    // ranking (los productos disponibles suben), pero nunca vaciamos el
    // resultado por falta de stock — peor experiencia sería un Home que dice
    // "no hay nada". Cuando se cargue inventario real, los disponibles
    // escalan en el ranking automáticamente.
    const hasStock = !trackStock || stock > 0;

    const categoryRel = p.categories as { name: string; slug: string } | null;
    const categorySlug = categoryRel?.slug ?? "";
    const inRelevantCategory = stage.categorySlugs.includes(categorySlug);
    const ftsRank = ftsRankMap.get(id) ?? 0;
    const inFts = ftsRankMap.has(id);

    // Descartar productos que no matchean ni FTS ni categoría relevante
    if (!inFts && !inRelevantCategory) continue;

    const images = (p.product_images as Array<{ url: string; is_primary: boolean }>) ?? [];
    const primaryImage =
      images.find((img) => img.is_primary)?.url ?? images[0]?.url ?? null;

    scored.push({
      id,
      name: p.name as string,
      slug: p.slug as string,
      short_description: (p.short_description as string) ?? null,
      category_name: categoryRel?.name ?? null,
      price_cop: p.price_cop as number,
      image_url: primaryImage,
      is_featured: p.is_featured as boolean,
      fts_rank: ftsRank,
      has_stock: hasStock,
    });
  }

  // 1d. Ordenar por score compuesto: FTS rank (peso 3) + boost featured +
  //     boost stock. El stock no filtra, pero un producto disponible se
  //     prioriza sobre uno agotado cuando ambos son relevantes.
  scored.sort((a, b) => {
    const scoreA = a.fts_rank * 3 + (a.is_featured ? 1.5 : 0) + (a.has_stock ? 2 : 0);
    const scoreB = b.fts_rank * 3 + (b.is_featured ? 1.5 : 0) + (b.has_stock ? 2 : 0);
    return scoreB - scoreA;
  });

  return scored.slice(0, CANDIDATE_LIMIT);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Ranking con Haiku 4.5
// ─────────────────────────────────────────────────────────────────────────────

async function rankWithHaiku(
  stage: StageOption,
  goal: GoalOption,
  candidates: Candidate[],
): Promise<Array<{ product_id: string; reason: string }>> {
  const anthropic = getAnthropic();

  const productList = candidates
    .map(
      (c, i) =>
        `${i + 1}. [id: ${c.id}] ${c.name}${c.category_name ? ` (${c.category_name})` : ""}${c.short_description ? ` — ${c.short_description.slice(0, 120)}` : ""}`,
    )
    .join("\n");

  const systemPrompt = `Eres un asesor de bienestar de NaturalVita, tienda colombiana de suplementos y productos naturales. Tu trabajo es seleccionar los 3 productos más apropiados de una lista para una persona según su etapa de vida y objetivo de salud.

Reglas estrictas:
- NUNCA hagas afirmaciones médicas ni prometas curar enfermedades. Habla de "apoyar", "contribuir a", "acompañar".
- Las razones deben ser breves (máximo 12 palabras), cálidas y en español colombiano neutro.
- Si para bebés o embarazo algún producto no es claramente apropiado, NO lo recomiendes aunque esté en la lista.
- Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.

Formato de respuesta:
{"recommendations":[{"product_id":"<uuid>","reason":"<razón breve>"},...]}

Selecciona exactamente 3 productos (o menos si no hay suficientes apropiados).`;

  const userPrompt = `Persona: ${stage.label} (${stage.hint})
Objetivo: ${goal.label} (${goal.hint})

Productos disponibles:
${productList}

Selecciona los 3 mejores para esta persona y objetivo. Responde solo JSON.`;

  const response = await anthropic.messages.create({
    model: MATCH_MODEL,
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Extraer texto de la respuesta. El SDK tipa los content blocks como
  // un union discriminado; el filtro por type === "text" lo estrecha.
  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";

  // Parsear JSON (limpiar posibles fences)
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean) as {
    recommendations: Array<{ product_id: string; reason: string }>;
  };

  // Validar que los ids existan en candidates
  const validIds = new Set(candidates.map((c) => c.id));
  return parsed.recommendations
    .filter((r) => validIds.has(r.product_id))
    .slice(0, RESULT_COUNT);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Caché
// ─────────────────────────────────────────────────────────────────────────────

async function readCache(
  supabase: ReturnType<typeof createAdminClient>,
  key: string,
): Promise<Array<{ product_id: string; reason: string }> | null> {
  const { data, error } = await supabase
    .from("quiz_match_cache")
    .select("recommendations, expires_at")
    .eq("cache_key", key)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;

  // Incrementar hit_count de forma no bloqueante (telemetría de caché).
  // Leemos+escribimos por simplicidad; no es crítico si hay race condition.
  void (async () => {
    const { data: row } = await supabase
      .from("quiz_match_cache")
      .select("hit_count")
      .eq("cache_key", key)
      .maybeSingle();
    if (row) {
      await supabase
        .from("quiz_match_cache")
        .update({ hit_count: (row.hit_count as number) + 1 })
        .eq("cache_key", key);
    }
  })();

  return data.recommendations as unknown as Array<{ product_id: string; reason: string }>;
}

async function writeCache(
  supabase: ReturnType<typeof createAdminClient>,
  key: string,
  etapa: string,
  objetivo: string,
  recommendations: Array<{ product_id: string; reason: string }>,
): Promise<void> {
  const { error } = await supabase.from("quiz_match_cache").upsert(
    {
      cache_key: key,
      etapa,
      objetivo,
      recommendations: recommendations as unknown as Json,
      model: MATCH_MODEL,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "cache_key" },
  );

  if (error) {
    console.error("[quiz/match] Error guardando caché:", error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Hidratación (recommendations → MatchedProduct con datos frescos)
// ─────────────────────────────────────────────────────────────────────────────

async function hydrateProducts(
  supabase: ReturnType<typeof createAdminClient>,
  recommendations: Array<{ product_id: string; reason: string }>,
): Promise<MatchedProduct[]> {
  if (recommendations.length === 0) return [];

  const ids = recommendations.map((r) => r.product_id);
  const reasonMap = new Map(recommendations.map((r) => [r.product_id, r.reason]));

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, price_cop, stock, track_stock, is_active, status, product_images(url, is_primary)",
    )
    .in("id", ids)
    .eq("is_active", true)
    .eq("status", "active");

  if (error || !data) return [];

  const result: MatchedProduct[] = [];
  for (const p of data as Array<Record<string, unknown>>) {
    const id = p.id as string;
    // No filtramos por stock aquí (coherente con el pre-filtro): el quiz es
    // descubrimiento. La disponibilidad real se valida en ficha y checkout.

    const images = (p.product_images as Array<{ url: string; is_primary: boolean }>) ?? [];
    const primaryImage =
      images.find((img) => img.is_primary)?.url ?? images[0]?.url ?? null;

    result.push({
      id,
      name: p.name as string,
      slug: p.slug as string,
      priceCop: p.price_cop as number,
      imageUrl: primaryImage,
      reason: reasonMap.get(id) ?? "",
    });
  }

  // Preservar el orden del ranking
  result.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  return result;
}
