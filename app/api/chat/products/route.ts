import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickPrimaryImage, type ProductCardData } from "@/lib/chat/shared-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Datos de tarjeta para varios productos por slug. Lo usa el ChatWidget
 * para reconstruir las tarjetas al recargar una conversación (en el
 * stream en vivo, los datos llegan por SSE; al recargar el historial,
 * se piden aquí).
 *
 * GET /api/chat/products?slugs=a,b,c  (máx 20)
 * Devuelve solo productos activos. Público (lo llama el widget anónimo).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slugsParam = url.searchParams.get("slugs") ?? "";
  const slugs = slugsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (slugs.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .select(
      `slug, name, presentation, price_cop,
       images:product_images(url, is_primary, sort_order)`,
    )
    .eq("status", "active")
    .eq("is_active", true)
    .in("slug", slugs);

  const products: ProductCardData[] = (data ?? []).map((p) => ({
    slug: p.slug,
    name: p.name,
    presentation: p.presentation,
    price_cop: p.price_cop,
    image_url: pickPrimaryImage(
      p.images as Array<{ url: string; is_primary: boolean; sort_order: number }>,
    ),
  }));

  return NextResponse.json({ products });
}
