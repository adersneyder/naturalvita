import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { BrandOgCard, OG_SIZE } from "@/lib/og/brand-card";

/**
 * OG dinámica por categoría. Cuando alguien comparte
 * /categoria/vitaminas-y-minerales en WhatsApp/redes, sale una tarjeta
 * brandeada con el nombre de la categoría y conteo de productos en vez
 * de la OG genérica del sitio.
 *
 * Usa supabase-js directo (sin cookies): los datos son públicos y este
 * contexto de generación de imagen no tiene request cookies.
 */

export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 86400;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: cat } = await supabase
    .from("categories")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  let productCount = 0;
  if (cat) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", cat.id)
      .eq("status", "active");
    productCount = count ?? 0;
  }

  return new ImageResponse(
    (
      <BrandOgCard
        eyebrow="Categoría"
        title={cat?.name ?? "Catálogo"}
        subtitle={
          productCount > 0
            ? `${productCount} productos con registro INVIMA`
            : "Productos naturales con registro INVIMA"
        }
      />
    ),
    size,
  );
}
