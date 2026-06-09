import type { Metadata } from "next";
import type { ReactNode } from "react";
import MagicLinkDetector from "./_components/MagicLinkDetector";
import SiteAnalytics from "./_components/SiteAnalytics";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co",
  ),
  title: {
    default: "NaturalVita | Suplementos naturales con INVIMA en Colombia",
    template: "%s | NaturalVita",
  },
  description:
    "Tienda online colombiana de suplementos y productos naturales con registro INVIMA. Catálogo curado de laboratorios verificados, envío a toda Colombia, pago seguro con Bold.",
  keywords: [
    "suplementos naturales Colombia",
    "productos naturales INVIMA",
    "tienda naturista online",
    "fitoterapia",
    "vitaminas Colombia",
    "bienestar",
  ],
  authors: [{ name: "NaturalVita" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "https://naturalvita.co",
    siteName: "NaturalVita",
    title: "NaturalVita | Suplementos naturales con INVIMA en Colombia",
    description:
      "Suplementos y productos naturales de laboratorios verificados. Envío a toda Colombia.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NaturalVita",
    description:
      "Suplementos y productos naturales con INVIMA en Colombia.",
  },
  // Permisos extendidos para Googlebot: imágenes grandes y snippets sin recortar,
  // lo que mejora la visibilidad en Search y AI Overviews.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-CO">
      <head>
        {/* Tipografías Google Fonts: Inter (cuerpo) + Fraunces (titulares).
            Cargadas vía link clásico con preconnect para óptimo TTFB.
            display=swap evita que el texto sea invisible mientras carga la fuente. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <MagicLinkDetector />
        <Providers>{children}</Providers>
        <SiteAnalytics />
      </body>
    </html>
  );
}
