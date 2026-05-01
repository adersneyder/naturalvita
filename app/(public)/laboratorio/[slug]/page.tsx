import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Breadcrumbs from "../../_components/Breadcrumbs";
import FilterSidebar from "../../_components/FilterSidebar";
import ProductGrid from "../../_components/ProductGrid";
import Pagination from "../../_components/Pagination";
import SortBar from "../../_components/SortBar";
import {
  listProducts,
  listFilterableAttributes,
  listActiveCollections,
  listActiveCategoriesTree,
  getPriceRange,
  getLaboratoryBySlug,
  type CatalogSort,
} from "@/lib/catalog/listing-queries";
import {
  loadCatalogSearchParams,
  buildSearchParams,
} from "@/lib/catalog/search-params";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const lab = await getLaboratoryBySlug(slug);
  if (!lab)
    return { title: "Laboratorio no encontrado", robots: { index: false } };
  return {
    title: `${lab.name} · Laboratorio`,
    description:
      lab.description ??
      `Productos del laboratorio ${lab.name} disponibles en NaturalVita.`,
    alternates: {
      canonical: `https://naturalvita.co/laboratorio/${lab.slug}`,
    },
  };
}

export default async function LaboratoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const lab = await getLaboratoryBySlug(slug);
  if (!lab) notFound();

  const filters = await loadCatalogSearchParams(sp);

  const [
    pageData,
    attributes,
    collections,
    categoriesTree,
    priceRange,
  ] = await Promise.all([
    listProducts(
      {
        laboratorySlugs: [lab.slug], // contexto fijo
        categorySlug: filters.cat,
        collectionSlugs: filters.col,
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
    listActiveCollections(),
    listActiveCategoriesTree(),
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
      {
        "@type": "ListItem",
        position: 3,
        name: lab.name,
        item: `https://naturalvita.co/laboratorio/${lab.slug}`,
      },
    ],
  };

  function hrefForPage(p: number) {
    return `/laboratorio/${lab!.slug}${buildSearchParams({ ...filters, p })}`;
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <Breadcrumbs
          items={[
            { label: "Tienda", href: "/tienda" },
            { label: lab.name },
          ]}
        />

        <header className="mt-6 mb-8 flex items-start gap-5">
          {lab.logo_url && (
            <div className="hidden sm:block w-24 h-24 rounded-2xl bg-white border border-[var(--color-earth-100)] p-3 shrink-0">
              <Image
                src={lab.logo_url}
                alt={`Logo de ${lab.name}`}
                width={96}
                height={96}
                className="w-full h-full object-contain"
                unoptimized
              />
            </div>
          )}
          <div className="max-w-2xl">
            <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight">
              {lab.name}
            </h1>
            {lab.description && (
              <p className="mt-2 text-[var(--color-earth-700)] text-base leading-relaxed">
                {lab.description}
              </p>
            )}
          </div>
        </header>

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <FilterSidebar
            categories={categoriesTree}
            collections={collections}
            attributes={attributes}
            priceRange={priceRange}
            totalResults={pageData.total}
            hideLaboratories
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
