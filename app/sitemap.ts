import type { MetadataRoute } from "next";
import { listSitemapEntries } from "@/lib/catalog/listing-queries";

/**
 * Sitemap dinámico generado en build time + ISR (revalidate 1h).
 * Incluye:
 *   - Home, /tienda, /buscar (estáticas)
 *   - Todos los productos activos con imagen (lo que es público)
 *   - Todas las categorías, colecciones y laboratorios activos
 *
 * Prioridades:
 *   1.0 home
 *   0.9 productos individuales (target SEO principal)
 *   0.8 /tienda y categorías raíz
 *   0.7 colecciones y laboratorios
 *   0.4 /buscar
 *
 * No incluimos URLs con querystring (filtros) — Google las descubre por
 * navegación interna. Si las pusiéramos generaríamos sitemap explosivo.
 */
export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries = await listSitemapEntries();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/tienda`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/buscar`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const productEntries: MetadataRoute.Sitemap = entries.products.map((p) => ({
    url: `${BASE_URL}/producto/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const categoryEntries: MetadataRoute.Sitemap = entries.categories.map((c) => ({
    url: `${BASE_URL}/categoria/${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const collectionEntries: MetadataRoute.Sitemap = entries.collections.map(
    (c) => ({
      url: `${BASE_URL}/coleccion/${c.slug}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  const laboratoryEntries: MetadataRoute.Sitemap = entries.laboratories.map(
    (l) => ({
      url: `${BASE_URL}/laboratorio/${l.slug}`,
      lastModified: new Date(l.updated_at),
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  return [
    ...staticEntries,
    ...productEntries,
    ...categoryEntries,
    ...collectionEntries,
    ...laboratoryEntries,
  ];
}
