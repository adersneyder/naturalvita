/**
 * lib/guias/db.ts
 *
 * Capa de datos para guías editoriales respaldadas en BD (las creadas
 * desde el generador admin). Las 5 guías fundacionales viven como rutas
 * TSX estáticas y se listan vía lib/guias/registry.ts; estas dos fuentes
 * se fusionan en el índice /guias y en el sitemap.
 */

import { createClient } from "@/lib/supabase/server";

export type GuideSection = {
  id: string;
  heading: string;
  body_md: string;
};

export type GuideFaq = { q: string; a: string };

export type GuideMention = { slug: string; why: string };

export type DbGuide = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  tldr: string;
  reading_time: string;
  hero_image_url: string;
  hero_image_alt: string;
  sections: GuideSection[];
  faqs: GuideFaq[];
  product_mentions: GuideMention[];
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const GUIDE_COLUMNS =
  "id, slug, title, dek, tldr, reading_time, hero_image_url, hero_image_alt, sections, faqs, product_mentions, status, published_at, created_at, updated_at";

export async function listPublishedGuides(): Promise<DbGuide[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guides")
    .select(GUIDE_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (data ?? []) as unknown as DbGuide[];
}

export async function getPublishedGuideBySlug(
  slug: string,
): Promise<DbGuide | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guides")
    .select(GUIDE_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as unknown as DbGuide) ?? null;
}
