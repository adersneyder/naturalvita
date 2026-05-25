/**
 * lib/quiz/save-result.ts
 *
 * Persiste un resultado del quiz para que sea reabrible vía /quiz/r/[slug].
 * Sprint 2 Sesión A.2.
 *
 * - Genera un slug corto (6 chars base62) único.
 * - Guarda snapshot de los productos recomendados.
 * - Vincula customer_id si el usuario estaba logueado.
 * - Devuelve el slug para construir la URL compartible.
 *
 * Usa admin client (service_role) porque la escritura está restringida
 * por RLS al service_role.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import type { MatchedProduct } from "@/lib/quiz/match-products";

const SLUG_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SLUG_LENGTH = 7;

function generateSlug(): string {
  let s = "";
  for (let i = 0; i < SLUG_LENGTH; i++) {
    s += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  }
  return s;
}

export interface SaveResultInput {
  etapa: string;
  objetivo: string;
  products: MatchedProduct[];
  customerId?: string | null;
  email?: string | null;
}

/**
 * Guarda el resultado y devuelve el slug. Si falla, devuelve null
 * (el quiz sigue funcionando, solo no habrá URL compartible).
 */
export async function saveQuizResult(
  input: SaveResultInput,
): Promise<string | null> {
  const supabase = createAdminClient();

  // Reintentar hasta 3 veces si hay colisión de slug (muy improbable)
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug();
    const { error } = await supabase.from("quiz_results").insert({
      slug,
      etapa: input.etapa,
      objetivo: input.objetivo,
      products: input.products as unknown as Json,
      customer_id: input.customerId ?? null,
      email: input.email ?? null,
    });

    if (!error) return slug;

    // 23505 = unique_violation (colisión de slug). Reintenta con otro.
    if (error.code !== "23505") {
      console.error("[quiz/save-result] Error:", error.message);
      return null;
    }
  }

  console.error("[quiz/save-result] No se pudo generar slug único tras 3 intentos");
  return null;
}

export interface StoredQuizResult {
  slug: string;
  etapa: string;
  objetivo: string;
  products: MatchedProduct[];
  createdAt: string;
}

/**
 * Lee un resultado por slug para la página /quiz/r/[slug].
 * Usa admin client para lectura consistente (la página es pública).
 */
export async function getQuizResult(
  slug: string,
): Promise<StoredQuizResult | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_results")
    .select("slug, etapa, objetivo, products, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;

  // Incrementar contador de vistas (no bloqueante)
  void supabase.rpc("increment_quiz_result_views", { result_slug: slug });

  return {
    slug: data.slug as string,
    etapa: data.etapa as string,
    objetivo: data.objetivo as string,
    products: data.products as unknown as MatchedProduct[],
    createdAt: data.created_at as string,
  };
}
