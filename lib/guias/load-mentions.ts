/**
 * lib/guias/load-mentions.ts
 *
 * Carga los productos del catálogo citados en una guía editorial.
 * Los artículos declaran qué productos quieren citar (por slug) y POR QUÉ
 * (justificación editorial), y este helper resuelve los datos vivos
 * (precio, imagen, lab, presentación) en el momento del render.
 *
 * Si un producto cambia de precio, se queda sin stock o se desactiva, la
 * guía se mantiene consistente automáticamente sin tocar el código.
 */

import { createClient } from "@/lib/supabase/server";
import { formatPresentation } from "@/lib/catalog/presentation";
import type { ArticleProductMention } from "@/app/(public)/guias/_components/ArticleLayout";

export type MentionInput = {
  slug: string;
  /** Por qué se cita este producto en el artículo. */
  whyMentioned: string;
};

type ProductRow = {
  slug: string;
  name: string;
  presentation: string | null;
  presentation_type: string | null;
  price_cop: number;
  laboratory: { name: string } | { name: string }[] | null;
  images:
    | Array<{
        url: string;
        alt_text: string | null;
        is_primary: boolean;
        sort_order: number | null;
      }>
    | null;
};

export async function loadMentions(
  inputs: MentionInput[],
): Promise<ArticleProductMention[]> {
  if (inputs.length === 0) return [];

  const supabase = await createClient();
  const slugs = inputs.map((i) => i.slug);
  const { data } = await supabase
    .from("products")
    .select(
      `slug, name, presentation, presentation_type, price_cop,
       laboratory:laboratories!laboratory_id(name),
       images:product_images!product_id(url, alt_text, is_primary, sort_order)`,
    )
    .in("slug", slugs)
    .eq("status", "active");

  const rows = (data ?? []) as unknown as ProductRow[];
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  // Mantiene el orden declarado por el artículo (no el de Supabase).
  return inputs.flatMap((input) => {
    const row = bySlug.get(input.slug);
    if (!row) return [];

    const images = row.images ?? [];
    const primary =
      images.find((i) => i.is_primary) ??
      [...images].sort(
        (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999),
      )[0];

    const lab = Array.isArray(row.laboratory) ? row.laboratory[0] : row.laboratory;

    const m: ArticleProductMention = {
      slug: row.slug,
      name: row.name,
      presentation:
        formatPresentation(row.presentation, row.presentation_type) ?? null,
      laboratory: lab?.name ?? "—",
      priceCop: row.price_cop,
      imageUrl: primary?.url ?? null,
      imageAlt: primary?.alt_text ?? null,
      whyMentioned: input.whyMentioned,
    };
    return [m];
  });
}
