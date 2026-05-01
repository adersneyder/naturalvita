import type { Metadata } from "next";
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

export const revalidate = 300; // 5 min

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const filters = await loadCatalogSearchParams(sp);

  const [
    pageData,
    attributes,
    laboratories,
    categoriesTree,
    collections,
    priceRange,
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <Breadcrumbs items={[{ label: "Tienda" }]} />

        <header className="mt-6 mb-8 max-w-2xl">
          <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight">
            Tienda
          </h1>
          <p className="mt-2 text-[var(--color-earth-700)] text-base leading-relaxed">
            Suplementos, fitoterápicos y productos naturales seleccionados de los
            mejores laboratorios de Colombia.
          </p>
        </header>

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
      </div>
    </>
  );
}
