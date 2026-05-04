import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Cliente Redis tomado de variables de entorno:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Si Upstash no está configurado en este entorno, las llamadas fallarán al
 * primer uso. Por eso el cliente se importa lazy: si no hay endpoints
 * públicos sensibles aún (catálogo público es 100% RSC sin endpoints),
 * el ratelimit no se ejercita y nada se rompe.
 */
const redis = Redis.fromEnv();

/**
 * Limitador genérico para endpoints públicos (contacto, suscripción, etc.).
 * 30 peticiones por IP en ventana deslizante de 1 minuto.
 */
export const publicApiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "rl:public",
  analytics: true,
});

/**
 * Limitador para búsqueda y operaciones de catálogo (cuando se exponga API).
 */
export const searchRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:search",
  analytics: true,
});

/**
 * Extrae IP del cliente respetando el header de Vercel.
 */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() ?? "127.0.0.1";
}

/**
 * Versión para usar en server actions que no tienen acceso a Request.
 * Usa next/headers().
 */
export async function getClientIpFromHeaders(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() ?? "127.0.0.1";
}
