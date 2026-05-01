import { ProductGridSkeleton } from "./_components/ProductGrid";

/**
 * Loading state que cubre todas las rutas del catálogo:
 * /tienda, /categoria/[slug], /coleccion/[slug], /laboratorio/[slug].
 *
 * Layout simplificado: hero placeholder + grilla de skeletons.
 */
export default function CatalogLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      <div className="h-3 w-32 bg-[var(--color-earth-100)] rounded animate-pulse" />
      <div className="mt-6 mb-8 max-w-2xl space-y-3">
        <div className="h-9 w-2/3 bg-[var(--color-earth-100)] rounded animate-pulse" />
        <div className="h-4 w-full bg-[var(--color-earth-50)] rounded animate-pulse" />
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className="hidden lg:block space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-[var(--color-earth-100)] rounded animate-pulse" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className="h-3 w-full bg-[var(--color-earth-50)] rounded animate-pulse"
                />
              ))}
            </div>
          ))}
        </aside>

        <div>
          <div className="flex justify-between mb-5 pb-4 border-b border-[var(--color-earth-100)]">
            <div className="h-3 w-24 bg-[var(--color-earth-100)] rounded animate-pulse" />
            <div className="h-8 w-40 bg-[var(--color-earth-100)] rounded animate-pulse" />
          </div>
          <ProductGridSkeleton count={12} />
        </div>
      </div>
    </div>
  );
}
