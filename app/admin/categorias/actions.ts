"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function createCategory(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);

  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  const suggestedTaxRateId = String(formData.get("suggested_tax_rate_id") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) return { success: false, error: "El nombre es obligatorio" };
  if (name.length > 80) return { success: false, error: "El nombre es muy largo (max 80)" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (existing?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("categories").insert({
    name,
    slug: slugify(name),
    parent_id: parentId,
    suggested_tax_rate_id: suggestedTaxRateId,
    description,
    sort_order: nextSortOrder,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe una categoría con ese nombre" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/categorias");
  return { success: true };
}

export async function updateCategory(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);

  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  const suggestedTaxRateId = String(formData.get("suggested_tax_rate_id") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const isActive = formData.get("is_active") === "true";

  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name,
      slug: slugify(name),
      parent_id: parentId,
      suggested_tax_rate_id: suggestedTaxRateId,
      description,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe una categoría con ese nombre" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/categorias");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const supabase = await createClient();

  // Verificar que no tenga productos activos asociados
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id)
    .neq("status", "archived");

  if (count && count > 0) {
    return {
      success: false,
      error: `No se puede eliminar: tiene ${count} producto${count === 1 ? "" : "s"} asociado${count === 1 ? "" : "s"}. Reasígnalos primero.`,
    };
  }

  // Verificar subcategorías
  const { count: childrenCount } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true })
    .eq("parent_id", id);

  if (childrenCount && childrenCount > 0) {
    return {
      success: false,
      error: `No se puede eliminar: tiene ${childrenCount} subcategoría${childrenCount === 1 ? "" : "s"}. Elimina o mueve las subcategorías primero.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/categorias");
  return { success: true };
}

export async function reorderCategories(
  orderedIds: string[],
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);

  const supabase = await createClient();

  // Actualizar sort_order para cada categoría según su posición en el array
  const updates = await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from("categories").update({ sort_order: idx + 1 }).eq("id", id),
    ),
  );

  const failed = updates.find((u) => u.error);
  if (failed?.error) return { success: false, error: failed.error.message };

  revalidatePath("/admin/categorias");
  return { success: true };
}
