/**
 * components/schema/OrganizationSchema.tsx
 *
 * Componente que inyecta JSON-LD schema.org de tipo Organization
 * en el <head> del sitio. Google, Bing y crawlers de IA usan estos
 * datos estructurados para entender quién es NaturalVita, dónde
 * opera, y cómo contactar.
 *
 * Sin NIT ni teléfono según decisión del proyecto.
 *
 * Validación: https://search.google.com/test/rich-results
 */

import { COMPANY } from "@/lib/legal/company-info";

interface OrganizationSchemaProps {
  /** Si true, marca esta como entidad principal de la página (solo en home) */
  isMainEntity?: boolean;
}

export function OrganizationSchema({
  isMainEntity = false,
}: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${COMPANY.url}#organization`,
    name: COMPANY.brand,
    legalName: COMPANY.legalName,
    url: COMPANY.url,
    logo: {
      "@type": "ImageObject",
      url: `${COMPANY.url}/logo.png`,
      width: 512,
      height: 512,
    },
    image: `${COMPANY.url}/og-image.png`,
    description:
      "Tienda online colombiana de suplementos y productos naturales con registro INVIMA. Curamos catálogo con criterio clínico desde laboratorios verificados.",
    foundingDate: "2026",
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.address.street,
      addressLocality: COMPANY.address.city,
      addressRegion: COMPANY.address.state,
      postalCode: COMPANY.address.postalCode,
      addressCountry: COMPANY.address.countryCode,
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: COMPANY.email.public,
      availableLanguage: ["Spanish", "es-CO"],
      areaServed: "CO",
    },
   sameAs: [
  COMPANY.social.instagram,
  COMPANY.social.facebook,
  COMPANY.social.tiktok,
  COMPANY.social.youtube,
  COMPANY.social.linkedin,
].filter(Boolean) as string[],
    knowsAbout: [
      "Suplementos alimenticios",
      "Vitaminas",
      "Minerales",
      "Productos naturales",
      "Bienestar",
      "INVIMA",
      "Salud natural",
    ],
    areaServed: {
      "@type": "Country",
      name: "Colombia",
    },
    ...(isMainEntity && {
      mainEntityOfPage: COMPANY.url,
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * Schema WebSite con SearchAction para que Google y otros entiendan
 * que el sitio tiene búsqueda interna y la presenten en SERPs.
 */
export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${COMPANY.url}#website`,
    url: COMPANY.url,
    name: COMPANY.brand,
    description:
      "Tienda online colombiana de suplementos y productos naturales con registro INVIMA.",
    publisher: {
      "@id": `${COMPANY.url}#organization`,
    },
    inLanguage: "es-CO",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${COMPANY.url}/buscar?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}
