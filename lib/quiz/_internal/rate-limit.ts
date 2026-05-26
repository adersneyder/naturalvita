// lib/quiz/_internal/rate-limit.ts
// Rate limiter autocontenido para el guardado de resultados del quiz.
// Usa Upstash Redis (que el proyecto ya emplea). Si las variables de Upstash
// no están presentes, degrada a "permitir" para no romper el quiz (el guardado
// no es una operación sensible: solo persiste un resultado con email opcional).
//
// Si prefieres usar el rate limiter central del repo, reemplaza quizRateLimit
// por una llamada a tu helper; la firma esperada es: limit(id) => { success }.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (limiter) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // sin Upstash configurado -> sin límite
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "10 m"), // 5 guardados por email cada 10 min
    prefix: "quiz-save",
  });
  return limiter;
}

export async function quizRateLimit(id: string): Promise<{ success: boolean }> {
  const l = getLimiter();
  if (!l) return { success: true };
  try {
    const { success } = await l.limit(id);
    return { success };
  } catch {
    return { success: true }; // ante fallo de Redis, no bloquear
  }
}
