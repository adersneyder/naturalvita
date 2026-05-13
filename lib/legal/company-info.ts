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

export const COMPANY = {
  /** Marca comercial visible al cliente */
  brand: "NaturalVita",

  /** Razón social legal (responsable del tratamiento de datos) */
  legalName: "Everlife Colombia S.A.S.",

  /** Marca matriz */
  parentBrand: "Everlife Colombia",

  /** Eslogan público */
  tagline: "Productos naturales seleccionados para tu bienestar",

  /** Dominio principal */
  domain: "naturalvita.co",

  /** URL canónica del sitio */
  url: "https://naturalvita.co",

  // ---------- Direcciones de email ----------
  email: {
    public: "info@naturalvita.co",
    notifications: "notificaciones@naturalvita.co",
    marketing: "hola@news.naturalvita.co",
    tech: "dev@naturalvita.co",
    dmarc: "dmarc@naturalvita.co",
  },

  // ---------- Dirección física legal ----------
  address: {
    street: "Carrera 51C # 78-11",
    city: "Medellín",
    state: "Antioquia",
    stateCode: "ANT",
    country: "Colombia",
    countryCode: "CO",
    postalCode: "050025",
  },

  // ---------- Redes sociales ----------
  social: {
    instagram: "https://instagram.com/naturalvita.co" as string | null,
    facebook: "https://facebook.com/naturalvita.co" as string | null,
    tiktok: null as string | null,
    youtube: null as string | null,
    linkedin: null as string | null,
  },

  // ---------- Cumplimiento legal ----------
  legal: {
    privacyLaw: "Ley 1581 de 2012 (Habeas Data)",
    privacyAuthority: "Superintendencia de Industria y Comercio (SIC)",
  },
} as const;

// ============================================================
// Información regulatoria
// ============================================================

export const REGULATORY = {
  /** Marco legal de protección de datos personales en Colombia */
  habeasDataLaw: "Ley 1581 de 2012",

  /** Autoridad regulatoria de protección de datos */
  privacyAuthority: "Superintendencia de Industria y Comercio (SIC)",

  /** Nombre de la autoridad sanitaria colombiana */
  healthAuthority: "INVIMA",

  /** Nombre completo del INVIMA para textos legales */
  healthAuthorityFullName:
    "Instituto Nacional de Vigilancia de Medicamentos y Alimentos",

  /** Disclaimer general para productos suplementicios */
  supplementDisclaimer:
    "Los suplementos alimenticios no son medicamentos y no están destinados a diagnosticar, tratar, curar o prevenir ninguna enfermedad. Consulte a su médico antes de iniciar cualquier suplementación si toma medicamentos, está embarazada, lactando o tiene condiciones médicas.",

  /** Disclaimer corto para footer */
  shortDisclaimer:
    "Todos los productos cuentan con registro sanitario INVIMA vigente.",
} as const;

// ============================================================
// Helpers
// ============================================================

/**
 * Dirección completa formateada para mostrar en footer o emails.
 * Ejemplo: "Carrera 51C # 78-11, Medellín, Antioquia, Colombia"
 */
export function getFormattedAddress(): string {
  const { street, city, state, country } = COMPANY.address;
  return `${street}, ${city}, ${state}, ${country}`;
}

/**
 * Línea legal compacta para footer de emails.
 * Ejemplo: "NaturalVita es una marca de Everlife Colombia S.A.S."
 */
export function getLegalLine(): string {
  return `${COMPANY.brand} es una marca de ${COMPANY.legalName}.`;
}

/**
 * Texto regulatorio completo para footer del sitio
 * o disclaimers legales.
 */
export function getRegulatoryFooter(): string {
  return `${COMPANY.brand} es una marca de ${COMPANY.legalName}. ${REGULATORY.shortDisclaimer} Datos tratados conforme a la ${REGULATORY.habeasDataLaw}.`;
}
