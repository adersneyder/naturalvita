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
  // [TODO] Email de contacto público (hola@, contacto@, etc.)
  publicEmail: "contacto@naturalvita.co",
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
 */
export const EMAIL = {
  fromName: "NaturalVita",
  fromAddress: "no-reply@naturalvita.co",
  replyTo: "contacto@naturalvita.co",
  supportAddress: "soporte@naturalvita.co",
} as const;
