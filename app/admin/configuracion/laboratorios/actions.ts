"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";

export type ActionResult = { success: boolean; error?: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v;
}

export async function createLaboratory(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const customSlug = String(formData.get("slug") ?? "").trim();
  const slug = customSlug ? slugify(customSlug) : slugify(name);
  if (!slug) return { success: false, error: "Slug inválido" };

  const websiteUrl = normalizeUrl(String(formData.get("website_url") ?? ""));
  const scrapeUrl = normalizeUrl(String(formData.get("scrape_url") ?? ""));
  const logoUrl = normalizeUrl(String(formData.get("logo_url") ?? ""));
  const description = String(formData.get("description") ?? "").trim() || null;
  const isActive = formData.get("is_active") !== "false";

  const supabase = await createClient();
  const { error } = await supabase.from("laboratories").insert({
    name,
    slug,
    website_url: websiteUrl,
    scrape_url: scrapeUrl,
    logo_url: logoUrl,
    description,
    is_active: isActive,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un laboratorio con ese slug o nombre" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/configuracion/laboratorios");
  return { success: true };
}

export async function updateLaboratory(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const customSlug = String(formData.get("slug") ?? "").trim();
  const slug = customSlug ? slugify(customSlug) : slugify(name);
  if (!slug) return { success: false, error: "Slug inválido" };

  const websiteUrl = normalizeUrl(String(formData.get("website_url") ?? ""));
  const scrapeUrl = normalizeUrl(String(formData.get("scrape_url") ?? ""));
  const logoUrl = normalizeUrl(String(formData.get("logo_url") ?? ""));
  const description = String(formData.get("description") ?? "").trim() || null;
  const isActive = formData.get("is_active") !== "false";

  const supabase = await createClient();
  const { error } = await supabase
    .from("laboratories")
    .update({
      name,
      slug,
      website_url: websiteUrl,
      scrape_url: scrapeUrl,
      logo_url: logoUrl,
      description,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un laboratorio con ese slug o nombre" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/configuracion/laboratorios");
  return { success: true };
}

export async function deleteLaboratory(id: string): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const supabase = await createClient();

  const { count: prodCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("laboratory_id", id);

  if ((prodCount ?? 0) > 0) {
    return {
      success: false,
      error: `No se puede eliminar: ${prodCount} producto(s) asociado(s)`,
    };
  }

  const { count: srcCount } = await supabase
    .from("data_sources")
    .select("*", { count: "exact", head: true })
    .eq("laboratory_id", id);

  if ((srcCount ?? 0) > 0) {
    return {
      success: false,
      error: `No se puede eliminar: ${srcCount} fuente(s) de datos asociada(s)`,
    };
  }

  const { error } = await supabase.from("laboratories").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion/laboratorios");
  return { success: true };
}
