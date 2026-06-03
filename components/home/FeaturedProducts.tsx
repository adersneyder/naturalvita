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
      <div className="flex items-end justify-between gap-4 mb-8 sm:mb-12">
        <div>
          <p className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.13em] text-[var(--color-leaf-700)] mb-3">
            <span aria-hidden className="inline-block w-7 h-[2px] rounded-full bg-[var(--color-leaf-700)]" />
            Selección
          </p>
          <h2
            id="featured-heading"
            className="font-serif text-3xl sm:text-4xl text-[var(--color-leaf-900)] leading-[1.1] tracking-[-0.02em]"
          >
            Lo mejor del mes
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--color-earth-700)] max-w-md leading-relaxed">
            Productos escogidos con criterio para acompañar cada etapa de la
            vida.
          </p>
        </div>
        <Link
          href="/tienda"
          className="group shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-iris-700)] text-white text-sm font-semibold shadow-[0_1px_2px_rgba(74,46,154,0.08),0_8px_24px_rgba(74,46,154,0.22)] hover:shadow-[0_2px_4px_rgba(74,46,154,0.10),0_16px_32px_rgba(74,46,154,0.28)] hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-iris-700)]"
        >
          Ver todo
          <span aria-hidden className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
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
