import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getBoldSecretKey, isBoldTestMode } from "./keys";

/**
 * Hash de integridad para el botón de pagos Bold.
 *
 * Bold exige que enviemos `data-integrity-signature` con el SHA-256 del
 * string concatenado: orderId + amount + currency + secretKey.
 * Esto previene que un atacante modifique el monto o el orderId desde
 * DevTools y procese un pago falso.
 *
 * Documentación oficial de Bold:
 *   integrity = SHA-256(orderId + amount + currency + secretKey)
 *
 * Donde:
 *   - orderId: el order_number que generamos (NV-YYYYMMDD-XXXX).
 *   - amount: el total en COP como string sin decimales (ej: "150000").
 *   - currency: "COP" siempre para nuestro caso.
 *   - secretKey: BOLD_SECRET_KEY_TEST o BOLD_SECRET_KEY_PROD según ambiente.
 *
 * IMPORTANTE: este hash se calcula SIEMPRE en el servidor, NUNCA en el
 * cliente. La secret key no debe llegar al navegador.
 */
export function generateIntegritySignature(params: {
  orderId: string;
  amountCop: number;
  currency?: string;
}): string {
  const currency = params.currency ?? "COP";
  const secretKey = getBoldSecretKey();
  const message = `${params.orderId}${params.amountCop}${currency}${secretKey}`;
  return createHash("sha256").update(message).digest("hex");
}

/**
 * Verifica la firma HMAC-SHA256 de un webhook entrante de Bold.
 *
 * Bold envía el header `x-bold-signature` con el HMAC-SHA256 de
 * `base64(rawBody)` usando la llave secreta como clave HMAC.
 *
 * Particularidad sandbox: en modo prueba, Bold firma con llave VACÍA ("").
 * Esto está documentado oficialmente. Por eso el código alterna entre
 * "" y la secret real según `isBoldTestMode()`.
 *
 * Usamos `timingSafeEqual` para evitar timing attacks: comparar strings
 * con `===` filtra información sobre el secreto correcto.
 *
 * @param rawBody Cuerpo raw del request (string), exactamente como llegó.
 *                NO uses `JSON.parse` y luego `JSON.stringify`, porque
 *                cambia el formato y la firma deja de coincidir.
 * @param signature Header `x-bold-signature` del request.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;

  // En sandbox la clave HMAC es string vacío. En producción es la secret real.
  const hmacKey = isBoldTestMode() ? "" : getBoldSecretKey();

  // Bold codifica el cuerpo a base64 antes de firmar
  const encoded = Buffer.from(rawBody, "utf8").toString("base64");
  const expected = createHmac("sha256", hmacKey).update(encoded).digest("hex");

  // Comparación timing-safe
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
