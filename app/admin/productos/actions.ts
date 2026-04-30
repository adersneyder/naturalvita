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

  // Construir label legible para presentation
  const presentationLabel = await buildPresentationLabel(
    supabase,
    presentationType,
    contentValue,
    contentUnit,
  );

  // Construir updateData sin tocar los campos editoriales gestionados por AiContentSection.
  // Esos campos (short_description, full_description, composition_use, dosage, warnings) los
  // gestiona el endpoint /api/products/generate-ai-content, NO el form principal del editor.
  // Solo persistimos los campos que SÍ están en el formulario actual.
  const updateData: Record<string, unknown> = {
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    ingredients: String(formData.get("ingredients") ?? "").trim() || null,
    usage_instructions: String(formData.get("usage_instructions") ?? "").trim() || null,
    invima_number: String(formData.get("invima_number") ?? "").trim() || null,
    presentation_type: presentationType,
    content_value: contentValue,
    content_unit: contentUnit,
    presentation: presentationLabel,
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

  // Sincronizar colecciones (reemplazar set completo)
  const collectionIdsRaw = String(formData.get("collection_ids_json") ?? "[]");
  let collectionIds: string[] = [];
  try {
    const parsed = JSON.parse(collectionIdsRaw);
    if (Array.isArray(parsed)) collectionIds = parsed.filter((x) => typeof x === "string");
  } catch {
    collectionIds = [];
  }

  await supabase.from("product_collections").delete().eq("product_id", productId);
  if (collectionIds.length > 0) {
    const rows = collectionIds.map((cid) => ({
      product_id: productId,
      collection_id: cid,
    }));
    const { error: colErr } = await supabase.from("product_collections").insert(rows);
    if (colErr) return { success: false, error: `Error en colecciones: ${colErr.message}` };
  }

  // Sincronizar atributos (reemplazar set completo)
  const attrJsonRaw = String(formData.get("attribute_values_json") ?? "[]");
  type AttrPayload = {
    attribute_id: string;
    option_ids: string[];
    text_value: string | null;
  };
  let attrPayload: AttrPayload[] = [];
  try {
    const parsed = JSON.parse(attrJsonRaw);
    if (Array.isArray(parsed)) attrPayload = parsed;
  } catch {
    attrPayload = [];
  }

  await supabase.from("product_attribute_values").delete().eq("product_id", productId);

  const attrRows: Array<{
    product_id: string;
    attribute_id: string;
    option_id: string | null;
    text_value: string | null;
  }> = [];
  for (const item of attrPayload) {
    if (!item.attribute_id) continue;
    if (item.option_ids && item.option_ids.length > 0) {
      for (const optId of item.option_ids) {
        attrRows.push({
          product_id: productId,
          attribute_id: item.attribute_id,
          option_id: optId,
          text_value: null,
        });
      }
    } else if (item.text_value) {
      attrRows.push({
        product_id: productId,
        attribute_id: item.attribute_id,
        option_id: null,
        text_value: item.text_value,
      });
    } else {
      // Boolean: una fila sin option ni text indica "true"
      attrRows.push({
        product_id: productId,
        attribute_id: item.attribute_id,
        option_id: null,
        text_value: null,
      });
    }
  }

  if (attrRows.length > 0) {
    const { error: attrErr } = await supabase
      .from("product_attribute_values")
      .insert(attrRows);
    if (attrErr) return { success: false, error: `Error en atributos: ${attrErr.message}` };
  }

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${productId}`);
  return { success: true };
}

async function buildPresentationLabel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  type: string | null,
  value: number | null,
  unit: string | null,
): Promise<string | null> {
  if (!type || !value || !unit) return null;
  const rounded = Math.round(value * 100) / 100;

  // Buscar nombre del tipo de presentación y símbolo de la unidad desde DB
  const [{ data: presType }, { data: contentUnit }] = await Promise.all([
    supabase.from("presentation_types").select("name").eq("code", type).maybeSingle(),
    supabase.from("content_units").select("symbol").eq("code", unit).maybeSingle(),
  ]);

  const typeLabel: string = presType?.name ?? "";
  const unitSymbol: string = contentUnit?.symbol ?? unit;

  return typeLabel
    ? `${typeLabel} · ${rounded}${unitSymbol}`
    : `${rounded}${unitSymbol}`;
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

  const storagePrefix =
    process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/product-images/";
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

  await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId);

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

// =====================================================
// BULK · COLECCIONES Y ATRIBUTOS
// =====================================================

export async function bulkAddToCollection(
  productIds: string[],
  collectionId: string,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  if (productIds.length === 0) {
    return { success: false, error: "Sin productos seleccionados" };
  }
  if (!collectionId) return { success: false, error: "Selecciona una colección" };

  const supabase = await createClient();

  // Buscar pares ya existentes para insertar solo los faltantes
  const { data: existing } = await supabase
    .from("product_collections")
    .select("product_id")
    .eq("collection_id", collectionId)
    .in("product_id", productIds);

  const existingSet = new Set(
    (existing ?? []).map((r: { product_id: string }) => r.product_id),
  );
  const toInsert = productIds
    .filter((pid) => !existingSet.has(pid))
    .map((pid) => ({ product_id: pid, collection_id: collectionId }));

  if (toInsert.length === 0) {
    revalidatePath("/admin/productos");
    return { success: true, affected: 0 };
  }

  const { error } = await supabase.from("product_collections").insert(toInsert);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/productos");
  return { success: true, affected: toInsert.length };
}

export async function bulkRemoveFromCollection(
  productIds: string[],
  collectionId: string,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  if (productIds.length === 0) {
    return { success: false, error: "Sin productos seleccionados" };
  }
  if (!collectionId) return { success: false, error: "Selecciona una colección" };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("product_collections")
    .delete({ count: "exact" })
    .eq("collection_id", collectionId)
    .in("product_id", productIds);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/productos");
  return { success: true, affected: count ?? 0 };
}

export type BulkAttributePayload =
  | { kind: "boolean_true" }
  | { kind: "select"; option_id: string }
  | { kind: "multi_select_add"; option_ids: string[] }
  | { kind: "text"; text_value: string };

export async function bulkSetAttributeValue(
  productIds: string[],
  attributeId: string,
  payload: BulkAttributePayload,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  if (productIds.length === 0) {
    return { success: false, error: "Sin productos seleccionados" };
  }
  if (!attributeId) return { success: false, error: "Selecciona un atributo" };

  const supabase = await createClient();

  // Para boolean, select y text: reemplazar el valor existente del atributo en cada producto.
  // Para multi_select_add: NO reemplaza; añade las opciones que falten sin tocar las ya marcadas.
  if (payload.kind !== "multi_select_add") {
    await supabase
      .from("product_attribute_values")
      .delete()
      .eq("attribute_id", attributeId)
      .in("product_id", productIds);

    const rows: Array<{
      product_id: string;
      attribute_id: string;
      option_id: string | null;
      text_value: string | null;
    }> = [];

    for (const pid of productIds) {
      if (payload.kind === "boolean_true") {
        rows.push({
          product_id: pid,
          attribute_id: attributeId,
          option_id: null,
          text_value: null,
        });
      } else if (payload.kind === "select") {
        rows.push({
          product_id: pid,
          attribute_id: attributeId,
          option_id: payload.option_id,
          text_value: null,
        });
      } else if (payload.kind === "text") {
        if (!payload.text_value.trim()) continue;
        rows.push({
          product_id: pid,
          attribute_id: attributeId,
          option_id: null,
          text_value: payload.text_value.trim(),
        });
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("product_attribute_values").insert(rows);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/admin/productos");
    return { success: true, affected: productIds.length };
  }

  // multi_select_add: agregar opciones faltantes producto por producto (sin duplicar)
  if (payload.option_ids.length === 0) {
    return { success: false, error: "Selecciona al menos una opción" };
  }

  const { data: existing } = await supabase
    .from("product_attribute_values")
    .select("product_id, option_id")
    .eq("attribute_id", attributeId)
    .in("product_id", productIds)
    .in("option_id", payload.option_ids);

  const existingSet = new Set(
    (existing ?? []).map(
      (r: { product_id: string; option_id: string | null }) =>
        `${r.product_id}::${r.option_id ?? ""}`,
    ),
  );

  const rows: Array<{
    product_id: string;
    attribute_id: string;
    option_id: string;
    text_value: null;
  }> = [];

  for (const pid of productIds) {
    for (const oid of payload.option_ids) {
      const key = `${pid}::${oid}`;
      if (!existingSet.has(key)) {
        rows.push({
          product_id: pid,
          attribute_id: attributeId,
          option_id: oid,
          text_value: null,
        });
      }
    }
  }

  if (rows.length === 0) {
    revalidatePath("/admin/productos");
    return { success: true, affected: 0 };
  }

  const { error } = await supabase.from("product_attribute_values").insert(rows);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/productos");
  return { success: true, affected: rows.length };
}

export async function bulkRemoveAttribute(
  productIds: string[],
  attributeId: string,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  if (productIds.length === 0) {
    return { success: false, error: "Sin productos seleccionados" };
  }
  if (!attributeId) return { success: false, error: "Selecciona un atributo" };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("product_attribute_values")
    .delete({ count: "exact" })
    .eq("attribute_id", attributeId)
    .in("product_id", productIds);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/productos");
  return { success: true, affected: count ?? 0 };
}
