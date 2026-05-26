// ============================================================
// quiz-reco-sync — Reclasificación automática del quiz NaturalVita
// ------------------------------------------------------------
// Lee los productos "sucios" (cuyo contenido cambió desde la última
// clasificación), pide a Claude que los clasifique contra las
// necesidades del quiz aplicando los filtros de etapa/presentación/
// seguridad, escribe en quiz_recommendations y los marca como
// sincronizados. Se invoca desde pg_cron (semanal) o desde el admin
// (botón masivo / por producto).
//
// Seguridad: requiere header x-sync-secret == QUIZ_SYNC_SECRET.
// No expone datos al público; sólo escribe el mapa.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const QUIZ_SYNC_SECRET = Deno.env.get("QUIZ_SYNC_SECRET")!;
const MODEL = Deno.env.get("QUIZ_SYNC_MODEL") ?? "claude-opus-4-7";

// Tope de productos por corrida, para no exceder tiempos de ejecución.
const MAX_PER_RUN = Number(Deno.env.get("QUIZ_SYNC_MAX_PER_RUN") ?? "25");

const VALID_STAGES = ["bebe", "nino", "adolescente", "embarazo", "adulto", "adulto-mayor"];
const VALID_TIERS = ["direct", "adjuvant"];

// ------------------------------------------------------------
// Prompt del sistema: codifica TODO el criterio acordado.
// Es el corazón de la calidad — mantiene el mismo razonamiento
// que se aplicó a mano en la clasificación inicial.
// ------------------------------------------------------------
function buildSystemPrompt(needs: { slug: string; name: string; description: string }[]): string {
  const needsList = needs.map((n) => `- ${n.slug}: ${n.name}. ${n.description}`).join("\n");
  return `Eres el motor de recomendaciones de NaturalVita, una tienda colombiana de suplementos y productos naturales (marca Everlife). Clasificas cada producto contra una lista de NECESIDADES de salud, decidiendo para cuáles es pertinente, con qué nivel, y para qué etapas de vida es apto.

NECESIDADES DISPONIBLES (usa exactamente estos slugs):
${needsList}

Para CADA producto debes devolver una lista de asignaciones a necesidades. Una asignación tiene:
- need_slug: uno de los slugs de arriba.
- relevance_tier: "direct" si el producto está formulado centralmente para esa necesidad; "adjuvant" si ayuda de forma complementaria/secundaria.
- score: entero 0-100. Pertinencia dentro del tier. Directas fuertes 80-95; directas claras 70-85; coadyuvantes útiles 45-60; por debajo de 45 NO lo incluyas (se descarta).
- suitable_stages: arreglo con las etapas de vida APTAS, entre: ${VALID_STAGES.join(", ")}.
- reason: una frase breve en español colombiano, en lenguaje de ACOMPAÑAMIENTO y bienestar, nunca de tratamiento ni cura. Ej: "para acompañar momentos de tensión", "apoya el bienestar digestivo". NUNCA afirmes que cura, trata o previene enfermedades.

REGLAS DE FILTRO DE ETAPA Y PRESENTACIÓN (decisivas, incluyen o excluyen — no suman puntos):
1. PRESENTACIÓN vs EDAD: un bebé o niño pequeño NO traga softgels, cápsulas ni tabletas. Si el producto es softgels/capsules/tablets de uso INTERNO, excluye 'bebe' y normalmente 'nino' (deja desde 'adolescente'). Presentaciones líquidas (drops, syrup) o en polvo (powder) ingeribles pueden ser aptas para 'nino' e incluso 'bebe' si el contenido es seguro.
2. USO EXTERNO vs INTERNO: si el producto es de uso COSMÉTICO/TÓPICO (aceites cosméticos, cremas, geles, árnica tópica), la presentación "drops" NO significa ingerible: es de aplicación externa y suele ser apto para TODAS las etapas (incluido bebé, con prudencia). Distínguelo por la descripción.
3. SEGURIDAD POR COMPOSICIÓN:
   - Brandy/alcohol como conservante (típico en esencias florales): excluye 'bebe' y 'embarazo'.
   - Laxantes estimulantes (sen, cáscara sagrada, ruibarbo): excluye 'embarazo' y 'nino'.
   - Miel: excluye 'bebe' (menores de 1 año).
   - Ante cualquier duda de seguridad para una etapa vulnerable (bebé, embarazo), EXCLÚYELA. Es preferible mostrar de menos que recomendar algo inadecuado.

CRITERIO DE PERTINENCIA:
- Usa TODA la info: nombre, categoría, descripción, composición, dosis, presentación, colecciones.
- Un producto puede aplicar a varias necesidades con tiers distintos (ej. colágeno+C es 'belleza' directa y 'articulaciones' directa, 'defensas' coadyuvante).
- El colágeno apoya MÁS articulaciones/tejido conectivo que huesos: para huesos es a lo sumo coadyuvante.
- Esencias florales: SIEMPRE en lenguaje emocional/de acompañamiento, mapéalas a 'calma' aunque su nombre mencione una condición. Usa el nombre del producto tal cual viene.
- Si un producto no encaja con pertinencia ≥45 en ninguna necesidad, devuelve lista vacía. Es válido y correcto.

FORMATO DE SALIDA: responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown. Un arreglo de objetos, uno por asignación:
[{"need_slug":"...","relevance_tier":"direct|adjuvant","score":0,"suitable_stages":["adulto"],"reason":"..."}]
Si el producto no aplica a ninguna necesidad, responde: []`;
}

