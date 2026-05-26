import Link from "next/link";
import ProductCard from "@/app/(public)/_components/ProductCard";
import { getFeaturedProducts } from "@/lib/catalog/home-featured";

/**
 * Sección "Selección destacada" del Home.
 *
 * Server Component: corre la cascada getFeaturedProducts() en el servidor,
 * no envía JS al cliente. Reutiliza el ProductCard de la tienda para
 * coherencia visual total (mismo hover, precio, badges, enlace a ficha).
 *
 * Si la cascada devolviera vacío (catálogo sin productos con imagen, caso
 * teórico), la sección no se renderiza — nada de huecos en el Home.
 *
 * Grilla: 2 columnas en móvil, 3 en tablet+ → 6 productos = 3×2 limpio.
 */
export default async function FeaturedProducts() {
  const products = await getFeaturedProducts(6);

  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-heading"
      className="mx-auto max-w-6xl px-4 py-14 sm:py-20"
    >
      <div className="flex items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <h2
            id="featured-heading"
            className="font-serif text-2xl sm:text-3xl text-[var(--color-leaf-900)] leading-tight"
          >
            Selección destacada
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[var(--color-earth-700)] max-w-md">
            Lo natural, escogido con criterio para acompañar cada etapa de la
            vida.
          </p>
        </div>
        <Link
          href="/tienda"
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-iris-700)] hover:text-[var(--color-iris-600)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-iris-700)] rounded"
        >
          Ver todo
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={i < 3}
          />
        ))}
      </div>
    </section>
  );
}
