import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "../_components/Breadcrumbs";
import ProductGrid from "../_components/ProductGrid";
import Pagination from "../_components/Pagination";
import SearchBar from "../_components/SearchBar";
import {
  listProducts,
  listActiveCollections,
  listActiveCategoriesTree,
  type CatalogSort,
} from "@/lib/catalog/listing-queries";
import { buildSearchParams } from "@/lib/catalog/search-params";

type SearchParams = Promise<{
  q?: string | string[];
  p?: string | string[];
}>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : Array.isArray(sp.q) ? sp.q[0] : "";
  if (!q || !q.trim()) {
    return {
      title: "Buscar productos",
      description: "Buscar productos en el catálogo de NaturalVita.",
      // Resultados de búsqueda no deben indexarse en Google.
      robots: { index: false, follow: true },
    };
  }
  return {
    title: `Resultados para "${q.trim()}"`,
    description: `Productos de NaturalVita relacionados con "${q.trim()}".`,
    robots: { index: false, follow: true },
    alternates: {
      canonical: "https://naturalvita.co/buscar",
    },
  };
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q =
    typeof sp.q === "string"
      ? sp.q.trim()
      : Array.isArray(sp.q)
        ? (sp.q[0] ?? "").trim()
        : "";
  const page =
    typeof sp.p === "string"
      ? Math.max(1, parseInt(sp.p, 10) || 1)
      : Array.isArray(sp.p)
        ? Math.max(1, parseInt(sp.p[0] ?? "1", 10) || 1)
        : 1;

  // Sin query → página de "tips" con accesos rápidos.
  if (!q) {
    const [collections, categoriesTree] = await Promise.all([
      listActiveCollections(),
      listActiveCategoriesTree(),
    ]);
    const featured = collections.filter((c) => c.is_featured).slice(0, 6);
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <Breadcrumbs items={[{ label: "Buscar" }]} />
        <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight mt-6">
          ¿Qué estás buscando?
        </h1>
        <p className="mt-2 text-[var(--color-earth-700)]">
          Escribe un producto, ingrediente o beneficio. También puedes navegar
          por categorías o colecciones destacadas.
        </p>

        <div className="mt-6">
          <SearchBar variant="page" />
        </div>

        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-[var(--color-earth-700)]">
            Categorías
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {categoriesTree.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/categoria/${c.slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-earth-50)] text-sm text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-100)]"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {featured.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-[var(--color-earth-700)]">
              Colecciones destacadas
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {featured.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/coleccion/${c.slug}`}
                    className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-iris-100)] text-sm text-[var(--color-iris-700)] hover:bg-[var(--color-iris-100)]/80"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  // Con query → búsqueda full-text.
  const pageData = await listProducts(
    { q },
    "relevance" as CatalogSort, // FTS aplica su propio ranking implícito en search_vector
    { page, pageSize: 24 },
  );

  function hrefForPage(p: number) {
    return `/buscar${buildSearchParams({ q, p })}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      <Breadcrumbs items={[{ label: "Buscar", href: "/buscar" }, { label: q }]} />

      <header className="mt-6 mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-[var(--color-leaf-900)] tracking-tight">
          Resultados para “{q}”
        </h1>
        <p className="mt-1 text-sm text-[var(--color-earth-700)] tabular-nums">
          {pageData.total === 0
            ? "Sin resultados"
            : pageData.total === 1
              ? "1 producto"
              : `${pageData.total.toLocaleString("es-CO")} productos`}
        </p>
      </header>

      <div className="max-w-2xl mb-8">
        <SearchBar variant="page" initialQuery={q} />
      </div>

      {pageData.total === 0 ? (
        <div className="py-16 text-center max-w-md mx-auto">
          <p className="text-[var(--color-earth-700)] text-base">
            No encontramos productos con ese término.
          </p>
          <p className="text-[var(--color-earth-500)] text-sm mt-3">
            Prueba con palabras más generales (ej. <em>vitamina C</em>,{" "}
            <em>colágeno</em>) o navega por{" "}
            <Link
              href="/tienda"
              className="text-[var(--color-iris-700)] hover:underline"
            >
              toda la tienda
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <ProductGrid products={pageData.products} />
          <Pagination
            page={pageData.page}
            totalPages={pageData.totalPages}
            hrefFor={hrefForPage}
          />
        </>
      )}
    </div>
  );
}
