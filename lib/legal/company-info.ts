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

  /** Dominio principal */
  domain: "naturalvita.co",

  /** URL canónica del sitio */
  url: "https://naturalvita.co",

  // ---------- Direcciones de email ----------
  email: {
    /**
     * Email público de contacto. Aparece en footer, /contacto,
     * redes sociales, firma de marketing. Atendido por humanos.
     */
    public: "info@naturalvita.co",

    /**
     * Identidad de envío de emails transaccionales (confirmación
     * de pedido, pago, envío). No tiene buzón humano. Reply-To
     * redirige al email público.
     */
    notifications: "notificaciones@naturalvita.co",

    /**
     * Identidad de envío de emails de marketing de Savia.
     * No tiene buzón humano. Reply-To al email público.
     */
    marketing: "hola@news.naturalvita.co",

    /**
     * Email técnico interno. Owner de plataformas externas
     * (AWS, Vercel, Supabase, Bold, etc.). No expuesto al cliente.
     */
    tech: "dev@naturalvita.co",

    /**
     * Buzón técnico para reportes DMARC. No leído por humanos.
     */
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

  // ---------- Redes sociales (pendientes de crear para NaturalVita) ----------
  social: {
    instagram: null as string | null, // "https://instagram.com/naturalvita.co"
    facebook: null as string | null,
    tiktok: null as string | null,
    youtube: null as string | null,
    linkedin: null as string | null,
  },

  // ---------- Cumplimiento legal ----------
  legal: {
    /** Ley colombiana de protección de datos personales */
    privacyLaw: "Ley 1581 de 2012 (Habeas Data)",
    privacyAuthority: "Superintendencia de Industria y Comercio (SIC)",
  },
} as const;

// ---------- Helpers ----------

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
