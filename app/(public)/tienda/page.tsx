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
  listFeaturedProducts,
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
  // landing curada (hero + colecciones + categorías + destacados + listado).
  // Si sí, mostramos directamente la grilla filtrada (más rápido cognitivamente).
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
    featuredProducts,
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
    hasAnyFilter ? Promise.resolve([]) : listFeaturedProducts(8),
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

      {/* Hero principal cuando NO hay filtros aplicados. Más generoso visualmente. */}
      {!hasAnyFilter ? (
        <section className="bg-[var(--color-earth-50)] border-b border-[var(--color-earth-100)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-16">
            <Breadcrumbs items={[{ label: "Tienda" }]} />
            <div className="mt-3 md:mt-4 max-w-3xl">
              <h1 className="font-serif text-2xl md:text-5xl text-[var(--color-leaf-900)] tracking-tight leading-tight">
                Productos naturales seleccionados con criterio.
              </h1>
              <p className="mt-2 md:mt-4 text-sm md:text-lg text-[var(--color-earth-700)] leading-relaxed">
                Suplementos, vitaminas, fitoterápicos y dermocosmética de los
                laboratorios más reconocidos de Colombia. Despacho a todo el país.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
          <Breadcrumbs items={[{ label: "Tienda" }]} />
          <header className="mt-6 mb-6 max-w-2xl">
            <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight">
              Tienda
            </h1>
          </header>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12">
        {/* Bloques curados (solo en landing limpia) */}
        {!hasAnyFilter && (
          <>
            {featuredCollections.length > 0 && (
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
                  {featuredCollections.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/coleccion/${c.slug}`}
                        className="group block rounded-xl md:rounded-2xl overflow-hidden bg-[var(--color-earth-50)] hover:shadow-md transition-shadow"
                      >
                        <div className="relative aspect-square md:aspect-[4/3] bg-white">
                          {c.cover_image_url ? (
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
                  ))}
                </ul>
              </section>
            )}

            {featuredProducts.length > 0 && (
              <section className="mb-8 md:mb-12">
                <div className="flex items-end justify-between mb-3 md:mb-5">
                  <h2 className="font-serif text-xl md:text-2xl text-[var(--color-leaf-900)]">
                    Destacados de la temporada
                  </h2>
                  <Link
                    href="/tienda?sort=newest"
                    className="text-sm text-[var(--color-iris-700)] hover:underline"
                  >
                    Ver todos
                  </Link>
                </div>
                <ProductGrid products={featuredProducts} priorityCount={4} />
              </section>
            )}
          </>
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
