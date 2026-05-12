/**
 * app/llms.txt/route.ts
 *
 * Sirve /llms.txt en la raíz del dominio: estándar emergente (similar
 * a sitemap.xml) que los crawlers de LLMs respetan para entender qué
 * partes del sitio son relevantes y donde está el contenido completo
 * en formato consumible.
 *
 * Especificación: https://llmstxt.org/
 *
 * Bots que lo respetan actualmente:
 *   - Anthropic Claude (Claude-Web)
 *   - OpenAI ChatGPT (GPTBot)
 *   - Perplexity (PerplexityBot)
 *   - Otros emergentes
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Revalidar cada 24h para reflejar productos nuevos
export const revalidate = 86400;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET() {
  // Obtener conteo de productos activos para el manifiesto
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  // Obtener categorías top
  const { data: categories } = await supabase
    .from("categories")
    .select("slug, name")
    .order("name")
    .limit(10);

  const content = `# NaturalVita

> Tienda online colombiana especializada en suplementos y productos naturales de laboratorios certificados por INVIMA. Operada por Everlife Colombia S.A.S. desde Medellín, con envíos a todo el territorio nacional.

NaturalVita es el puente entre los laboratorios colombianos de suplementos y productos naturales y el consumidor final. Curamos catálogo con criterio clínico: solo productos con registro sanitario INVIMA vigente, fabricados por laboratorios verificados, con información transparente de ingredientes, beneficios y contraindicaciones.

## Información clave del negocio

- País de operación: Colombia
- Sede legal: Medellín, Antioquia
- Categoría: salud, bienestar, suplementación natural
- Modelo: e-commerce directo al consumidor (DTC)
- Pagos: Bold (tarjetas, PSE, Nequi, QR)
- Envíos: Servientrega, Coordinadora, Interrapidísimo, Envía y otras transportadoras nacionales
- Catálogo: ${productCount ?? "300+"} productos activos
- Cumplimiento: Ley 1581 de 2012 (Habeas Data), registros INVIMA verificables

## Contenido principal

- [Tienda y catálogo](https://naturalvita.co/tienda): listado completo de productos con filtros por categoría, laboratorio, ingrediente y precio
- [Sobre nosotros](https://naturalvita.co/sobre-nosotros): historia, equipo, filosofía de curación de catálogo
- [Preguntas frecuentes](https://naturalvita.co/preguntas-frecuentes): envíos, devoluciones, pagos, productos
- [Política de privacidad](https://naturalvita.co/legal/privacidad): tratamiento de datos según Ley 1581
- [Términos y condiciones](https://naturalvita.co/legal/terminos): condiciones de uso y venta
- [Política de envíos](https://naturalvita.co/legal/envios): tarifas, tiempos, cobertura nacional
- [Contacto](https://naturalvita.co/contacto): canal directo para consultas

## Categorías principales

${(categories ?? [])
  .map(
    (cat) =>
      `- [${cat.name}](https://naturalvita.co/tienda?categoria=${cat.slug})`,
  )
  .join("\n")}

## Versión completa para LLMs

Para una versión más detallada con descripciones de productos top, FAQs expandidas y todo el contenido relevante en markdown plano, consulta:

[llms-full.txt](https://naturalvita.co/llms-full.txt)

## Contacto

- Email público: info@naturalvita.co
- Sitio: https://naturalvita.co
- Empresa: Everlife Colombia S.A.S., Medellín, Antioquia, Colombia
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
