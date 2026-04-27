"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";

export type ActionResult = { success: boolean; error?: string };

const VALID_FAMILIES = ["weight", "volume", "units", "other"];

export async function createPresentationType(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  if (!code || !/^[a-z0-9_]+$/.test(code)) {
    return { success: false, error: "Código inválido (solo minúsculas, números y _)" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const description = String(formData.get("description") ?? "").trim() || null;
  const defaultUnit = String(formData.get("default_unit") ?? "units").trim();
  const unitFamily = String(formData.get("unit_family") ?? "units").trim();

  if (!VALID_FAMILIES.includes(unitFamily)) {
    return { success: false, error: "Familia de unidad inválida" };
  }

  const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw) : 99;
  const isActive = formData.get("is_active") !== "false";

  const supabase = await createClient();
  const { error } = await supabase.from("presentation_types").insert({
    code,
    name,
    description,
    default_unit: defaultUnit,
    unit_family: unitFamily,
    sort_order: sortOrder,
    is_active: isActive,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un tipo con ese código" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/configuracion/presentaciones");
  return { success: true };
}

export async function updatePresentationType(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const description = String(formData.get("description") ?? "").trim() || null;
  const defaultUnit = String(formData.get("default_unit") ?? "units").trim();
  const unitFamily = String(formData.get("unit_family") ?? "units").trim();

  if (!VALID_FAMILIES.includes(unitFamily)) {
    return { success: false, error: "Familia de unidad inválida" };
  }

  const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw) : 99;
  const isActive = formData.get("is_active") !== "false";

  // No permitimos cambiar el code para preservar referencias en products
  const supabase = await createClient();
  const { error } = await supabase
    .from("presentation_types")
    .update({
      name,
      description,
      default_unit: defaultUnit,
      unit_family: unitFamily,
      sort_order: sortOrder,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion/presentaciones");
  return { success: true };
}

export async function deletePresentationType(
  id: string,
  code: string,
): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const supabase = await createClient();

  // Verificar productos que usan este código
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("presentation_type", code);

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: `No se puede eliminar: ${count} producto(s) lo usan`,
    };
  }

  const { error } = await supabase.from("presentation_types").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion/presentaciones");
  return { success: true };
}
