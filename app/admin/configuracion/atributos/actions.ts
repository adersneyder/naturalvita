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

const VALID_TYPES = ["boolean", "select", "multi_select", "text"];

export async function createAttribute(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const customSlug = String(formData.get("slug") ?? "").trim();
  const slug = customSlug ? slugify(customSlug) : slugify(name);

  const attributeType = String(formData.get("attribute_type") ?? "boolean").trim();
  if (!VALID_TYPES.includes(attributeType)) {
    return { success: false, error: "Tipo de atributo inválido" };
  }

  const description = String(formData.get("description") ?? "").trim() || null;
  const isFilterable = formData.get("is_filterable") !== "false";
  const showInCard = formData.get("show_in_card") === "true";
  const isActive = formData.get("is_active") !== "false";
  const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw) : 99;

  const supabase = await createClient();
  const { error } = await supabase.from("product_attributes").insert({
    name,
    slug,
    attribute_type: attributeType,
    description,
    is_filterable: isFilterable,
    show_in_card: showInCard,
    is_active: isActive,
    sort_order: sortOrder,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un atributo con ese slug" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/configuracion/atributos");
  return { success: true };
}

export async function updateAttribute(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const customSlug = String(formData.get("slug") ?? "").trim();
  const slug = customSlug ? slugify(customSlug) : slugify(name);

  const description = String(formData.get("description") ?? "").trim() || null;
  const isFilterable = formData.get("is_filterable") !== "false";
  const showInCard = formData.get("show_in_card") === "true";
  const isActive = formData.get("is_active") !== "false";
  const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw) : 99;

  // No permitimos cambiar el tipo después de creado para evitar incoherencias
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_attributes")
    .update({
      name,
      slug,
      description,
      is_filterable: isFilterable,
      show_in_card: showInCard,
      is_active: isActive,
      sort_order: sortOrder,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un atributo con ese slug" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/configuracion/atributos");
  return { success: true };
}

export async function deleteAttribute(id: string): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const supabase = await createClient();

  const { count } = await supabase
    .from("product_attribute_values")
    .select("*", { count: "exact", head: true })
    .eq("attribute_id", id);

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: `No se puede eliminar: tiene ${count} producto(s) asociado(s)`,
    };
  }

  // Cascada borra opciones automáticamente por la FK
  const { error } = await supabase.from("product_attributes").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion/atributos");
  return { success: true };
}

// =====================================================
// OPCIONES DE ATRIBUTOS (para select / multi_select)
// =====================================================

export async function createAttributeOption(
  attributeId: string,
  value: string,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);

  const trimmed = value.trim();
  if (!trimmed) return { success: false, error: "El valor es obligatorio" };

  const supabase = await createClient();

  // Calcular siguiente sort_order
  const { data: existing } = await supabase
    .from("product_attribute_options")
    .select("sort_order")
    .eq("attribute_id", attributeId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = ((existing?.[0]?.sort_order as number | undefined) ?? 0) + 1;

  const { error } = await supabase.from("product_attribute_options").insert({
    attribute_id: attributeId,
    value: trimmed,
    slug: slugify(trimmed),
    sort_order: nextOrder,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion/atributos");
  return { success: true };
}

export async function deleteAttributeOption(optionId: string): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);

  const supabase = await createClient();

  const { count } = await supabase
    .from("product_attribute_values")
    .select("*", { count: "exact", head: true })
    .eq("option_id", optionId);

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: `No se puede eliminar: ${count} producto(s) usan esta opción`,
    };
  }

  const { error } = await supabase
    .from("product_attribute_options")
    .delete()
    .eq("id", optionId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion/atributos");
  return { success: true };
}
