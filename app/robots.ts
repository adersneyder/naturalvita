import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co";

/**
 * robots.txt:
 *   - Permitimos crawl general.
 *   - Bloqueamos /admin, /auth y /api porque son zonas privadas o de
 *     servicio que no aportan a SEO y consumen crawl budget.
 *   - Bloqueamos URLs con querystring de filtros (cat=, lab=, etc.) para
 *     evitar indexación de combinaciones infinitas. Las páginas canónicas
 *     /categoria/[slug], /coleccion/[slug], /laboratorio/[slug] son las que
 *     queremos en Google. Los filtros existen para el usuario, no para SEO.
 *   - Apuntamos al sitemap dinámico.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin",
          "/admin/",
          "/auth",
          "/auth/",
          "/api",
          "/api/",
          "/*?cat=*",
          "/*?col=*",
          "/*?lab=*",
          "/*?attrs=*",
          "/*?min=*",
          "/*?max=*",
          "/*?sort=*",
          "/*?p=*",
          "/*?instock=*",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
