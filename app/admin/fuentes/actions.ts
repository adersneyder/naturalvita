"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";
import { getScraper } from "@/lib/scrapers";

export type ActionResult = { success: boolean; error?: string; data?: unknown };

export async function testDataSourceConnection(
  dataSourceId: string,
): Promise<ActionResult> {
  await requireRole(["owner", "admin", "editor"]);
  const supabase = await createClient();

  const { data: source, error } = await supabase
    .from("data_sources")
    .select("base_url, catalog_url, scraper_strategy, scraper_config")
    .eq("id", dataSourceId)
    .single();

  if (error || !source) return { success: false, error: "Fuente no encontrada" };

  if (source.scraper_strategy === null || source.scraper_strategy === undefined) {
    return { success: false, error: "Esta fuente no tiene estrategia de scraping" };
  }

  try {
    const scraper = getScraper({
      base_url: source.base_url ?? "",
      catalog_url: source.catalog_url,
      scraper_strategy: source.scraper_strategy,
      scraper_config: source.scraper_config ?? {},
    });
    const result = await scraper.testConnection();
    return { success: result.ok, error: result.ok ? undefined : result.message, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function createDataSource(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const name = String(formData.get("name") ?? "").trim();
  const laboratoryName = String(formData.get("laboratory_name") ?? "").trim();
  const baseUrl = String(formData.get("base_url") ?? "").trim();
  const catalogUrl = String(formData.get("catalog_url") ?? "").trim() || null;
  const type = String(formData.get("type") ?? "scraper").trim();
  const scraperStrategy = String(formData.get("scraper_strategy") ?? "woocommerce").trim();

  if (!name) return { success: false, error: "Nombre de la fuente es obligatorio" };
  if (!laboratoryName) return { success: false, error: "Nombre del laboratorio es obligatorio" };
  if (type === "scraper" && !baseUrl) {
    return { success: false, error: "URL base es obligatoria para scrapers" };
  }

  const supabase = await createClient();

  // Crear o reutilizar laboratorio
  const labSlug = slugify(laboratoryName);
  let labId: string;
  const { data: existingLab } = await supabase
    .from("laboratories")
    .select("id")
    .eq("slug", labSlug)
    .maybeSingle();

  if (existingLab) {
    labId = existingLab.id;
  } else {
    const { data: newLab, error: labError } = await supabase
      .from("laboratories")
      .insert({
        name: laboratoryName,
        slug: labSlug,
        website_url: baseUrl,
        is_active: true,
      })
      .select("id")
      .single();

    if (labError || !newLab) {
      return { success: false, error: labError?.message ?? "Error creando laboratorio" };
    }
    labId = newLab.id;
  }

  const { error: srcError } = await supabase.from("data_sources").insert({
    laboratory_id: labId,
    name,
    type,
    base_url: baseUrl,
    catalog_url: catalogUrl,
    scraper_strategy: type === "scraper" ? scraperStrategy : null,
    is_active: true,
  });

  if (srcError) return { success: false, error: srcError.message };

  revalidatePath("/admin/fuentes");
  return { success: true };
}

export async function toggleDataSource(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("data_sources")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/fuentes");
  return { success: true };
}

/**
 * Actualiza una fuente de datos existente. NO permite cambiar laboratory_id
 * porque eso rompería la integridad referencial con productos ya importados.
 * Si el usuario necesita reasignar a otro laboratorio, debe crear una fuente nueva.
 */
export async function updateDataSource(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);

  const name = String(formData.get("name") ?? "").trim();
  const baseUrl = String(formData.get("base_url") ?? "").trim();
  const catalogUrl = String(formData.get("catalog_url") ?? "").trim() || null;
  const scraperStrategy = String(formData.get("scraper_strategy") ?? "").trim() || null;
  const isActive = formData.get("is_active") !== "false";

  if (!name) return { success: false, error: "Nombre de la fuente es obligatorio" };

  const supabase = await createClient();

  // Verificar tipo actual: si es scraper, base_url es obligatorio
  const { data: existing } = await supabase
    .from("data_sources")
    .select("type")
    .eq("id", id)
    .single();

  if (!existing) return { success: false, error: "Fuente no encontrada" };

  if (existing.type === "scraper" && !baseUrl) {
    return { success: false, error: "URL base es obligatoria para scrapers" };
  }

  const { error } = await supabase
    .from("data_sources")
    .update({
      name,
      base_url: baseUrl || null,
      catalog_url: catalogUrl,
      scraper_strategy: existing.type === "scraper" ? scraperStrategy : null,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/fuentes");
  return { success: true };
}

/**
 * Elimina una fuente de datos. Solo permite si NO tiene productos asociados
 * (la integridad referencial impediría el delete y se perdería historial).
 * Si tiene productos, instruye al usuario a archivar en su lugar.
 */
export async function deleteDataSource(id: string): Promise<ActionResult> {
  await requireRole(["owner", "admin"]);
  const supabase = await createClient();

  const { count: productsCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("data_source_id", id);

  if ((productsCount ?? 0) > 0) {
    return {
      success: false,
      error: `No se puede eliminar: ${productsCount} producto(s) asociado(s). Archiva la fuente en su lugar (queda inactiva pero conserva el histórico).`,
    };
  }

  // Verificar que no haya jobs activos
  const { count: activeJobs } = await supabase
    .from("scraping_jobs")
    .select("*", { count: "exact", head: true })
    .eq("data_source_id", id)
    .in("status", ["pending", "running"]);

  if ((activeJobs ?? 0) > 0) {
    return {
      success: false,
      error: "Hay un job de sincronización en curso. Espera a que termine o cancélalo antes de eliminar.",
    };
  }

  // Borrar jobs históricos (no tienen valor sin la fuente) y luego la fuente
  await supabase.from("scraping_jobs").delete().eq("data_source_id", id);

  const { error } = await supabase.from("data_sources").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/fuentes");
  return { success: true };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}
