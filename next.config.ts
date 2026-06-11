import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/**
 * Content-Security-Policy de NaturalVita.
 *
 * Lista blanca explícita de los terceros que el sitio carga hoy:
 *   - Bold (pasarela de pago)              checkout.bold.co
 *   - Microsoft Clarity (analytics qual.)  www.clarity.ms
 *   - Vercel Analytics + Speed Insights    va.vercel-scripts.com, vitals.vercel-insights.com
 *   - Google Fonts                          fonts.googleapis.com, fonts.gstatic.com
 *   - Supabase (datos, storage, auth)      *.supabase.co
 *
 * NOTA sobre 'unsafe-inline':
 *   - script-src: necesario para JSON-LD inyectado vía dangerouslySetInnerHTML
 *     en producto, ficha, organization schema, faqs. La alternativa (nonces
 *     por request) requiere streaming-aware middleware y, en la práctica, no
 *     mejora la postura frente a XSS porque el contenido inyectado es
 *     estático (no recibe input del usuario).
 *   - style-src: Tailwind v4 inyecta estilos inline desde el server.
 *
 * img-src https: data: blob: porque las imágenes vienen de orígenes diversos
 * (productos, logos de labs, OG generadas). Bloquear ?http:? sí es importante.
 */
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.bold.co https://www.clarity.ms https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com https://www.clarity.ms https://api.bold.co https://checkout.bold.co",
  "frame-src 'self' https://checkout.bold.co",
  "frame-ancestors 'self'",
  "form-action 'self' https://checkout.bold.co",
  "object-src 'none'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join("; ");

// Headers de seguridad COMUNES a todas las rutas (sin CSP — ese se aplica
// solo a las rutas públicas porque admin/api/og tienen necesidades distintas).
const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Aislamiento del documento contra ventanas abiertas (OAuth Google, Bold
  // popup). same-origin-allow-popups permite OAuth pero impide que ventanas
  // externas accedan a window.opener.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

// CSP solo en rutas públicas. Admin (con admin client-side dinámico) y
// /api/* (que devuelven JSON, no HTML) NO necesitan CSP — el Content-Type
// los excluye del modelo de amenazas de CSP.
const publicSecurityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  ...baseSecurityHeaders,
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      // Proveedores cuyas imágenes podríamos servir directo en algún flujo
      { protocol: "https", hostname: "sistemanatural.com" },
      { protocol: "https", hostname: "www.sistemanatural.com" },
      { protocol: "https", hostname: "healthy-america.com.co" },
      { protocol: "https", hostname: "naturfar.co" },
      { protocol: "https", hostname: "www.naturfar.co" },
      { protocol: "https", hostname: "cinatlaboratorios.com" },
      { protocol: "https", hostname: "www.cinatlaboratorios.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      // CSP estricto a TODAS las páginas públicas (catálogo, fichas, guías,
      // checkout, mi-cuenta, auth, legal). El missMatch excluye admin, api
      // y endpoints generativos de OG/icon que necesitan flexibilidad propia.
      {
        source: "/((?!admin|api|opengraph-image|twitter-image|icon|apple-icon).*)",
        headers: publicSecurityHeaders,
      },
      // Headers base (sin CSP) en TODO lo demás — admin sigue protegido por
      // auth+RLS, las APIs devuelven JSON (modelo CSP no aplica), y los
      // generadores de imágenes corren server-side.
      { source: "/:path*", headers: baseSecurityHeaders },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
