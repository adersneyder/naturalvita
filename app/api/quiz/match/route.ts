/**
 * app/api/quiz/match/route.ts
 *
 * Endpoint del matching del Quiz-Hero.
 * POST { etapa, objetivo } → { products: MatchedProduct[], cached }
 *
 * Protecciones:
 *   - Validación Zod de inputs (etapa/objetivo deben existir en el catálogo)
 *   - Rate limit Upstash (protege de abuso que gastaría tokens IA)
 *   - El matching real (pre-filtro + Haiku + caché) vive en lib/quiz/match-products
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { matchProducts } from "@/lib/quiz/match-products";
import { STAGES, GOALS } from "@/components/home/quiz-data";

const stageIds = STAGES.map((s) => s.id) as [string, ...string[]];
const goalIds = GOALS.map((g) => g.id) as [string, ...string[]];

const schema = z.object({
  etapa: z.enum(stageIds),
  objetivo: z.enum(goalIds),
});

// Rate limit: 20 matches por IP cada 10 minutos. Suficiente para uso real,
// frena scripts abusivos. El caché absorbe la mayoría de repeticiones.
let _ratelimit: Ratelimit | null = null;
function getRateLimit(): Ratelimit | null {
  if (_ratelimit) return _ratelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // si no hay Upstash, no bloquea
  _ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(20, "10 m"),
    prefix: "ratelimit:quiz-match",
  });
  return _ratelimit;
}

export async function POST(request: NextRequest) {
  // Rate limit
  const rl = getRateLimit();
  if (rl) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";
    const { success } = await rl.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "rate_limited", message: "Demasiadas consultas. Intenta en unos minutos." },
        { status: 429 },
      );
    }
  }

  // Validación de input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Matching
  try {
    const result = await matchProducts(parsed.data.etapa, parsed.data.objetivo);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/quiz/match] Error:", err);
    return NextResponse.json(
      { error: "match_failed", message: "No pudimos generar recomendaciones." },
      { status: 500 },
    );
  }
}
