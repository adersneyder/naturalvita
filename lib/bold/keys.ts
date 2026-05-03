/**
 * Selector de llaves Bold según ambiente.
 *
 * El comercio Bold tiene dos pares de llaves (test y production) y el
 * sitio elige cuál usar leyendo `NEXT_PUBLIC_BOLD_ENVIRONMENT`.
 *
 * Valores aceptados (case-insensitive):
 *   - "test" / "sandbox" → usa BOLD_*_TEST
 *   - "production" / "prod" → usa BOLD_*_PROD
 *   - cualquier otro valor → asume "test" por seguridad (defecto a no
 *     procesar dinero real si la config está mal).
 *
 * Para QA: NEXT_PUBLIC_BOLD_ENVIRONMENT=test
 * Para go-live: NEXT_PUBLIC_BOLD_ENVIRONMENT=production
 */

export type BoldEnvironment = "test" | "production";

export function getBoldEnvironment(): BoldEnvironment {
  const v = (process.env.NEXT_PUBLIC_BOLD_ENVIRONMENT ?? "")
    .trim()
    .toLowerCase();
  if (v === "production" || v === "prod") return "production";
  return "test";
}

export function isBoldTestMode(): boolean {
  return getBoldEnvironment() === "test";
}

/**
 * Llave de identidad (api key) — pública, va al frontend en data-api-key.
 * Identifica al comercio ante Bold.
 */
export function getBoldIdentityKey(): string {
  const env = getBoldEnvironment();
  const key =
    env === "production"
      ? process.env.BOLD_IDENTITY_KEY_PROD
      : process.env.BOLD_IDENTITY_KEY_TEST;
  return key ?? "";
}

/**
 * Llave secreta — nunca se expone al cliente. Se usa para:
 *   1. Generar hash de integridad SHA-256 al crear botones de pago.
 *   2. Verificar firma HMAC-SHA256 de webhooks entrantes.
 *
 * Particularidad de Bold: en sandbox, los webhooks se firman con secreto
 * VACÍO (""), no con la llave de prueba. Eso lo manejamos en
 * `verifyWebhookSignature`.
 */
export function getBoldSecretKey(): string {
  const env = getBoldEnvironment();
  const key =
    env === "production"
      ? process.env.BOLD_SECRET_KEY_PROD
      : process.env.BOLD_SECRET_KEY_TEST;
  return key ?? "";
}

/**
 * Devuelve true si las credenciales están configuradas. Si no, el botón
 * de pago se renderiza deshabilitado con mensaje "Próximamente".
 * Útil cuando alguien clona el repo en local sin variables de entorno.
 */
export function hasBoldCredentials(): boolean {
  const id = getBoldIdentityKey();
  return id.length > 0 && id !== "pending";
}
