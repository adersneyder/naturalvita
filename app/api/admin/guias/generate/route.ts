/**
 * app/api/admin/guias/generate/route.ts
 *
 * Generador de guías editoriales con IA. El admin escribe un tema y
 * Claude produce el borrador completo en el formato de ArticleLayout:
 * título, dek, TL;DR con cifras, secciones en markdown, FAQs y productos
 * del catálogo citados con justificación editorial.
 *
 * Los productos citados se eligen EXCLUSIVAMENTE del catálogo activo
 * (se le pasa la lista a Claude); los slugs se validan después contra BD
 * para garantizar cero links rotos.
 *
 * Imágenes: devuelve candidatas de dos fuentes — la galería editorial del
 * sitio (con sugerencia automática por tema) y las fotos de los productos
 * citados. El admin elige en el paso de preview.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAnthropicClient, ACTIVE_MODEL } from "@/lib/anthropic/client";
import { HERO_GALLERY } from "@/lib/guias/hero-gallery";

export const maxDuration = 120;

type GeneratedGuide = {
  slug: string;
  title: string;
  dek: string;
  tldr: string;
  reading_time: string;
  sections: Array<{ id: string; heading: string; body_md: string }>;
  faqs: Array<{ q: string; a: string }>;
  product_mentions: Array<{ slug: string; why: string }>;
  suggested_hero_url: string;
};

export type ImageCandidate = {
  url: string;
  alt: string;
  source: "galeria" | "producto";
  suggested: boolean;
};

const PROMPT_TEMPLATE = `Eres el editor senior de NaturalVita (naturalvita.co), tienda online colombiana de suplementos con registro INVIMA. Escribes guías editoriales que capturan tráfico de IA generativa (Google AI Overviews, ChatGPT, Perplexity).

# Tema solicitado
{{TOPIC}}

# Catálogo activo (los ÚNICOS productos que puedes citar, por slug exacto)
{{CATALOG}}

# Galería de imágenes hero disponibles
{{GALLERY}}

# Reglas editoriales (NO negociables)
- Español colombiano neutro, impersonal (sin "tú/usted" como sujeto dominante; las guías existentes usan segunda persona solo con moderación práctica).
- Educativo con base científica. Sin promesas médicas ("cura", "trata", "elimina enfermedad"). Usa "apoya", "contribuye", "ayuda al funcionamiento normal".
- TL;DR de 40-60 palabras CON CIFRAS específicas (dosis, tiempos, rangos). Es lo que las IAs citan textualmente.
- 4-6 secciones. Cada body_md de 80-180 palabras en markdown simple: párrafos, listas con "-" o "1.", **negrita**, [links](url). Los links internos a /guias/... o /producto/... cuando aporten.
- 5 FAQs con respuestas de 40-80 palabras, en texto plano (sin markdown), respondiendo las preguntas REALES que la gente le hace a ChatGPT sobre el tema.
- 2-5 productos citados del catálogo provisto. El campo "why" explica honestamente por qué ese producto encaja en el contexto (no es publicidad, es criterio editorial). Si ningún producto del catálogo aplica, devuelve product_mentions vacío.
- Menciona INVIMA donde sea natural (es el diferenciador de confianza).
- slug: kebab-case, descriptivo, terminado en "-colombia" si suena natural.
- reading_time: estima "N min" según extensión.
- suggested_hero_url: elige la imagen de la galería cuyos temas mejor matcheen el artículo.

# Formato de respuesta
Respondes EXCLUSIVAMENTE un objeto JSON válido, sin markdown fences ni texto adicional:
{
  "slug": "...",
  "title": "...",
  "dek": "...",
  "tldr": "...",
  "reading_time": "7 min",
  "sections": [{"id": "kebab-id", "heading": "...", "body_md": "..."}],
  "faqs": [{"q": "...", "a": "..."}],
  "product_mentions": [{"slug": "slug-exacto-del-catalogo", "why": "..."}],
  "suggested_hero_url": "/home/hero-....webp"
}`;

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();
    if (!["owner", "admin", "editor"].includes(adminUser.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { topic } = (await request.json()) as { topic?: string };
    if (!topic || topic.trim().length < 5) {
      return NextResponse.json(
        { error: "Describe el tema de la guía (mínimo 5 caracteres)" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Catálogo activo resumido para que Claude elija qué citar.
    const { data: products } = await supabase
      .from("products")
      .select("slug, name, presentation, price_cop, short_description")
      .eq("status", "active")
      .order("name");

    const catalogText = (products ?? [])
      .map(
        (p) =>
          `- slug: ${p.slug} | ${p.name}${p.presentation ? ` (${p.presentation})` : ""} | $${p.price_cop} COP | ${(p.short_description ?? "").slice(0, 110)}`,
      )
      .join("\n");

    const galleryText = HERO_GALLERY.map(
      (g) => `- url: ${g.url} | temas: ${g.themes.join(", ")}`,
    ).join("\n");

    const prompt = PROMPT_TEMPLATE.replace("{{TOPIC}}", topic.trim())
      .replace("{{CATALOG}}", catalogText)
      .replace("{{GALLERY}}", galleryText);

    const anthropic = createAnthropicClient();
    const response = await anthropic.messages.create({
      model: ACTIVE_MODEL,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    // Tolera fences aunque el prompt los prohíba.
    const jsonText = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let guide: GeneratedGuide;
    try {
      guide = JSON.parse(jsonText) as GeneratedGuide;
    } catch {
      console.error("[guias/generate] JSON inválido de la IA:", raw.slice(0, 500));
      return NextResponse.json(
        { error: "La IA devolvió un formato inválido. Intenta de nuevo." },
        { status: 502 },
      );
    }

    // Validar slugs citados contra el catálogo real (cero links rotos).
    const validSlugs = new Set((products ?? []).map((p) => p.slug));
    const invalidMentions = (guide.product_mentions ?? []).filter(
      (m) => !validSlugs.has(m.slug),
    );
    guide.product_mentions = (guide.product_mentions ?? []).filter((m) =>
      validSlugs.has(m.slug),
    );

    // Evitar colisión de slug con guías existentes (BD y estáticas).
    const { data: existing } = await supabase
      .from("guides")
      .select("slug")
      .eq("slug", guide.slug)
      .maybeSingle();
    if (existing) {
      guide.slug = `${guide.slug}-${Date.now().toString(36).slice(-4)}`;
    }

    // Candidatas de imagen: galería editorial + fotos de productos citados.
    const candidates: ImageCandidate[] = HERO_GALLERY.map((g) => ({
      url: g.url,
      alt: g.alt,
      source: "galeria" as const,
      suggested: g.url === guide.suggested_hero_url,
    }));
    // Si la IA sugirió algo fuera de la galería, marca la primera como sugerida.
    if (!candidates.some((c) => c.suggested) && candidates.length > 0) {
      candidates[0].suggested = true;
    }

    // Fotos primarias de los productos citados, vía join por slug.
    const mentionSlugs = guide.product_mentions.map((m) => m.slug);
    if (mentionSlugs.length > 0) {
      const { data: prodRows } = await supabase
        .from("products")
        .select("slug, name, images:product_images!product_id(url, alt_text, is_primary)")
        .in("slug", mentionSlugs)
        .eq("status", "active");
      for (const row of prodRows ?? []) {
        const images = (row.images ?? []) as Array<{
          url: string;
          alt_text: string | null;
          is_primary: boolean;
        }>;
        const primary = images.find((i) => i.is_primary) ?? images[0];
        if (primary) {
          candidates.push({
            url: primary.url,
            alt: primary.alt_text ?? (row.name as string),
            source: "producto",
            suggested: false,
          });
        }
      }
    }

    return NextResponse.json({
      guide,
      imageCandidates: candidates,
      warnings:
        invalidMentions.length > 0
          ? [
              `La IA citó ${invalidMentions.length} producto(s) inexistentes que fueron descartados: ${invalidMentions.map((m) => m.slug).join(", ")}`,
            ]
          : [],
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[guias/generate]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