function buildUserPrompt(p: Record<string, unknown>): string {
  return `Clasifica este producto:

Nombre: ${p.name ?? ""}
Categoría: ${p.categoria ?? ""}
Tipo de presentación: ${p.presentation_type ?? "(no especificado)"}
Presentación: ${p.presentation ?? ""}
Descripción corta: ${p.short_description ?? ""}
Descripción larga: ${p.full_description ?? ""}
Composición y uso: ${p.composition_use ?? ""}
Dosis: ${p.dosage ?? ""}
Ingredientes: ${p.ingredients ?? ""}
Colecciones: ${p.cols ?? "(ninguna)"}

Devuelve solo el JSON de asignaciones.`;
}

async function classifyProduct(
  system: string,
  product: Record<string, unknown>,
): Promise<{ need_slug: string; relevance_tier: string; score: number; suitable_stages: string[]; reason: string }[]> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: buildUserPrompt(product) }],
    }),
  });
  if (!resp.ok) {
    throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`);
  }
  const data = await resp.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("")
    .trim();
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Respuesta no es JSON válido: ${clean.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed)) return [];
  // Validación defensiva de cada asignación
  return parsed.filter((a) =>
    a && typeof a === "object" &&
    VALID_TIERS.includes((a as { relevance_tier?: string }).relevance_tier ?? "") &&
    typeof (a as { need_slug?: string }).need_slug === "string" &&
    typeof (a as { score?: number }).score === "number" &&
    ((a as { score: number }).score) >= 45 &&
    Array.isArray((a as { suitable_stages?: unknown }).suitable_stages)
  ).map((a) => {
    const x = a as { need_slug: string; relevance_tier: string; score: number; suitable_stages: string[]; reason?: string };
    return {
      need_slug: x.need_slug,
      relevance_tier: x.relevance_tier,
      score: Math.max(0, Math.min(100, Math.round(x.score))),
      suitable_stages: x.suitable_stages.filter((s) => VALID_STAGES.includes(s)),
      reason: (x.reason ?? "").slice(0, 300),
    };
  });
}

Deno.serve(async (req: Request) => {
  // Autenticación por secreto compartido
  if (req.headers.get("x-sync-secret") !== QUIZ_SYNC_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const triggerSource: string = body.trigger_source ?? "cron";
  const singleProductId: string | null = body.product_id ?? null;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Abrir registro de corrida
  const { data: runRow } = await supabase
    .from("quiz_reco_sync_runs")
    .insert({ trigger_source: triggerSource, status: "running" })
    .select("id")
    .single();
  const runId = runRow?.id;

  try {
    // Necesidades activas para el prompt
    const { data: needs } = await supabase
      .from("quiz_needs")
      .select("slug,name,description")
      .eq("is_active", true)
      .order("sort_order");
    const system = buildSystemPrompt(needs ?? []);

    // Resolver necesidad slug -> id
    const { data: allNeeds } = await supabase.from("quiz_needs").select("id,slug");
    const needIdBySlug = new Map((allNeeds ?? []).map((n) => [n.slug, n.id]));

    // Productos a procesar: uno concreto, o la cola de sucios.
    // La comparación columna-a-columna (content_hash != synced_hash) no se
    // puede expresar en PostgREST, así que la cola de sucios se resuelve con
    // la vista quiz_reco_dirty_products (hace la comparación en SQL).
    const PRODUCT_COLS =
      "id,name,short_description,description,full_description,composition_use,dosage,ingredients,presentation,presentation_type,category_id,reco_content_hash,categories(name)";
    let candidates:
      | Record<string, unknown>[]
      | null = null;
    if (singleProductId) {
      const { data } = await supabase
        .from("products").select(PRODUCT_COLS)
        .eq("is_active", true).eq("status", "active").eq("id", singleProductId)
        .limit(1);
      candidates = data;
    } else {
      // IDs sucios desde la vista, luego traer su contenido
      const { data: dirty } = await supabase
        .from("quiz_reco_dirty_products").select("id").limit(MAX_PER_RUN);
      const dirtyIds = (dirty ?? []).map((d: { id: string }) => d.id);
      if (dirtyIds.length === 0) {
        candidates = [];
      } else {
        const { data } = await supabase
          .from("products").select(PRODUCT_COLS).in("id", dirtyIds);
        candidates = data;
      }
    }

    let processed = 0, failed = 0;
    const dirtyCount = candidates?.length ?? 0;

    for (const prod of candidates ?? []) {
      try {
        // Colecciones del producto
        const { data: cols } = await supabase
          .from("product_collections").select("collections(slug)").eq("product_id", prod.id);
        const colSlugs = (cols ?? []).map((c: { collections?: { slug?: string } }) => c.collections?.slug).filter(Boolean).join(",");

        const enriched = {
          ...prod,
          categoria: (prod as { categories?: { name?: string } }).categories?.name ?? "",
          cols: colSlugs,
        };

        const assignments = await classifyProduct(system, enriched);

        // Reemplazo atómico: borrar recomendaciones previas de este producto y reinsertar
        await supabase.from("quiz_recommendations").delete().eq("product_id", prod.id);
        if (assignments.length > 0) {
          const rows = assignments
            .filter((a) => needIdBySlug.has(a.need_slug))
            .map((a) => ({
              need_id: needIdBySlug.get(a.need_slug),
              product_id: prod.id,
              relevance_tier: a.relevance_tier,
              score: a.score,
              reason: a.reason,
              suitable_stages: a.suitable_stages,
              review_status: "approved", // auto-aprobado: política definida por el negocio
              generated_by: MODEL,
            }));
          if (rows.length > 0) {
            await supabase.from("quiz_recommendations").insert(rows);
          }
        }

        // Marcar como sincronizado (no dispara el trigger de hash)
        await supabase.from("products")
          .update({ reco_synced_hash: prod.reco_content_hash, reco_synced_at: new Date().toISOString() })
          .eq("id", prod.id);

        processed++;
      } catch (e) {
        failed++;
        console.error(`Fallo clasificando ${prod.id} (${prod.name}):`, e);
      }
    }

    await supabase.from("quiz_reco_sync_runs").update({
      dirty_count: dirtyCount, processed, failed,
      status: "completed", finished_at: new Date().toISOString(),
    }).eq("id", runId);

    return new Response(JSON.stringify({ ok: true, dirtyCount, processed, failed }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    await supabase.from("quiz_reco_sync_runs").update({
      status: "failed", error_detail: String(e), finished_at: new Date().toISOString(),
    }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
});
