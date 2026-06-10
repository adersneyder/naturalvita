import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { BrandOgCard, OG_SIZE } from "@/lib/og/brand-card";

/** OG dinámica por laboratorio aliado. */

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

  const { data: lab } = await supabase
    .from("laboratories")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  let productCount = 0;
  if (lab) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("laboratory_id", lab.id)
      .eq("status", "active");
    productCount = count ?? 0;
  }

  return new ImageResponse(
    (
      <BrandOgCard
        eyebrow="Laboratorio aliado"
        title={lab?.name ?? "Laboratorio"}
        subtitle={
          productCount > 0
            ? `${productCount} productos en NaturalVita`
            : "Laboratorio verificado con registro INVIMA"
        }
      />
    ),
    size,
  );
}
