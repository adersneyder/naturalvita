/**
 * app/page.tsx — Home de NaturalVita
 *
 * Sprint 2 Sesión A: Quiz-Hero + 6 etapas de vida.
 * Sprint 2 Sesión B: + Productos top dinámicos (FeaturedProducts).
 *
 * Estructura final del Home (se completa en Sesiones B-D):
 *   [A] HeroQuiz          ← Sesión A
 *   [A] LifeStages        ← Sesión A
 *   [B] FeaturedProducts  ← Sesión B (Punto 1)
 *   [B] Editorial (3 artículos)
 *   [C] Origen Everlife
 *   [C] Labs aliados + sellos confianza
 *   [D] Newsletter prominente
 *
 * El Header/Footer vienen del layout, no se tocan aquí.
 */
import type { Metadata } from "next";
import { HeroQuiz } from "@/components/home/HeroQuiz";
import { LifeStages } from "@/components/home/LifeStages";
import FeaturedProducts from "@/components/home/FeaturedProducts";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co";
export const metadata: Metadata = {
  title: "NaturalVita · Bienestar que crece contigo",
  description:
    "Suplementos y productos naturales seleccionados con criterio, para cada etapa de la vida. Del bebé al abuelo. Envío a toda Colombia con respaldo INVIMA.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "NaturalVita · Bienestar que crece contigo",
    description:
      "Lo natural, seleccionado con criterio. Para cada etapa de la vida.",
    url: SITE_URL,
    siteName: "NaturalVita",
    locale: "es_CO",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/home/og-home.jpg`,
        width: 1200,
        height: 630,
        alt: "NaturalVita · Bienestar que crece contigo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NaturalVita · Bienestar que crece contigo",
    description:
      "Lo natural, seleccionado con criterio. Para cada etapa de la vida.",
    images: [`${SITE_URL}/home/og-home.jpg`],
  },
};
// Schema.org WebSite con SearchAction → habilita sitelinks searchbox en Google
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NaturalVita",
  url: SITE_URL,
  description:
    "Suplementos y productos naturales para cada etapa de la vida en Colombia.",
  inLanguage: "es-CO",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/buscar?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};
export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <HeroQuiz />
      <LifeStages />
      <FeaturedProducts />
      {/*
        TODO Sesión B: <Editorial />
        TODO Sesión C: <EverlifeOrigin /> + <PartnerLabs />
        TODO Sesión D: <NewsletterCta /> + <TrustBadges />
      */}
    </>
  );
}
