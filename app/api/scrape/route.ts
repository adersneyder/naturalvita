import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin-auth";
import { getScraper } from "@/lib/scrapers";
import { downloadAndUploadImage } from "@/lib/scrapers/image-downloader";
import type { ScrapedProduct } from "@/lib/scrapers/types";

export const maxDuration = 60; // segundos máximo por request

type StartRequest = {
  action: "start";
  data_source_id: string;
  batch_size?: number;
};

type ProcessRequest = {
  action: "process";
  job_id: string;
};

type CancelRequest = {
  action: "cancel";
  job_id: string;
};

type RequestBody = StartRequest | ProcessRequest | CancelRequest;

export async function POST(request: NextRequest) {
  // Auth
  const adminUser = await getAdminUser();
  if (!["owner", "admin", "editor"].includes(adminUser.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = (await request.json()) as RequestBody;
  const supabase = await createClient();

  if (body.action === "start") {
    return await startJob(supabase, body, adminUser.id);
  }

  if (body.action === "process") {
    return await processBatch(supabase, body.job_id);
  }

  if (body.action === "cancel") {
    return await cancelJob(supabase, body.job_id);
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}

async function startJob(
  supabase: Awaited<ReturnType<typeof createClient>>,
  body: StartRequest,
  userId: string,
) {
  // Verificar que la fuente existe y es activa
  const { data: source, error } = await supabase
    .from("data_sources")
    .select("id, name, type, scraper_strategy, base_url, catalog_url, scraper_config, is_active, laboratory_id")
    .eq("id", body.data_source_id)
    .single();

  if (error || !source) {
    return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
  }

  if (!source.is_active) {
    return NextResponse.json({ error: "La fuente está desactivada" }, { status: 400 });
  }

  if (source.type !== "scraper") {
    return NextResponse.json({ error: "Esta fuente no es de tipo scraper" }, { status: 400 });
  }

  // Verificar que no hay otro job corriendo para esta fuente
  const { data: running } = await supabase
    .from("scraping_jobs")
    .select("id")
    .eq("data_source_id", body.data_source_id)
    .in("status", ["pending", "running"])
    .maybeSingle();

  if (running) {
    return NextResponse.json(
      { error: "Ya hay un job corriendo para esta fuente", existing_job_id: running.id },
      { status: 409 },
    );
  }

  // Test de conexión antes de empezar
  const scraper = getScraper({
    base_url: source.base_url ?? "",
    catalog_url: source.catalog_url,
    scraper_strategy: source.scraper_strategy ?? "woocommerce",
    scraper_config: source.scraper_config ?? {},
  });

  const testResult = await scraper.testConnection();
  if (!testResult.ok) {
    return NextResponse.json(
      { error: `Conexión falló: ${testResult.message}` },
      { status: 400 },
    );
  }

  // Crear job
  const { data: job, error: jobError } = await supabase
    .from("scraping_jobs")
    .insert({
      data_source_id: body.data_source_id,
      triggered_by: userId,
      status: "running",
      batch_size: body.batch_size ?? 1,
      products_found: testResult.total_products ?? 0,
    })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { error: jobError?.message ?? "Error creando job" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    job_id: job.id,
    estimated_total: testResult.total_products ?? null,
    batch_size: job.batch_size,
    message: testResult.message,
  });
}

async function processBatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
) {
  const { data: job, error: jobError } = await supabase
    .from("scraping_jobs")
    .select(
      `id, data_source_id, status, batch_size, last_offset, total_pages,
       products_found, products_created, products_updated, products_skipped, products_failed,
       data_sources!inner(id, name, base_url, catalog_url, scraper_strategy, scraper_config, laboratory_id,
         laboratories!inner(id, slug))`,
    )
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
  }

  if (job.status === "cancelled") {
    return NextResponse.json({ status: "cancelled", message: "Job cancelado" });
  }

  if (job.status === "completed") {
    return NextResponse.json({ status: "completed", message: "Job ya finalizado" });
  }

  const ds = (Array.isArray(job.data_sources) ? job.data_sources[0] : job.data_sources) as {
    id: string;
    name: string;
    base_url: string;
    catalog_url: string | null;
    scraper_strategy: string;
    scraper_config: Record<string, unknown>;
    laboratory_id: string;
    laboratories: { id: string; slug: string } | { id: string; slug: string }[];
  };
  const lab = Array.isArray(ds.laboratories) ? ds.laboratories[0] : ds.laboratories;

  const scraper = getScraper({
    base_url: ds.base_url,
    catalog_url: ds.catalog_url,
    scraper_strategy: ds.scraper_strategy,
    scraper_config: ds.scraper_config,
  });

  const currentPage = Math.floor(job.last_offset / job.batch_size) + 1;

  let batchResult;
  try {
    batchResult = await scraper.fetchBatch(currentPage, job.batch_size);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await supabase
      .from("scraping_jobs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return NextResponse.json({ status: "failed", error: message }, { status: 500 });
  }

  // Procesar cada producto del lote
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ name: string; error: string }> = [];

  for (const product of batchResult.products) {
    try {
      const result = await upsertProduct(
        supabase,
        product,
        ds.id,
        lab.id,
        lab.slug,
      );
      if (result === "created") created++;
      else if (result === "updated") updated++;
      else skipped++;
    } catch (error) {
      failed++;
      errors.push({
        name: product.name,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  // Actualizar job
  const newOffset = job.last_offset + batchResult.products.length;
  const isComplete = !batchResult.has_more || batchResult.products.length === 0;

  const updates: Record<string, unknown> = {
    last_offset: newOffset,
    total_pages: batchResult.total_pages,
    products_created: job.products_created + created,
    products_updated: job.products_updated + updated,
    products_skipped: job.products_skipped + skipped,
    products_failed: job.products_failed + failed,
  };

  if (isComplete) {
    updates.status = "completed";
    updates.completed_at = new Date().toISOString();

    // Actualizar estadísticas en data_sources
    await supabase
      .from("data_sources")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: failed > 0 ? "partial" : "success",
        last_run_products_found: newOffset,
      })
      .eq("id", ds.id);
  }

  await supabase.from("scraping_jobs").update(updates).eq("id", jobId);

  return NextResponse.json({
    status: isComplete ? "completed" : "running",
    batch: {
      processed: batchResult.products.length,
      created,
      updated,
      skipped,
      failed,
      errors: errors.slice(0, 5),
    },
    progress: {
      total_processed: newOffset,
      total_pages: batchResult.total_pages,
      current_page: currentPage,
      has_more: !isComplete,
    },
    totals: {
      created: job.products_created + created,
      updated: job.products_updated + updated,
      skipped: job.products_skipped + skipped,
      failed: job.products_failed + failed,
    },
  });
}

async function cancelJob(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
) {
  await supabase
    .from("scraping_jobs")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .in("status", ["pending", "running"]);

  return NextResponse.json({ status: "cancelled" });
}

/**
 * Inserta o actualiza un producto. Detecta duplicado por (data_source_id, external_id).
 *
 * Política de actualización:
 * - El precio del laboratorio ES el precio público (ellos venden a PVP, nosotros compramos a precio distribuidor).
 * - Cuando el lab cambia precio, lo aplicamos (a menos que el admin haya editado manualmente price_cop).
 * - NO sobrescribimos: status, category_id, tax_rate_id, tags (decisiones del admin).
 */
async function upsertProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  product: ScrapedProduct,
  dataSourceId: string,
  laboratoryId: string,
  laboratorySlug: string,
): Promise<"created" | "updated" | "skipped"> {
  // Buscar producto existente
  const { data: existing } = await supabase
    .from("products")
    .select("id, price_cop, source_price_cop")
    .eq("data_source_id", dataSourceId)
    .eq("external_id", product.external_id)
    .maybeSingle();

  // Encontrar tax rate default
  const { data: defaultTax } = await supabase
    .from("tax_rates")
    .select("id")
    .eq("is_default", true)
    .single();

  // Generar slug único: lab + nombre + sufijo de presentación (para diferenciar variantes)
  // Ej: "millenium-isolate-whey-protein-vainilla-1360g"
  //     "millenium-isolate-whey-protein-vainilla-2270g"  ← misma proteína, distinto contenido
  const baseSlug = product.external_slug ?? slugify(product.name);
  const presentationSuffix = buildPresentationSuffix(product);
  let uniqueSlug = `${laboratorySlug}-${baseSlug}${presentationSuffix}`.substring(0, 100);

  // Si por algún motivo aún colisiona (ej. dos sabores con misma presentación y mismo nombre base),
  // agregar sufijo del external_id para garantizar unicidad
  const { data: slugCollision } = await supabase
    .from("products")
    .select("id, data_source_id, external_id")
    .eq("slug", uniqueSlug)
    .maybeSingle();

  if (
    slugCollision &&
    !(
      slugCollision.data_source_id === dataSourceId &&
      slugCollision.external_id === product.external_id
    )
  ) {
    uniqueSlug = `${uniqueSlug.substring(0, 90)}-${product.external_id}`;
  }

  const productData: Record<string, unknown> = {
    laboratory_id: laboratoryId,
    data_source_id: dataSourceId,
    external_id: product.external_id,
    name: product.name,
    slug: uniqueSlug,
    description: product.description,
    short_description: product.short_description,
    ingredients: product.composition,
    usage_instructions: product.usage_instructions,
    invima_number: product.invima_number,
    presentation: product.presentation,
    presentation_type: product.presentation_type,
    content_value: product.content_value,
    content_unit: product.content_unit,
    weight_grams: product.weight_grams,
    source_url: product.source_url,
    source_price_cop: product.source_price_cop,
    source_price_updated_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    source_type: "lab_partner",
    tax_rate_id: defaultTax?.id,
    scraped_at: new Date().toISOString(),
  };

  let productId: string;

  if (existing) {
    // Producto existente: actualizar datos del lab.
    // Si el admin NO había editado manualmente el precio (price_cop === source_price_cop_anterior),
    // entonces actualizamos price_cop al nuevo precio del lab.
    const adminEditedPrice =
      existing.source_price_cop !== null &&
      existing.price_cop !== existing.source_price_cop;

    const updateData = adminEditedPrice
      ? productData // mantener price_cop actual
      : { ...productData, price_cop: product.source_price_cop };

    const { error: updateError } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", existing.id);

    if (updateError) throw new Error(updateError.message);

    productId = existing.id;
    await syncProductImages(supabase, productId, product.images, laboratorySlug, product.external_id);

    return "updated";
  }

  // Producto nuevo: precio del lab = precio público
  const { data: created, error: createError } = await supabase
    .from("products")
    .insert({
      ...productData,
      price_cop: product.source_price_cop,
      status: "draft", // requiere aprobación del admin antes de salir al público
      needs_review: true,
    })
    .select()
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Error creando producto");
  }

  productId = created.id;
  await syncProductImages(supabase, productId, product.images, laboratorySlug, product.external_id);

  return "created";
}

