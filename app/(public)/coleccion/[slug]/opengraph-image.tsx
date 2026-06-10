import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { BrandOgCard, OG_SIZE } from "@/lib/og/brand-card";

/**
 * OG dinámica por colección. Fallback brandeado: si la colección tiene
 * cover_image_url, la metadata explícita de la página la usa y este
 * archivo no aplica; si NO tiene cover, sale esta tarjeta en vez de nada.
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

  const { data: col } = await supabase
    .from("collections")
    .select("name, description")
    .eq("slug", slug)
    .maybeSingle();

  return new ImageResponse(
    (
      <BrandOgCard
        eyebrow="Colección"
        title={col?.name ?? "Colección"}
        subtitle={
          col?.description?.slice(0, 80) ??
          "Selección curada de productos naturales"
        }
      />
    ),
    size,
  );
}
