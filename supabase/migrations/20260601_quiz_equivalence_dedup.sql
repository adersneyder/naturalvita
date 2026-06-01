-- ============================================================
-- Quiz IA — Deduplicación por grupo de equivalencia
-- ============================================================
-- YA APLICADO en Supabase (qheynvhdjdnqywyaekpq) vía MCP el 2026-06-01.
-- Este archivo queda en el repo SOLO para versión/historial. No es
-- necesario re-ejecutarlo; refleja el estado real de la base.
--
-- Qué hace:
--  1. Añade products.equivalence_group (slug del grupo de sustitutos).
--  2. Reescribe resolve_quiz para que en cada resultado del quiz no
--     aparezcan dos productos del mismo grupo (sustitutos). Conserva
--     el de mayor pertinencia. Productos de distinta vía de consumo
--     (cápsula vs crema) van en grupos distintos y pueden convivir
--     como formulación complementaria.
--
-- Regla de equivalencia (definida con negocio):
--   Dos productos son equivalentes (solo se muestra el mejor) si
--   coinciden en: principio activo + vía de consumo + composición
--   sustancialmente igual. Si difieren en cualquiera —sobre todo la
--   vía— son distintos y pueden mostrarse juntos.
-- ============================================================

-- 1) Columna de grupo de equivalencia
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS equivalence_group text;

COMMENT ON COLUMN public.products.equivalence_group IS
  'Slug del grupo de sustitutos (principio activo + vía de consumo + composición). El quiz muestra solo el mejor rankeado de cada grupo. NULL = sin equivalentes. Lo asigna la Edge Function quiz-reco-sync al clasificar.';

CREATE INDEX IF NOT EXISTS idx_products_equivalence_group
  ON public.products (equivalence_group)
  WHERE equivalence_group IS NOT NULL;

-- 2) resolve_quiz con deduplicación por grupo
CREATE OR REPLACE FUNCTION public.resolve_quiz(
  p_need_slug text,
  p_stage text,
  p_min_adjuvant_score integer DEFAULT 45
)
RETURNS TABLE (
  product_id uuid,
  name text,
  slug text,
  price_cop integer,
  image_url text,
  tier text,
  score integer,
  reason text,
  average_rating numeric,
  review_count integer,
  rnk bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      p.id AS product_id,
      p.name,
      p.slug,
      p.price_cop,
      (SELECT pi.url FROM public.product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.sort_order ASC NULLS LAST
        LIMIT 1) AS image_url,
      r.relevance_tier AS tier,
      r.score,
      r.reason,
      rs.average_rating,
      coalesce(rs.review_count, 0) AS review_count,
      p.equivalence_group,
      ROW_NUMBER() OVER (
        ORDER BY
          (r.relevance_tier = 'direct') DESC,
          r.score DESC,
          coalesce(rs.average_rating, 0) DESC,
          coalesce(rs.review_count, 0) DESC,
          p.created_at DESC,
          p.id
      ) AS global_order
    FROM public.quiz_recommendations r
    JOIN public.quiz_needs nq ON nq.id = r.need_id AND nq.slug = p_need_slug AND nq.is_active = true
    JOIN public.products p ON p.id = r.product_id AND p.is_active = true AND p.status = 'active'
    LEFT JOIN public.product_review_stats rs ON rs.product_id = p.id
    WHERE r.review_status = 'approved'
      AND p_stage = ANY(r.suitable_stages)
      AND (r.relevance_tier = 'direct'
           OR (r.relevance_tier = 'adjuvant' AND r.score >= p_min_adjuvant_score))
  ),
  dedup AS (
    -- Un solo producto por grupo de equivalencia (el más pertinente).
    -- Grupos NULL se tratan como únicos (su propio product_id como grupo).
    SELECT *,
      ROW_NUMBER() OVER (
        PARTITION BY coalesce(equivalence_group, product_id::text)
        ORDER BY global_order
      ) AS dup_rank
    FROM ranked
  ),
  filtrado AS (
    SELECT *,
      ROW_NUMBER() OVER (
        PARTITION BY tier
        ORDER BY global_order
      ) AS rnk
    FROM dedup
    WHERE dup_rank = 1
  )
  SELECT product_id, name, slug, price_cop, image_url, tier, score, reason,
         average_rating, review_count, rnk
  FROM filtrado
  WHERE (tier = 'direct' AND rnk <= 2)
     OR (tier = 'adjuvant' AND rnk <= 1)
  ORDER BY (tier = 'direct') DESC, score DESC;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_quiz(text, text, integer) TO anon, authenticated;
