import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withBundleAnalyzer(nextConfig);
