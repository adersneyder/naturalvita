// ─────────────────────────────────────────────────────────────────────────────
// FIX CANÓNICA /tienda · Sprint 2 Sesión 0
//
// Problema: Google Search Console reporta `/tienda` y `/` como duplicadas
// porque ambas listan productos sin canónica explícita.
//
// Fix: declarar canónica explícita en `app/tienda/page.tsx`.
// La home ya tiene su propia canónica apuntando a `/` (no la tocamos).
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";

/**
 * Añadir / reemplazar el export `metadata` al inicio de
 * `app/tienda/page.tsx` (después de los imports, antes del componente).
 *
 * Si ya existe un objeto `metadata`, fusionar el campo `alternates`
 * en él en lugar de duplicar el export.
 */
export const metadata: Metadata = {
  title: "Tienda · Suplementos y productos naturales | NaturalVita",
  description:
    "Catálogo completo de suplementos, vitaminas y productos naturales con respaldo INVIMA. Envío a toda Colombia.",
  alternates: {
    canonical: "https://naturalvita.co/tienda",
  },
  openGraph: {
    title: "Tienda · NaturalVita",
    description:
      "Catálogo completo de suplementos, vitaminas y productos naturales con respaldo INVIMA.",
    url: "https://naturalvita.co/tienda",
    siteName: "NaturalVita",
    locale: "es_CO",
    type: "website",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTAS DE INTEGRACIÓN
//
// 1. Si /tienda usa `generateMetadata` (porque depende de filtros de query
//    params), entonces dentro de esa función devuelve también:
//
//    return {
//      title: "...",
//      alternates: {
//        canonical: "https://naturalvita.co/tienda",
//        // ↑ Canónica SIEMPRE apunta al listado base, NUNCA a la URL
//        //   con query params. Esto evita que cada combinación de
//        //   filtros (?categoria=vitaminas&precio=alto) compita por
//        //   ranking con la URL limpia.
//      },
//    };
//
// 2. Verificar también en la home (`app/page.tsx`) que la canónica
//    apunta a `/` y no a `/tienda`:
//
//    export const metadata: Metadata = {
//      ...
//      alternates: { canonical: "https://naturalvita.co" },
//    };
//
// 3. Tras deploy, validar en Rich Results Test:
//    https://search.google.com/test/rich-results?url=https://naturalvita.co/tienda
//    El campo "Canonical URL" debe mostrar la URL absoluta correcta.
//
// 4. Solicitar reindexación manual de `/tienda` en GSC para acelerar
//    el reconocimiento del cambio.
// ─────────────────────────────────────────────────────────────────────────────
