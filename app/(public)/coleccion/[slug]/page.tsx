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
  listActiveLaboratories,
  listActiveCategoriesTree,
  getPriceRange,
  getCollectionBySlug,
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
  const c = await getCollectionBySlug(slug);
  if (!c) return { title: "Colección no encontrada", robots: { index: false } };
  return {
    title: c.meta_title ?? `${c.name} · Colección`,
    description:
      c.meta_description ??
      c.description ??
      `Productos seleccionados de la colección ${c.name}.`,
    alternates: {
      canonical: `https://naturalvita.co/coleccion/${c.slug}`,
    },
    openGraph: c.cover_image_url
      ? {
          images: [{ url: c.cover_image_url, alt: c.name }],
        }
      : undefined,
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const filters = await loadCatalogSearchParams(sp);

  const [
    pageData,
    attributes,
    laboratories,
    categoriesTree,
    priceRange,
  ] = await Promise.all([
    listProducts(
      {
        collectionSlugs: [collection.slug], // contexto fijo
        categorySlug: filters.cat,
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
        name: collection.name,
        item: `https://naturalvita.co/coleccion/${collection.slug}`,
      },
    ],
  };

  function hrefForPage(p: number) {
    return `/coleccion/${collection!.slug}${buildSearchParams({ ...filters, p })}`;
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />

      {/* Hero editorial: imagen + descripción en dos columnas en desktop */}
      {collection.cover_image_url ? (
        <section className="relative bg-[var(--color-earth-50)] border-b border-[var(--color-earth-100)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Breadcrumbs
                items={[
                  { label: "Tienda", href: "/tienda" },
                  { label: collection.name },
                ]}
              />
              <h1 className="font-serif text-3xl md:text-5xl text-[var(--color-leaf-900)] mt-4 tracking-tight">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="mt-4 text-[var(--color-earth-700)] text-base md:text-lg leading-relaxed max-w-prose">
                  {collection.description}
                </p>
              )}
            </div>
            <div className="relative aspect-[4/3] md:aspect-square rounded-2xl overflow-hidden bg-white">
              <Image
                src={collection.cover_image_url}
                alt={collection.name}
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          </div>
        </section>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
          <Breadcrumbs
            items={[
              { label: "Tienda", href: "/tienda" },
              { label: collection.name },
            ]}
          />
          <header className="mt-6 mb-2 max-w-2xl">
            <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="mt-2 text-[var(--color-earth-700)] text-base leading-relaxed">
                {collection.description}
              </p>
            )}
          </header>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <FilterSidebar
            categories={categoriesTree}
            laboratories={laboratories}
            attributes={attributes}
            priceRange={priceRange}
            totalResults={pageData.total}
            hideCollections
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