/**
 * Genera sufijo de slug basado en presentación.
 * Ej: { type: "softgels", value: 60, unit: "units" } → "-60u"
 * Ej: { type: "powder", value: 1360, unit: "g" } → "-1360g"
 */
function buildPresentationSuffix(product: ScrapedProduct): string {
  if (!product.content_value || !product.content_unit) return "";
  const value = Math.round(product.content_value);
  const unit = product.content_unit === "units" ? "u" : product.content_unit;
  return `-${value}${unit}`;
}

async function syncProductImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  images: ScrapedProduct["images"],
  laboratorySlug: string,
  externalId: string,
) {
  if (images.length === 0) return;

  // Borrar imagenes previas de este producto en BD (las del storage quedan, se sobrescriben con upsert)
  await supabase.from("product_images").delete().eq("product_id", productId);

  // Procesar máximo 5 imágenes por producto
  const toProcess = images.slice(0, 5);

  for (let i = 0; i < toProcess.length; i++) {
    const img = toProcess[i];
    const publicUrl = await downloadAndUploadImage(
      supabase,
      img.url,
      laboratorySlug,
      externalId,
      i,
    );

    if (publicUrl) {
      await supabase.from("product_images").insert({
        product_id: productId,
        url: publicUrl,
        alt_text: img.alt,
        sort_order: i,
        is_primary: i === 0,
      });
    }
  }
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
