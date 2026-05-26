// lib/quiz/queries.ts
// Capa de lectura del motor de recomendaciones del quiz.
// Se ejecuta en el servidor (server components / server actions).
// Lee el mapa pre-computado en quiz_recommendations y aplica el umbral
// acordado: máx 2 directas + máx 1 coadyuvante (score >= 45), tope 3,
// con desempate por reseñas -> novedad -> id. Disponibilidad = is_active.

import { createServerClient } from "@/lib/supabase/server";
import {
  type QuizNeed,
  type QuizResult,
  type QuizRecommendedProduct,
  type LifeStage,
  QUIZ_THRESHOLD,
} from "./types";

/** Lista las necesidades activas para pintar el primer paso del quiz. */
export async function getActiveNeeds(): Promise<QuizNeed[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quiz_needs")
    .select("slug,name,tagline,description,icon")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("getActiveNeeds:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Fila cruda que devuelve la función RPC resolve_quiz (ver migración).
 * Hacemos el ranking y el umbral en SQL para que sea una sola llamada
 * eficiente y el desempate sea determinista.
 */
interface RawRecoRow {
  product_id: string;
  name: string;
  slug: string;
  price_cop: number | null;
  image_url: string | null;
  tier: "direct" | "adjuvant";
  score: number;
  reason: string | null;
  average_rating: number | null;
  review_count: number;
}

/**
 * Resuelve el quiz para una necesidad y una etapa.
 * Llama a la función SQL resolve_quiz, que aplica filtros y ranking,
 * y aquí terminamos de aplicar el tope de tiers del umbral.
 */
export async function resolveQuiz(
  needSlug: string,
  stage: LifeStage,
): Promise<QuizResult | null> {
  const supabase = createServerClient();

  // Necesidad (para el encabezado del resultado)
  const { data: need, error: needErr } = await supabase
    .from("quiz_needs")
    .select("slug,name,tagline,description,icon")
    .eq("slug", needSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (needErr || !need) {
    console.error("resolveQuiz need:", needErr?.message);
    return null;
  }

  // Recomendaciones rankeadas desde la función SQL (ver migración resolve_quiz)
  const { data: rows, error } = await supabase.rpc("resolve_quiz", {
    p_need_slug: needSlug,
    p_stage: stage,
    p_min_adjuvant_score: QUIZ_THRESHOLD.minAdjuvantScore,
  });
  if (error) {
    console.error("resolveQuiz rpc:", error.message);
    return null;
  }

  const raw = (rows ?? []) as RawRecoRow[];

  // Aplicar tope de tiers: máx 2 directas + máx 1 coadyuvante, tope total 3.
  const directs = raw.filter((r) => r.tier === "direct").slice(0, QUIZ_THRESHOLD.maxDirect);
  const adjuvants = raw
    .filter((r) => r.tier === "adjuvant")
    .slice(0, QUIZ_THRESHOLD.maxAdjuvant);
  const chosen = [...directs, ...adjuvants].slice(0, QUIZ_THRESHOLD.maxTotal);

  const products: QuizRecommendedProduct[] = chosen.map((r) => ({
    productId: r.product_id,
    name: r.name,
    slug: r.slug,
    imageUrl: r.image_url,
    price: r.price_cop,
    currency: "COP",
    tier: r.tier,
    score: r.score,
    reason: r.reason,
    averageRating: r.average_rating,
    reviewCount: r.review_count,
  }));

  return {
    need,
    stage,
    products,
    isEmpty: products.length === 0,
  };
}
