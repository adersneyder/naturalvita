import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import PriceTag from "../../_components/PriceTag";
import StockBadge from "../../_components/StockBadge";

type Props = {
  currentProductId: string;
  categoryId: string;
  categoryName: string;
};

/**
 * Muestra hasta 4 productos relacionados de la misma categoría,
 * priorizando los que tienen ai_metadata (ficha editorial generada)
 * y los marcados como is_featured.
 */
export default async function RelatedProducts({
  currentProductId,
  categoryId,
  categoryName,
}: Props) {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select(
      `id, slug, name, presentation, price_cop, compare_at_price_cop, stock, track_stock,
       short_description,
       images:product_images!inner(url, is_primary)`,
    )
    .eq("category_id", categoryId)
    .eq("status", "active")
    .neq("id", currentProductId)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(4);

  if (!products || products.length === 0) return null;

  return (
    <section className="mt-16 lg:mt-24 border-t border-[var(--color-earth-100)] pt-12">
      <div className="flex items-baseline justify-between mb-6 gap-4 flex-wrap">
        <h2 className="font-serif text-2xl md:text-3xl text-[var(--color-leaf-900)] m-0">
          Más en {categoryName}
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map((p) => {
          const primary =
            (p.images ?? []).find((im) => im.is_primary)?.url ?? p.images?.[0]?.url;
          if (!primary) return null;
          return (
            <Link
              key={p.id}
              href={`/producto/${p.slug}`}
              className="group block"
            >
              <div className="aspect-square bg-[var(--color-earth-50)] rounded-xl overflow-hidden mb-3">
                <Image
                  src={primary}
                  alt={p.name}
                  width={400}
                  height={400}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
              </div>
              <h3 className="font-medium text-sm text-[var(--color-leaf-900)] m-0 mb-1 line-clamp-2 group-hover:text-[var(--color-iris-700)] transition-colors">
                {p.name}
              </h3>
              {p.presentation && (
                <p className="text-xs text-[var(--color-earth-700)] m-0 mb-2">{p.presentation}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <PriceTag price={p.price_cop} compareAtPrice={p.compare_at_price_cop} size="sm" />
                <StockBadge stock={p.stock} trackStock={p.track_stock} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
