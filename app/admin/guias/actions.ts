"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/audit-log";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublishGuideInput = {
  slug: string;
  title: string;
  dek: string;
  tldr: string;
  reading_time: string;
  hero_image_url: string;
  hero_image_alt: string;
  sections: Array<{ id: string; heading: string; body_md: string }>;
  faqs: Array<{ q: string; a: string }>;
  product_mentions: Array<{ slug: string; why: string }>;
};

export type PublishGuideResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

/**
 * Publica una guía generada (o la guarda como borrador). Valida lo mínimo
 * indispensable server-side: campos no vacíos, slug único, estructura.
 * Tras publicar revalida /guias y la ruta del artículo para que aparezca
 * sin esperar el ISR.
 */
export async function publishGuide(
  input: PublishGuideInput,
  asDraft = false,
): Promise<PublishGuideResult> {
  const adminUser = await getAdminUser();
  if (!["owner", "admin", "editor"].includes(adminUser.role)) {
    return { ok: false, error: "Sin permisos" };
  }

  if (!input.slug || !input.title || !input.tldr || input.sections.length === 0) {
    return { ok: false, error: "La guía está incompleta (slug, título, TL;DR y secciones son obligatorios)." };
  }
  if (!input.hero_image_url) {
    return { ok: false, error: "Selecciona una imagen hero antes de publicar." };
  }

  const admin = createAdminClient();

  const { error } = await admin.from("guides").insert({
    slug: input.slug,
    title: input.title,
    dek: input.dek,
    tldr: input.tldr,
    reading_time: input.reading_time || "7 min",
    hero_image_url: input.hero_image_url,
    hero_image_alt: input.hero_image_alt || input.title,
    sections: input.sections,
    faqs: input.faqs,
    product_mentions: input.product_mentions,
    status: asDraft ? "draft" : "published",
    published_at: asDraft ? null : new Date().toISOString(),
  });

  if (error) {
    console.error("[publishGuide]", error.message);
    if (error.message.includes("duplicate")) {
      return { ok: false, error: `Ya existe una guía con el slug "${input.slug}".` };
    }
    return { ok: false, error: "No pudimos guardar la guía. Intenta de nuevo." };
  }

  revalidatePath("/guias");
  revalidatePath(`/guias/${input.slug}`);
  revalidatePath("/sitemap.xml");

  await logAdminAction({
    action: asDraft ? "guide.unpublish" : "guide.publish",
    entityType: "guide",
    entityId: input.slug,
    summary: asDraft
      ? `Guardó borrador de guía "${input.title}"`
      : `Publicó guía "${input.title}"`,
    metadata: { title: input.title, sections: input.sections.length },
  });

  return { ok: true, slug: input.slug };
}

/** Despublica (archiva) una guía de BD. */
export async function archiveGuide(slug: string): Promise<PublishGuideResult> {
  const adminUser = await getAdminUser();
  if (!["owner", "admin"].includes(adminUser.role)) {
    return { ok: false, error: "Sin permisos" };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("guides")
    .update({ status: "archived" })
    .eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/guias");
  revalidatePath(`/guias/${slug}`);

  await logAdminAction({
    action: "guide.unpublish",
    entityType: "guide",
    entityId: slug,
    summary: `Archivó guía ${slug}`,
  });

  return { ok: true, slug };
}
