/**
 * Información legal y de contacto de la empresa.
 *
 * IMPORTANTE: estos valores aparecen en el footer público, en las páginas
 * legales (privacidad, términos, envíos) y en los emails transaccionales
 * (Hito 1.7 sesión C). Mantenlos verídicos y actualizados.
 *
 * Los placeholders marcados con [TODO] deben llenarse antes del lanzamiento
 * público. Si los dejas como están, las páginas legales muestran los textos
 * pero con marcador visible — útil para QA, inaceptable para producción.
 */

export const COMPANY = {
  // Identidad legal
  legalName: "Everlife Colombia S.A.S.",
  brandName: "NaturalVita",
  brandTagline: "Productos naturales seleccionados para tu bienestar",
  parentBrand: "Everlife Colombia",

  // Identificación tributaria
  // [TODO] Confirmar NIT real de Everlife Colombia.
  nit: "[NIT pendiente]",

  // Contacto operativo
  // Email donde el cliente puede escribirnos. Se muestra en footer y emails.
  // Es la bandeja monitoreada que recibe respuestas de los emails transaccionales.
  publicEmail: "pedidos@naturalvita.co",
  // [TODO] Teléfono / WhatsApp de atención al cliente
  publicPhone: "[Teléfono pendiente]",
  publicWhatsapp: "[WhatsApp pendiente]",

  // Dirección física (para footer + facturación)
  // [TODO] Dirección de las oficinas / bodega de Everlife
  addressStreet: "[Dirección pendiente]",
  addressCity: "Bogotá",
  addressDepartment: "Cundinamarca",
  addressCountry: "Colombia",

  // Dominio
  siteUrl: "https://naturalvita.co",

  // Redes sociales (sin "/" final)
  // [TODO] URLs reales si ya las tienes
  instagramUrl: "https://www.instagram.com/naturalvita.co",
  facebookUrl: "https://www.facebook.com/naturalvita.co",
  tiktokUrl: "https://www.tiktok.com/@naturalvita.co",
} as const;

/**
 * Datos regulatorios INVIMA y de cámara de comercio.
 * Solo aplica si la empresa tiene registros propios; los registros de los
 * productos individuales viven en `products.invima_number`.
 */
export const REGULATORY = {
  // Si Everlife tiene registro INVIMA como importador / comercializador,
  // ponlo aquí. Si no aplica (puede no aplicar para una comercializadora),
  // déjalo vacío y el footer no lo muestra.
  // [TODO] Confirmar si Everlife tiene registro INVIMA propio.
  invimaImporterRegistration: "",
} as const;

/**
 * Para emails transaccionales en Hito 1.7 Sesión C.
 *
 * Convención de cuentas de correo:
 *   - info@naturalvita.co → bandeja de envío automatizado (FROM). Los
 *     emails transaccionales y de auth Supabase salen desde aquí.
 *     No es bandeja monitoreada, solo emite.
 *   - pedidos@naturalvita.co → bandeja de recepción humana (REPLY-TO).
 *     Cuando un cliente responde un email transaccional o escribe desde
 *     el footer del sitio, su mensaje cae aquí. Se debe monitorear.
 *
 * Estos defaults aplican si no están las variables de entorno
 * `RESEND_FROM_EMAIL` y `RESEND_REPLY_TO` configuradas en Vercel
 * (en producción siempre deberían estarlo).
 */
export const EMAIL = {
  fromName: "NaturalVita",
  fromAddress: "info@naturalvita.co",
  replyTo: "pedidos@naturalvita.co",
} as const;
