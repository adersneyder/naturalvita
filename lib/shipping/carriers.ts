/**
 * Catálogo de transportadoras soportadas en NaturalVita.
 *
 * Fuente de verdad para el dropdown de admin al marcar un pedido como
 * enviado y para construir URLs de tracking deep-link en los emails y
 * en la cuenta del cliente.
 *
 * Para agregar una transportadora:
 *   1. Agregar entrada al objeto `CARRIERS` con slug único, nombre legible
 *      y un `buildTrackingUrl` (función o null si no soporta deep link).
 *   2. Listo. Tipos, validación y UI se actualizan automáticamente.
 *
 * Algunas transportadoras NO soportan deep-link (típicamente porque su
 * página de tracking usa POST en lugar de GET). En esos casos
 * `buildTrackingUrl` devuelve `null` y la UI mostrará solo el número
 * con un link genérico a la home de la transportadora.
 */

export type CarrierSlug =
  | "servientrega"
  | "coordinadora"
  | "interrapidisimo"
  | "envia"
  | "tcc"
  | "deprisa"
  | "domina"
  | "other";

type CarrierConfig = {
  /** Nombre legible que se muestra al cliente y al admin */
  label: string;
  /** Si true, no es una transportadora real sino la opción "Otra" */
  isOther?: boolean;
  /**
   * URL de tracking dado un número de guía. Devuelve `null` si la
   * transportadora no soporta deep-link público o si no hay número.
   */
  buildTrackingUrl: (trackingNumber: string) => string | null;
  /** Home de la transportadora (fallback si no hay deep link) */
  homepage?: string;
};

export const CARRIERS: Record<CarrierSlug, CarrierConfig> = {
  servientrega: {
    label: "Servientrega",
    homepage: "https://www.servientrega.com",
    buildTrackingUrl: (n) =>
      n
        ? `https://www.servientrega.com/wps/portal/rastreo-envio?numero=${encodeURIComponent(n)}`
        : null,
  },
  coordinadora: {
    label: "Coordinadora",
    homepage: "https://coordinadora.com",
    buildTrackingUrl: (n) =>
      n
        ? `https://coordinadora.com/rastreo/rastreo-de-mercancia/?guia=${encodeURIComponent(n)}`
        : null,
  },
  interrapidisimo: {
    label: "Interrapidísimo",
    homepage: "https://interrapidisimo.com",
    buildTrackingUrl: (n) =>
      n
        ? `https://interrapidisimo.com/sigue-tu-envio/?guia=${encodeURIComponent(n)}`
        : null,
  },
  envia: {
    label: "Envia.co",
    homepage: "https://envia.co",
    buildTrackingUrl: (n) =>
      n ? `https://envia.co/rastrear-envios?guia=${encodeURIComponent(n)}` : null,
  },
  tcc: {
    label: "TCC",
    homepage: "https://www.tcc.com.co",
    // TCC no soporta deep-link: su tracking usa POST. Mandamos al
    // cliente a la página de búsqueda y debe pegar el número.
    buildTrackingUrl: () => "https://www.tcc.com.co/rastreo-de-envios/",
  },
  deprisa: {
    label: "Deprisa",
    homepage: "https://www.deprisa.com",
    buildTrackingUrl: (n) =>
      n
        ? `https://www.deprisa.com/Rastreo?TipoConsulta=Guia&CodigoBusqueda=${encodeURIComponent(n)}`
        : null,
  },
  domina: {
    label: "Domina (envíos urbanos)",
    homepage: "https://dominaentregatotal.com",
    // Domina pide login para tracking. No deep link público.
    buildTrackingUrl: () => null,
  },
  other: {
    label: "Otra transportadora",
    isOther: true,
    buildTrackingUrl: () => null,
  },
};

/**
 * Lista ordenada de slugs para iterar en dropdowns. "Otra" siempre al final.
 */
export const CARRIER_SLUGS: CarrierSlug[] = [
  "servientrega",
  "coordinadora",
  "interrapidisimo",
  "envia",
  "tcc",
  "deprisa",
  "domina",
  "other",
];

/**
 * Devuelve la URL de tracking si tanto carrier como número están definidos
 * y el carrier soporta deep-link. NULL en cualquier otro caso.
 *
 * Acepta slug inválido (devuelve null) para tolerar carriers viejos en BD
 * antes de la migración a este sistema.
 */
export function buildTrackingUrl(
  carrierSlug: string | null | undefined,
  trackingNumber: string | null | undefined,
): string | null {
  if (!carrierSlug || !trackingNumber?.trim()) return null;
  const carrier = CARRIERS[carrierSlug as CarrierSlug];
  if (!carrier) return null;
  return carrier.buildTrackingUrl(trackingNumber.trim());
}

/**
 * Devuelve el nombre legible del carrier o el slug crudo si no se conoce.
 * Útil cuando guardamos un carrier "desconocido" antes de la migración o
 * cuando el admin escribió texto libre.
 */
export function getCarrierLabel(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const carrier = CARRIERS[slug as CarrierSlug];
  return carrier?.label ?? slug;
}

/**
 * Validar que un slug sea uno conocido. Útil en server actions.
 */
export function isValidCarrierSlug(value: unknown): value is CarrierSlug {
  return (
    typeof value === "string" &&
    (CARRIER_SLUGS as string[]).includes(value)
  );
}
