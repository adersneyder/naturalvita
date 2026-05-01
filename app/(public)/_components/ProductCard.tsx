import Image from "next/image";
import Link from "next/link";
import type { PublicProductSummary } from "@/lib/catalog/types";
import { calculateDiscount, formatCop } from "@/lib/format/currency";

type Props = {
  product: PublicProductSummary;
  /** Si true, marca priority en la imagen (above the fold). */
  priority?: boolean;
};

/**
 * Tarjeta de producto reutilizable. Estética boutique:
 *   - Imagen 1:1 grande sobre fondo crema (var(--color-earth-50))
 *   - Hover sutil: imagen escala 1.03, sombra suave
 *   - Nombre en Fraunces para carácter editorial
 *   - Laboratorio en Inter pequeño, color earth-700
 *   - Precio destacado en leaf-900 con descuento tachado si aplica
 *   - Badge "-X%" sobre la imagen (esquina superior derecha) si hay descuento
 *   - Badge "Agotado" sobreimpuesto si stock_badge==="out"
 *
 * Sin INVIMA visible (decisión de marketing). Se ve solo en /producto/[slug].
 */
export default function ProductCard({ product, priority = false }: Props) {
  const isOut = product.stock_badge === "out";
  const discount = calculateDiscount(
    product.price_cop,
    product.compare_at_price_cop,
  );

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden bg-white transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-iris-700)]"
      aria-label={`Ver ${product.name}`}
    >
      {/* Imagen con badges sobreimpuestos */}
      <div className="relative aspect-square bg-[var(--color-earth-50)] overflow-hidden">
        {product.primary_image && (
          <Image
            src={product.primary_image.url}
            alt={product.primary_image.alt ?? product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-contain p-4 transition-transform duration-500 ease-out ${
              isOut ? "opacity-60 grayscale" : "group-hover:scale-[1.03]"
            }`}
            priority={priority}
            unoptimized
          />
        )}

        {/* Badge descuento esquina superior izquierda */}
        {discount !== null && !isOut && (
          <span className="absolute top-3 left-3 bg-[var(--color-iris-700)] text-white text-xs font-medium px-2 py-1 rounded-full tabular-nums">
            -{discount}%
          </span>
        )}

        {/* Badge agotado sobreimpuesto */}
        {isOut && (
          <span className="absolute inset-x-0 bottom-0 bg-[var(--color-earth-900)]/85 text-white text-xs font-medium text-center py-2 tracking-wide uppercase">
            Agotado
          </span>
        )}
      </div>

      {/* Información */}
      <div className="flex-1 flex flex-col px-3 py-4 gap-1.5">
        <p className="text-[11px] uppercase tracking-wider text-[var(--color-earth-500)] font-medium">
          {product.laboratory.name}
        </p>
        <h3 className="font-serif text-base text-[var(--color-leaf-900)] leading-snug line-clamp-2 group-hover:text-[var(--color-iris-700)] transition-colors">
          {product.name}
        </h3>
        {product.presentation && (
          <p className="text-xs text-[var(--color-earth-700)]">
            {product.presentation}
          </p>
        )}

        {/* Precio anclado abajo */}
        <div className="mt-auto pt-2 flex items-baseline gap-2 flex-wrap">
          <span className="text-base font-medium text-[var(--color-leaf-900)] tabular-nums">
            {formatCop(product.price_cop)}
          </span>
          {discount !== null && product.compare_at_price_cop && (
            <span className="text-xs text-[var(--color-earth-500)] line-through tabular-nums">
              {formatCop(product.compare_at_price_cop)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
