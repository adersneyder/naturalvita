import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../_components/Breadcrumbs";
import FilterSidebar from "../../_components/FilterSidebar";
import ProductGrid from "../../_components/ProductGrid";
import Pagination from "../../_components/Pagination";
import SortBar from "../../_components/SortBar";
import {
  listProducts,
  listFilterableAttributes,
  listActiveLaboratories,
  listActiveCollections,
  getPriceRange,
  getCategoryBySlug,
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
  const cat = await getCategoryBySlug(slug);
  if (!cat) {
    return { title: "Categoría no encontrada", robots: { index: false } };
  }
  return {
    title: `${cat.name} · Tienda`,
    description:
      cat.description ??
      `Productos naturales de la categoría ${cat.name} con despacho a toda Colombia.`,
    alternates: {
      canonical: `https://naturalvita.co/categoria/${cat.slug}`,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();

  const filters = await loadCatalogSearchParams(sp);

  const [
    pageData,
    attributes,
    laboratories,
    collections,
    priceRange,
  ] = await Promise.all([
    listProducts(
      {
        categorySlug: cat.slug, // ← contexto fijo
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
      {
        "@type": "ListItem",
        position: 3,
        name: cat.name,
        item: `https://naturalvita.co/categoria/${cat.slug}`,
      },
    ],
  };

  function hrefForPage(p: number) {
    return `/categoria/${cat!.slug}${buildSearchParams({ ...filters, p })}`;
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
            { label: cat.name },
          ]}
        />

        <header className="mt-6 mb-8 max-w-2xl">
          <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight">
            {cat.name}
          </h1>
          {cat.description && (
            <p className="mt-2 text-[var(--color-earth-700)] text-base leading-relaxed">
              {cat.description}
            </p>
          )}
          {cat.children.length > 0 && (
            <nav className="mt-4 flex flex-wrap gap-2" aria-label="Subcategorías">
              {cat.children.map((c) => (
                <a
                  key={c.slug}
                  href={`/categoria/${c.slug}`}
                  className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-earth-50)] text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-100)]"
                >
                  {c.name}
                </a>
              ))}
            </nav>
          )}
        </header>

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <FilterSidebar
            collections={collections}
            laboratories={laboratories}
            attributes={attributes}
            priceRange={priceRange}
            totalResults={pageData.total}
            hideCategories
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
