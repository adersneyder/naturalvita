import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin-auth";
import { getScraper } from "@/lib/scrapers";
import { downloadAndUploadImage } from "@/lib/scrapers/image-downloader";

export const maxDuration = 60;

type RequestBody = {
  data_source_id: string;
  page?: number;
  only_missing?: boolean; // default true: solo procesar productos sin imágenes
};

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();
    if (!["owner", "admin"].includes(adminUser.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = (await request.json()) as RequestBody;
    if (!body.data_source_id) {
      return NextResponse.json({ error: "data_source_id requerido" }, { status: 400 });
    }

    return await processRedownload(body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[/api/products/redownload-images] Error no controlado:", error);
    return NextResponse.json(
      { error: `Falló la re-descarga: ${message}` },
      { status: 500 },
    );
  }
}

async function processRedownload(body: RequestBody) {
  const onlyMissing = body.only_missing !== false;
  const page = body.page && body.page > 0 ? body.page : 1;
  const batchSize = 1; // un producto por llamada para feedback granular y evitar timeout

  const supabase = await createClient();
  const storageClient = createAdminClient();

  const { data: source, error: sourceError } = await supabase
    .from("data_sources")
    .select(
      "id, name, type, scraper_strategy, base_url, catalog_url, scraper_config, is_active, laboratory_id, laboratories!inner(id, slug)",
    )
    .eq("id", body.data_source_id)
    .single();

  if (sourceError || !source) {
    return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
  }

  if (source.type !== "scraper") {
    return NextResponse.json(
      { error: "Solo aplicable a fuentes de tipo scraper" },
      { status: 400 },
    );
  }

  const lab = Array.isArray(source.laboratories) ? source.laboratories[0] : source.laboratories;
  if (!lab) {
    return NextResponse.json({ error: "Laboratorio no encontrado" }, { status: 500 });
  }

  const scraper = getScraper({
    base_url: source.base_url ?? "",
    catalog_url: source.catalog_url,
    scraper_strategy: source.scraper_strategy ?? "woocommerce",
    scraper_config: source.scraper_config ?? {},
  });

  let batchResult;
  try {
    batchResult = await scraper.fetchBatch(page, batchSize);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: `Scraper falló: ${message}` }, { status: 500 });
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  const errors: Array<{ name: string; error: string }> = [];

  for (const scrapedProduct of batchResult.products) {
    processed++;

    // Buscar producto en BD
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("data_source_id", source.id)
      .eq("external_id", scrapedProduct.external_id)
      .maybeSingle();

    if (!existing) {
      skipped++;
      continue;
    }

    // Verificar imágenes existentes si only_missing=true
    if (onlyMissing) {
      const { count: existingImagesCount } = await supabase
        .from("product_images")
        .select("*", { count: "exact", head: true })
        .eq("product_id", existing.id);

      if ((existingImagesCount ?? 0) > 0) {
        skipped++;
        continue;
      }
    }

    if (scrapedProduct.images.length === 0) {
      skipped++;
      continue;
    }

    // Si no es only_missing, borrar imágenes existentes para reemplazarlas
    if (!onlyMissing) {
      await supabase.from("product_images").delete().eq("product_id", existing.id);
    }

    let imagesAdded = 0;
    const imageErrors: string[] = [];
    const toProcess = scrapedProduct.images.slice(0, 5);

    for (let i = 0; i < toProcess.length; i++) {
      const img = toProcess[i];
      const result = await downloadAndUploadImage(
        storageClient,
        img.url,
        lab.slug,
        scrapedProduct.external_id,
        i,
      );

      if (result.url) {
        await supabase.from("product_images").insert({
          product_id: existing.id,
          url: result.url,
          alt_text: img.alt,
          sort_order: i,
          is_primary: imagesAdded === 0,
        });
        imagesAdded++;
      } else if (result.error) {
        imageErrors.push(`#${i}: ${result.error}`);
      }
    }

    const now = new Date().toISOString();
    await supabase
      .from("products")
      .update({
        last_image_error: imagesAdded > 0 ? null : imageErrors.join(" | ").slice(0, 500),
        last_image_attempt_at: now,
      })
      .eq("id", existing.id);

    if (imagesAdded > 0) {
      succeeded++;
    } else {
      failed++;
      errors.push({
        name: scrapedProduct.name,
        error: imageErrors[0] ?? "No se pudo descargar ninguna imagen",
      });
    }
  }

  return NextResponse.json({
    page,
    has_more: batchResult.has_more,
    total_pages: batchResult.total_pages,
    batch: {
      processed,
      succeeded,
      failed,
      skipped,
      errors: errors.slice(0, 5),
    },
  });
}
