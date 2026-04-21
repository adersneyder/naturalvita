"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";

export type ActionResult = { success: boolean; error?: string };

function codify(text: string): string {
  return text
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function createTaxRate(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const name = String(formData.get("name") ?? "").trim();
  const ratePercentStr = String(formData.get("rate_percent") ?? "0").trim();
  const taxType = String(formData.get("tax_type") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) return { success: false, error: "El nombre es obligatorio" };
  if (!["included", "excluded", "exempt", "zero_rated"].includes(taxType)) {
    return { success: false, error: "Tipo de tarifa inválido" };
  }

  const ratePercent = parseFloat(ratePercentStr);
  if (isNaN(ratePercent) || ratePercent < 0 || ratePercent > 100) {
    return { success: false, error: "Porcentaje inválido (0-100)" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tax_rates")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("tax_rates").insert({
    code: codify(name),
    name,
    rate_percent: ratePercent,
    tax_type: taxType,
    description,
    sort_order: (existing?.sort_order ?? 0) + 1,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe una tarifa con ese código" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/configuracion/impuestos");
  return { success: true };
}

export async function updateTaxRate(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const isActive = formData.get("is_active") === "true";

  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const supabase = await createClient();

  // Solo permitir cambiar name, description, is_active (no el rate_percent ni code)
  // para preservar integridad de productos existentes
  const { error } = await supabase
    .from("tax_rates")
    .update({ name, description, is_active: isActive })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion/impuestos");
  return { success: true };
}

export async function setDefaultTaxRate(id: string): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const supabase = await createClient();

  // Desmarcar todas primero (el unique partial index permite solo un default)
  const { error: clearError } = await supabase
    .from("tax_rates")
    .update({ is_default: false })
    .eq("is_default", true);

  if (clearError) return { success: false, error: clearError.message };

  const { error } = await supabase
    .from("tax_rates")
    .update({ is_default: true })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion/impuestos");
  return { success: true };
}
