import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "../_components/Breadcrumbs";
import FilterSidebar from "../_components/FilterSidebar";
import ProductGrid from "../_components/ProductGrid";
import Pagination from "../_components/Pagination";
import SortBar from "../_components/SortBar";
import {
  listProducts,
  listFilterableAttributes,
  listActiveLaboratories,
  listActiveCategoriesTree,
  listActiveCollections,
  listFeaturedCollections,
  listFeaturedProductThumbnails,
  getPriceRange,
  type CatalogSort,
} from "@/lib/catalog/listing-queries";
import {
  loadCatalogSearchParams,
  buildSearchParams,
} from "@/lib/catalog/search-params";

export const metadata: Metadata = {
  title: "Tienda · Suplementos y productos naturales",
  description:
    "Catálogo completo de NaturalVita: vitaminas, fitoterápicos, dermocosmética, esencias florales y suplementos deportivos con registro INVIMA.",
  alternates: { canonical: "https://naturalvita.co/tienda" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const revalidate = 300;

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const filters = await loadCatalogSearchParams(sp);

  // Detectamos si el usuario aplicó algún filtro: si no, mostramos la
  // landing curada (hero + colecciones + listado). Si sí, mostramos
  // directamente la grilla filtrada (más rápido cognitivamente).
  const hasAnyFilter =
    !!filters.cat ||
    filters.col.length > 0 ||
    filters.lab.length > 0 ||
    filters.attrs.length > 0 ||
    filters.min != null ||
    filters.max != null ||
    !!filters.q ||
    filters.instock ||
    filters.p > 1 ||
    filters.sort !== "relevance";

  const [
    pageData,
    attributes,
    laboratories,
    categoriesTree,
    collections,
    priceRange,
    featuredCollections,
    bestSellersMosaic,
  ] = await Promise.all([
    listProducts(
      {
        categorySlug: filters.cat,
        collectionSlugs: filters.col,
        laboratorySlugs: filters.lab,
        attributeOptionSlugs: filters.attrs,
        priceMin: filters.min,
        priceMax: filters.max,
        inStockOnly: filters.instock,
        q: filters.q,
      },
      filters.sort as CatalogSort,
      { page: filters.p, pageSize: 24 },
    ),
    listFilterableAttributes(),
    listActiveLaboratories(),
    listActiveCategoriesTree(),
    listActiveCollections(),
    getPriceRange(),
    hasAnyFilter ? Promise.resolve([]) : listFeaturedCollections(4),
    // El cover de "Más vendidos" se arma como mosaico con productos
    // destacados reales del catálogo, no con foto externa. Siempre
    // refleja el catálogo actual y mantiene armonía con la grilla.
    hasAnyFilter ? Promise.resolve([]) : listFeaturedProductThumbnails(4),
  ]);

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: "https://naturalvita.co",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Tienda",
        item: "https://naturalvita.co/tienda",
      },
    ],
  };

  function hrefForPage(p: number) {
    return `/tienda${buildSearchParams({ ...filters, p })}`;
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />

      {/* Hero superior compacto. El catálogo es el protagonista; el hero solo
          orienta. Mantenemos breadcrumbs + título corto + tagline breve. */}
      {!hasAnyFilter ? (
        <section className="bg-[var(--color-earth-50)] border-b border-[var(--color-earth-100)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-5 md:pt-6 md:pb-7">
            <Breadcrumbs items={[{ label: "Tienda" }]} />
            <div className="mt-2 md:mt-3 max-w-3xl">
              <h1 className="font-serif text-xl md:text-3xl text-[var(--color-leaf-900)] tracking-tight leading-tight">
                Productos naturales seleccionados con criterio.
              </h1>
              <p className="mt-1.5 md:mt-2 text-sm md:text-base text-[var(--color-earth-700)] leading-snug">
                Suplementos, vitaminas, fitoterápicos y dermocosmética de los
                laboratorios más reconocidos de Colombia.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-3 md:pt-5 md:pb-4">
          <Breadcrumbs items={[{ label: "Tienda" }]} />
          <header className="mt-3 mb-3 max-w-2xl">
            <h1 className="font-serif text-2xl md:text-3xl text-[var(--color-leaf-900)] tracking-tight">
              Tienda
            </h1>
          </header>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-8 md:pt-6 md:pb-12">
        {/* Bloque curado (solo en landing limpia): colecciones destacadas.
            El carrusel de productos destacados se removió: los destacados
            viven ahora en el Home. La tienda va directa al catálogo. */}
        {!hasAnyFilter && featuredCollections.length > 0 && (
          <section className="mb-8 md:mb-12">
            <div className="flex items-end justify-between mb-3 md:mb-5">
              <h2 className="font-serif text-xl md:text-2xl text-[var(--color-leaf-900)]">
                Colecciones destacadas
              </h2>
            </div>
            <ul
              role="list"
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
            >
              {featuredCollections.map((c) => {
                // "Más vendidos" usa mosaico de productos destacados reales
                // en lugar de foto externa. Si no hay 4 thumbnails (catálogo
                // pequeño) caemos al cover_image_url normal.
                const useMosaic =
                  c.slug === "mas-vendidos" && bestSellersMosaic.length >= 4;
                return (
                <li key={c.slug}>
                  <Link
                    href={`/coleccion/${c.slug}`}
                    className="group block rounded-xl md:rounded-2xl overflow-hidden bg-[var(--color-earth-50)] hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-square md:aspect-[4/3] bg-white">
                      {useMosaic ? (
                        <div className="grid grid-cols-2 grid-rows-2 gap-px w-full h-full bg-[var(--color-earth-100)]">
                          {bestSellersMosaic.slice(0, 4).map((thumb, idx) => (
                            <div
                              key={idx}
                              className="relative bg-white overflow-hidden"
                            >
                              <Image
                                src={thumb.url}
                                alt={thumb.alt ?? c.name}
                                fill
                                sizes="(max-width: 640px) 25vw, 12vw"
                                className="object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                              />
                            </div>
                          ))}
                        </div>
                      ) : c.cover_image_url ? (
                        <Image
                          src={c.cover_image_url}
                          alt={c.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-serif text-[var(--color-leaf-700)]/30 text-3xl">
                          {c.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="p-3 md:p-4">
                      <h3 className="font-serif text-sm md:text-base text-[var(--color-leaf-900)] group-hover:text-[var(--color-iris-700)] transition-colors line-clamp-1">
                        {c.name}
                      </h3>
                      {c.description && (
                        <p className="hidden md:block text-xs text-[var(--color-earth-700)] mt-1 line-clamp-2">
                          {c.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Listado completo: con filtros si los hay, "todo el catálogo" si no */}
        <section>
          {!hasAnyFilter && (
            <h2 className="font-serif text-xl md:text-2xl text-[var(--color-leaf-900)] mb-3 md:mb-5">
              Todo el catálogo
            </h2>
          )}
          <div className="grid lg:grid-cols-[260px_1fr] gap-8">
            <FilterSidebar
              categories={categoriesTree}
              collections={collections}
              laboratories={laboratories}
              attributes={attributes}
              priceRange={priceRange}
              totalResults={pageData.total}
            />

            <div>
              <SortBar total={pageData.total} />
              <ProductGrid products={pageData.products} />
              <Pagination
                page={pageData.page}
                totalPages={pageData.totalPages}
                hrefFor={hrefForPage}
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
