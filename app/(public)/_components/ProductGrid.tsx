import type { PublicProductSummary } from "@/lib/catalog/types";
import ProductCard from "./ProductCard";

type Props = {
  products: PublicProductSummary[];
  /** Cuántas tarjetas marcar con priority (above-the-fold). Default 4. */
  priorityCount?: number;
};

/**
 * Grilla responsive de productos.
 *   - 2 columnas en mobile
 *   - 3 columnas en tablet
 *   - 4 columnas en desktop
 *
 * Decisión de diseño: 4 cols en desktop ancho (no 3) para aprovechar
 * pantallas grandes sin que las tarjetas se vean infladas. La calidad
 * de imagen lo permite (aspect-square con object-contain sobre crema).
 */
export default function ProductGrid({ products, priorityCount = 4 }: Props) {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--color-earth-700)] text-sm">
          No encontramos productos con esos filtros.
        </p>
        <p className="text-[var(--color-earth-500)] text-xs mt-2">
          Prueba ajustando o limpiando los filtros.
        </p>
      </div>
    );
  }

  return (
    <ul
      role="list"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
    >
      {products.map((p, idx) => (
        <li key={p.id}>
          <ProductCard product={p} priority={idx < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <ul
      role="list"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="rounded-2xl overflow-hidden">
          <div className="aspect-square bg-[var(--color-earth-50)] animate-pulse" />
          <div className="px-3 py-4 space-y-2">
            <div className="h-2.5 w-1/3 bg-[var(--color-earth-100)] rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-[var(--color-earth-100)] rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-[var(--color-earth-100)] rounded animate-pulse" />
            <div className="h-5 w-1/2 bg-[var(--color-earth-100)] rounded animate-pulse mt-3" />
          </div>
        </li>
      ))}
    </ul>
  );
}
