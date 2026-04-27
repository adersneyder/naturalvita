"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";

export type ActionResult = { success: boolean; error?: string };

const VALID_FAMILIES = ["weight", "volume", "units", "other"];

export async function createContentUnit(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  if (!code || !/^[a-z0-9_]+$/.test(code)) {
    return { success: false, error: "Código inválido (solo minúsculas, números y _)" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const symbol = String(formData.get("symbol") ?? "").trim();
  if (!symbol) return { success: false, error: "El símbolo es obligatorio" };

  const unitFamily = String(formData.get("unit_family") ?? "units").trim();
  if (!VALID_FAMILIES.includes(unitFamily)) {
    return { success: false, error: "Familia de unidad inválida" };
  }

  const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw) : 99;
  const isActive = formData.get("is_active") !== "false";

  const supabase = await createClient();
  const { error } = await supabase.from("content_units").insert({
    code,
    name,
    symbol,
    unit_family: unitFamily,
    sort_order: sortOrder,
    is_active: isActive,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe una unidad con ese código" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/configuracion/unidades");
  return { success: true };
}

export async function updateContentUnit(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const symbol = String(formData.get("symbol") ?? "").trim();
  if (!symbol) return { success: false, error: "El símbolo es obligatorio" };

  const unitFamily = String(formData.get("unit_family") ?? "units").trim();
  if (!VALID_FAMILIES.includes(unitFamily)) {
    return { success: false, error: "Familia de unidad inválida" };
  }

  const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw) : 99;
  const isActive = formData.get("is_active") !== "false";

  // No permitimos cambiar code para preservar referencias
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_units")
    .update({
      name,
      symbol,
      unit_family: unitFamily,
      sort_order: sortOrder,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion/unidades");
  return { success: true };
}

export async function deleteContentUnit(
  id: string,
  code: string,
): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const supabase = await createClient();

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("content_unit", code);

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: `No se puede eliminar: ${count} producto(s) la usan`,
    };
  }

  const { error } = await supabase.from("content_units").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion/unidades");
  return { success: true };
}
