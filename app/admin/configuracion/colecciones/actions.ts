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

export async function createCollection(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const customSlug = String(formData.get("slug") ?? "").trim();
  const slug = customSlug ? slugify(customSlug) : slugify(name);

  const description = String(formData.get("description") ?? "").trim() || null;
  const isFeatured = formData.get("is_featured") === "true";
  const isActive = formData.get("is_active") !== "false";
  const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw) : 99;
  const metaTitle = String(formData.get("meta_title") ?? "").trim() || null;
  const metaDescription = String(formData.get("meta_description") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("collections").insert({
    name,
    slug,
    description,
    is_featured: isFeatured,
    is_active: isActive,
    sort_order: sortOrder,
    meta_title: metaTitle,
    meta_description: metaDescription,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe una colección con ese slug" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/configuracion/colecciones");
  return { success: true };
}

export async function updateCollection(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const customSlug = String(formData.get("slug") ?? "").trim();
  const slug = customSlug ? slugify(customSlug) : slugify(name);

  const description = String(formData.get("description") ?? "").trim() || null;
  const isFeatured = formData.get("is_featured") === "true";
  const isActive = formData.get("is_active") !== "false";
  const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw) : 99;
  const metaTitle = String(formData.get("meta_title") ?? "").trim() || null;
  const metaDescription = String(formData.get("meta_description") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("collections")
    .update({
      name,
      slug,
      description,
      is_featured: isFeatured,
      is_active: isActive,
      sort_order: sortOrder,
      meta_title: metaTitle,
      meta_description: metaDescription,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe una colección con ese slug" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/configuracion/colecciones");
  return { success: true };
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const supabase = await createClient();

  // Verificar productos asociados
  const { count } = await supabase
    .from("product_collections")
    .select("*", { count: "exact", head: true })
    .eq("collection_id", id);

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: `No se puede eliminar: tiene ${count} producto(s) asociado(s)`,
    };
  }

  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion/colecciones");
  return { success: true };
}
