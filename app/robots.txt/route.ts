/**
 * app/robots.txt/route.ts
 *
 * Robots.txt extendido para NaturalVita.
 *
 * Permite explícitamente:
 *   - Bots tradicionales (Google, Bing, DuckDuckGo, Yandex)
 *   - Bots de IA (Claude, ChatGPT, Perplexity, Google AI Overviews, Apple AI)
 *
 * Bloquea áreas sensibles:
 *   - /admin (panel administrativo)
 *   - /api (excepto los específicos públicos)
 *   - /mi-cuenta (datos del cliente)
 *   - /checkout (proceso transaccional)
 *
 * Importante: aunque la mayoría de bots respetan robots.txt, no es
 * mecanismo de seguridad — es declaración de intención. Las protecciones
 * reales son RLS en Supabase y auth middleware en Next.
 */

import { NextResponse } from "next/server";

export const revalidate = 86400;

export async function GET() {
  const content = `# NaturalVita robots.txt
# https://naturalvita.co

# ============================================================
# Bots tradicionales de buscadores
# ============================================================

User-agent: Googlebot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/
Disallow: /_next/

User-agent: Bingbot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/
Disallow: /_next/

User-agent: DuckDuckBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

User-agent: YandexBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

User-agent: Baiduspider
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

# ============================================================
# Bots de IA generativa
# Política: PERMITIR explícitamente. Estos bots respetan robots.txt
# y omiten dominios sin declaración explícita por política conservadora.
# Queremos que indexen NaturalVita para que aparezcamos en respuestas
# de IA cuando usuarios pregunten sobre suplementos en Colombia.
# ============================================================

# OpenAI ChatGPT y entrenamiento
User-agent: GPTBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

User-agent: ChatGPT-User
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

User-agent: OAI-SearchBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

# Anthropic Claude (web search y entrenamiento)
User-agent: ClaudeBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

User-agent: Claude-Web
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

User-agent: anthropic-ai
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

# Google AI (Bard, Gemini, AI Overviews)
User-agent: Google-Extended
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

# Perplexity
User-agent: PerplexityBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

# Apple Intelligence
User-agent: Applebot-Extended
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

# Meta AI (Llama)
User-agent: meta-externalagent
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

User-agent: FacebookBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

# ByteDance / TikTok
User-agent: Bytespider
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

# Cohere
User-agent: cohere-ai
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

# You.com
User-agent: YouBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

# Common Crawl (usado por muchos LLMs como dataset base)
User-agent: CCBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

# Diffbot
User-agent: Diffbot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/

# ============================================================
# Bots de scraping malicioso conocidos: BLOQUEAR
# ============================================================

User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

# ============================================================
# Fallback para bots no listados arriba
# ============================================================

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mi-cuenta/
Disallow: /checkout/
Disallow: /_next/
Disallow: /buscar?
Crawl-delay: 1

# ============================================================
# Sitemaps
# ============================================================

Sitemap: https://naturalvita.co/sitemap.xml

# ============================================================
# Recursos para LLMs (estándar emergente llmstxt.org)
# ============================================================

# Para LLMs: ver también /llms.txt y /llms-full.txt
# para contenido estructurado del sitio.
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
