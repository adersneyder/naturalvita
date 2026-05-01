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
    default: "NaturalVita | Productos naturales para tu bienestar",
    template: "%s | NaturalVita",
  },
  description:
    "Tienda online de productos naturales en Colombia. Suplementos, fitoterapia y bienestar de los mejores laboratorios.",
  keywords: [
    "productos naturales",
    "suplementos",
    "salud natural",
    "Colombia",
    "fitoterapia",
    "bienestar",
  ],
  authors: [{ name: "NaturalVita" }],
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "https://naturalvita.co",
    siteName: "NaturalVita",
    title: "NaturalVita | Productos naturales para tu bienestar",
    description:
      "Tienda online de productos naturales en Colombia. Suplementos, fitoterapia y bienestar.",
  },
  robots: {
    index: true,
    follow: true,
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
