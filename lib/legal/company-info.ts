/**
 * lib/legal/company-info.ts
 *
 * Información legal y de contacto de NaturalVita / Everlife Colombia S.A.S.
 * Fuente única de verdad consumida por:
 *   - Footer del sitio
 *   - Schema.org Organization en home
 *   - Plantillas de email (footer y disclaimers)
 *   - Página /contacto
 *   - Pantallas legales (/legal/privacidad, /legal/terminos)
 *
 * Cualquier cambio aquí se propaga a todos los puntos del sitio.
 */

const BRAND = "NaturalVita";
const LEGAL_NAME = "Everlife Colombia S.A.S.";
const PARENT_BRAND = "Everlife Colombia";
const TAGLINE = "Productos naturales seleccionados para tu bienestar";
const DOMAIN = "naturalvita.co";
const URL = "https://naturalvita.co";

// ============================================================
// NIT
// Uso interno, solo para páginas legales formales (privacidad,
// terminos) donde la SIC exige identificación del responsable
// del tratamiento de datos según Ley 1581 / Decreto 1377.
// NO se debe exponer en footer, schema.org ni metadata pública.
// ============================================================

const NIT = "901.717.753-4";

// ============================================================
// Teléfono y WhatsApp públicos
// Placeholder en formato [+57 ___ ___ ____] hasta configurar
// números reales. El código que los consume detecta el placeholder
// por su startsWith("[") y oculta el bloque automáticamente.
// ============================================================

const PHONE_PLACEHOLDER = "[+57 ___ ___ ____]";

// ============================================================
// Direcciones de email
// ============================================================

const EMAIL_PUBLIC = "info@naturalvita.co";
const EMAIL_NOTIFICATIONS = "notificaciones@naturalvita.co";
const EMAIL_MARKETING = "hola@news.naturalvita.co";
const EMAIL_TECH = "dev@naturalvita.co";
const EMAIL_DMARC = "dmarc@naturalvita.co";

// ============================================================
// Dirección física
// ============================================================

const ADDRESS = {
  street: "Carrera 51C # 78-11",
  city: "Medellín",
  state: "Antioquia",
  stateCode: "ANT",
  country: "Colombia",
  countryCode: "CO",
  postalCode: "050025",
} as const;

// ============================================================
// Modelo principal
// ============================================================

export const COMPANY = {
  brand: BRAND,
  legalName: LEGAL_NAME,
  parentBrand: PARENT_BRAND,
  tagline: TAGLINE,
  domain: DOMAIN,
  url: URL,

  // Aliases retro-compatibles para código existente del repo.
  // Permiten que páginas legales, contacto, sobre-nosotros y otras
  // sigan funcionando con su sintaxis original sin refactor masivo.
  brandName: BRAND,
  brandTagline: TAGLINE,
  siteUrl: URL,
  publicEmail: EMAIL_PUBLIC,
  publicPhone: PHONE_PLACEHOLDER,
  publicWhatsapp: PHONE_PLACEHOLDER,
  nit: NIT,
  addressStreet: ADDRESS.street,
  addressCity: ADDRESS.city,
  addressDepartment: ADDRESS.state,
  addressCountry: ADDRESS.country,

  email: {
    public: EMAIL_PUBLIC,
    notifications: EMAIL_NOTIFICATIONS,
    marketing: EMAIL_MARKETING,
    tech: EMAIL_TECH,
    dmarc: EMAIL_DMARC,
  },

  address: ADDRESS,

  social: {
    instagram: "https://instagram.com/naturalvita.co" as string | null,
    facebook: "https://facebook.com/naturalvita.co" as string | null,
    tiktok: null as string | null,
    youtube: null as string | null,
    linkedin: null as string | null,
  },

  legal: {
    privacyLaw: "Ley 1581 de 2012 (Habeas Data)",
    privacyAuthority: "Superintendencia de Industria y Comercio (SIC)",
  },
} as const;

// ============================================================
// Información regulatoria
// ============================================================

export const REGULATORY = {
  habeasDataLaw: "Ley 1581 de 2012",
  privacyAuthority: "Superintendencia de Industria y Comercio (SIC)",
  healthAuthority: "INVIMA",
  healthAuthorityFullName:
    "Instituto Nacional de Vigilancia de Medicamentos y Alimentos",
  supplementDisclaimer:
    "Los suplementos alimenticios no son medicamentos y no están destinados a diagnosticar, tratar, curar o prevenir ninguna enfermedad. Consulte a su médico antes de iniciar cualquier suplementación si toma medicamentos, está embarazada, lactando o tiene condiciones médicas.",
  shortDisclaimer:
    "Todos los productos cuentan con registro sanitario INVIMA vigente.",
} as const;

// ============================================================
// Helpers
// ============================================================

export function getFormattedAddress(): string {
  const { street, city, state, country } = COMPANY.address;
  return `${street}, ${city}, ${state}, ${country}`;
}

export function getLegalLine(): string {
  return `${COMPANY.brand} es una marca de ${COMPANY.legalName}.`;
}

export function getRegulatoryFooter(): string {
  return `${COMPANY.brand} es una marca de ${COMPANY.legalName}. ${REGULATORY.shortDisclaimer} Datos tratados conforme a la ${REGULATORY.habeasDataLaw}.`;
}
