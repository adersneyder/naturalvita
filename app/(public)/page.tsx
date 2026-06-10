/**
 * app/(public)/page.tsx — Home de NaturalVita
 *
 * Sprint 2 Sesión A: Quiz-Hero + 6 etapas de vida.
 * Sprint 2 Sesión B: + Selección destacada + secciones de marca Everlife.
 * Sprint 2 Sesión B (quiz IA): HeroQuiz ahora lee necesidades del motor de
 *   recomendaciones (objetivo-primero). La página carga las necesidades en el
 *   servidor y se las pasa al componente.
 *
 * Estructura del Home:
 *   [A] HeroQuiz          — Hero personalizado (quiz objetivo-primero)
 *   [A] LifeStages        — 6 etapas de vida ("del bebé al abuelo")
 *   [B] FeaturedProducts  — Selección destacada (cascada 3 niveles)
 *   [B] ValueProps        — 3 propuestas de valor (confianza)
 *   [B] EverlifeOrigin    — Origen de la marca (2019, Zardrin)
 *   [B] PartnerLabs       — Laboratorios aliados (dinámico)
 *   [B] TrustBadges       — Sellos de confianza (cierre, encima del footer)
 *
 * El newsletter vive en el PublicFooter (layout), no aquí.
 * El Header/Footer vienen del layout (public), no se tocan aquí.
 */
import type { Metadata } from "next";
import { HeroQuiz } from "@/components/home/HeroQuiz";
import { LifeStages } from "@/components/home/LifeStages";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import { ValueProps } from "@/components/home/ValueProps";
import { EverlifeOrigin } from "@/components/home/EverlifeOrigin";
import { PartnerLabs } from "@/components/home/PartnerLabs";
import { TrustBadges } from "@/components/home/TrustBadges";
import { SectionDivider } from "@/components/home/SectionDivider";
import { getActiveNeeds } from "@/lib/quiz/queries";
import { getHeroSlots } from "@/lib/home/hero-rotator";

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

// Los schemas WebSite (con SearchAction) y Organization viven en el layout
// público — globales en todas las páginas, requisito del knowledge panel.

export default async function HomePage() {
  // Necesidades activas del quiz (objetivo-primero) y slots pre-resueltos
  // del rotador del hero (8 slots con imagen + palabra + 3 productos).
  // Ambas se cargan en paralelo en el servidor para no encadenar latencias.
  const [needs, heroSlots] = await Promise.all([
    getActiveNeeds(),
    getHeroSlots(),
  ]);

  return (
    <>
      <HeroQuiz needs={needs} heroSlots={heroSlots} isLoggedIn={false} />
      <LifeStages />
      <FeaturedProducts />
      {/* Cambio de fondo blanco → crema: respiración narrativa */}
      <SectionDivider tone="warm" />
      <ValueProps />
      <EverlifeOrigin />
      {/* Cambio de fondo crema → blanco */}
      <SectionDivider tone="cool" />
      <PartnerLabs />
      {/* Cambio de fondo blanco → crema (banda de cierre) */}
      <SectionDivider tone="warm" />
      <TrustBadges />
    </>
  );
}
