import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
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
      <body>{children}</body>
    </html>
  );
}
