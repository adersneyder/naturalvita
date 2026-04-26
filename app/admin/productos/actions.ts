"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";

export type ActionResult = { success: boolean; error?: string; affected?: number };

// =====================================================
// EDICIÓN INDIVIDUAL
// =====================================================

export async function updateProduct(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, error: "El nombre es obligatorio" };

  const priceStr = String(formData.get("price_cop") ?? "0").replace(/[^\d]/g, "");
  const priceCop = parseInt(priceStr) || 0;
  if (priceCop < 0) return { success: false, error: "Precio inválido" };

  const stockStr = String(formData.get("stock") ?? "0").replace(/[^\d]/g, "");
  const stock = parseInt(stockStr) || 0;

  const compareAtStr = String(formData.get("compare_at_price_cop") ?? "").replace(/[^\d]/g, "");
  const compareAt = compareAtStr ? parseInt(compareAtStr) : null;

  const presentationType = String(formData.get("presentation_type") ?? "").trim() || null;
  const contentValueStr = String(formData.get("content_value") ?? "").trim();
  const contentValue = contentValueStr ? parseFloat(contentValueStr) : null;
  const contentUnit = String(formData.get("content_unit") ?? "").trim() || null;

  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const updateData: Record<string, unknown> = {
    name,
    short_description: String(formData.get("short_description") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    ingredients: String(formData.get("ingredients") ?? "").trim() || null,
    usage_instructions: String(formData.get("usage_instructions") ?? "").trim() || null,
    warnings: String(formData.get("warnings") ?? "").trim() || null,
    invima_number: String(formData.get("invima_number") ?? "").trim() || null,
    presentation_type: presentationType,
    content_value: contentValue,
    content_unit: contentUnit,
    presentation: buildPresentationLabel(presentationType, contentValue, contentUnit),
    sku: String(formData.get("sku") ?? "").trim() || null,
    price_cop: priceCop,
    compare_at_price_cop: compareAt,
    stock,
    track_stock: formData.get("track_stock") === "true",
    is_featured: formData.get("is_featured") === "true",
    category_id: String(formData.get("category_id") ?? "").trim() || null,
    tax_rate_id: String(formData.get("tax_rate_id") ?? "").trim() || null,
    tags,
    meta_title: String(formData.get("meta_title") ?? "").trim() || null,
    meta_description: String(formData.get("meta_description") ?? "").trim() || null,
    needs_review: false,
  };

  const { error } = await supabase.from("products").update(updateData).eq("id", productId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${productId}`);
  return { success: true };
}

function buildPresentationLabel(
  type: string | null,
  value: number | null,
  unit: string | null,
): string | null {
  if (!type || !value || !unit) return null;
  const rounded = Math.round(value * 100) / 100;
  const unitLabel = unit === "units" ? "u" : unit;
  const typeLabels: Record<string, string> = {
    powder: "Polvo",
    granulated: "Granulado",
    drops: "Gotas",
    syrup: "Jarabe",
    suspension: "Suspensión",
    tablets: "Tabletas",
    capsules: "Cápsulas",
    softgels: "Softgels",
    sublingual: "Sublingual",
    other: "",
  };
  const typeLabel = typeLabels[type] ?? "";
  return typeLabel ? `${typeLabel} · ${rounded}${unitLabel}` : `${rounded}${unitLabel}`;
}

// =====================================================
// CAMBIO DE ESTADO
// =====================================================

export async function setProductStatus(
  productId: string,
  status: "draft" | "pending_review" | "active" | "archived" | "out_of_stock",
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  const supabase = await createClient();

  // Validar antes de publicar a 'active'
  if (status === "active") {
    const { data: product } = await supabase
      .from("products")
      .select("name, price_cop, category_id, tax_rate_id")
      .eq("id", productId)
      .single();

    if (!product) return { success: false, error: "Producto no encontrado" };
    if (!product.price_cop || product.price_cop <= 0) {
      return { success: false, error: "No se puede publicar sin precio válido" };
    }
    if (!product.category_id) {
      return { success: false, error: "Asigna una categoría antes de publicar" };
    }
    if (!product.tax_rate_id) {
      return { success: false, error: "Asigna una tarifa de IVA antes de publicar" };
    }
  }

  const { error } = await supabase
    .from("products")
    .update({ status, needs_review: false })
    .eq("id", productId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${productId}`);
  return { success: true };
}

// =====================================================
// OPERACIONES MASIVAS
// =====================================================

export async function bulkSetCategory(
  productIds: string[],
  categoryId: string | null,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  if (productIds.length === 0) return { success: false, error: "Sin productos seleccionados" };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("products")
    .update({ category_id: categoryId }, { count: "exact" })
    .in("id", productIds);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/productos");
  return { success: true, affected: count ?? productIds.length };
}

export async function bulkSetTaxRate(
  productIds: string[],
  taxRateId: string,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  if (productIds.length === 0) return { success: false, error: "Sin productos seleccionados" };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("products")
    .update({ tax_rate_id: taxRateId }, { count: "exact" })
    .in("id", productIds);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/productos");
  return { success: true, affected: count ?? productIds.length };
}

export async function bulkSetStatus(
  productIds: string[],
  status: "draft" | "pending_review" | "active" | "archived",
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  if (productIds.length === 0) return { success: false, error: "Sin productos seleccionados" };

  const supabase = await createClient();

  // Si vamos a activar, validar que los productos cumplan requisitos
  if (status === "active") {
    const { data: invalids } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds)
      .or("category_id.is.null,tax_rate_id.is.null,price_cop.eq.0");

    if (invalids && invalids.length > 0) {
      return {
        success: false,
        error: `${invalids.length} producto(s) no se pueden activar: les falta categoría, IVA o precio`,
      };
    }
  }

  const { error, count } = await supabase
    .from("products")
    .update({ status, needs_review: false }, { count: "exact" })
    .in("id", productIds);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/productos");
  return { success: true, affected: count ?? productIds.length };
}

// =====================================================
// IMÁGENES
// =====================================================

export async function deleteProductImage(imageId: string): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  const supabase = await createClient();

  const { data: img } = await supabase
    .from("product_images")
    .select("id, url, product_id")
    .eq("id", imageId)
    .single();

  if (!img) return { success: false, error: "Imagen no encontrada" };

  // Intentar borrar del storage también (si la URL es de nuestro bucket)
  const storagePrefix = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/product-images/";
  if (img.url.startsWith(storagePrefix)) {
    const path = img.url.substring(storagePrefix.length);
    await supabase.storage.from("product-images").remove([path]);
  }

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/productos/${img.product_id}`);
  return { success: true };
}

export async function setMainImage(
  productId: string,
  imageId: string,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  const supabase = await createClient();

  // Quitar marca de principal a las otras
  await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId);

  // Marcar la nueva
  const { error } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/productos/${productId}`);
  return { success: true };
}

export async function reorderImages(
  productId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  const supabase = await createClient();

  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from("product_images").update({ sort_order: idx }).eq("id", id),
    ),
  );

  revalidatePath(`/admin/productos/${productId}`);
  return { success: true };
}
