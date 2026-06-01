// ============================================================
// quiz-reco-sync — Reclasificación automática del quiz NaturalVita
// v2: ahora asigna equivalence_group a cada producto, para que el
// quiz no muestre dos sustitutos (mismo principio activo + misma vía
// de consumo + composición similar). Productos con distinta vía
// (cápsula vs crema) reciben grupos distintos y pueden convivir.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const QUIZ_SYNC_SECRET = Deno.env.get("QUIZ_SYNC_SECRET")!;
const MODEL = Deno.env.get("QUIZ_SYNC_MODEL") ?? "claude-opus-4-7";
const MAX_PER_RUN = Number(Deno.env.get("QUIZ_SYNC_MAX_PER_RUN") ?? "25");

const VALID_STAGES = ["bebe", "nino", "adolescente", "embarazo", "adulto", "adulto-mayor"];
const VALID_TIERS = ["direct", "adjuvant"];

function buildSystemPrompt(needs: { slug: string; name: string; description: string }[]): string {
  const needsList = needs.map((n) => `- ${n.slug}: ${n.name}. ${n.description}`).join("\n");
  return `Eres el motor de recomendaciones de NaturalVita, una tienda colombiana de suplementos y productos naturales (marca Everlife). Clasificas cada producto contra una lista de NECESIDADES de salud, decidiendo para cuáles es pertinente, con qué nivel, y para qué etapas de vida es apto.

NECESIDADES DISPONIBLES (usa exactamente estos slugs):
${needsList}

Devuelve un objeto JSON con dos campos: "assignments" (lista de asignaciones a necesidades) y "equivalence_group" (texto o null).

Cada asignación de "assignments" tiene:
- need_slug: uno de los slugs de arriba.
- relevance_tier: "direct" si el producto está formulado centralmente para esa necesidad; "adjuvant" si ayuda de forma complementaria/secundaria.
- score: entero 0-100. Directas fuertes 80-95; directas claras 70-85; coadyuvantes útiles 45-60; por debajo de 45 NO lo incluyas.
- suitable_stages: arreglo con las etapas de vida APTAS, entre: ${VALID_STAGES.join(", ")}.
- reason: frase breve en español colombiano, en lenguaje de ACOMPAÑAMIENTO y bienestar, nunca de tratamiento ni cura.

REGLAS DE FILTRO DE ETAPA Y PRESENTACIÓN (decisivas, incluyen o excluyen):
1. PRESENTACIÓN vs EDAD: un bebé o niño pequeño NO traga softgels, cápsulas ni tabletas. Si es softgels/capsules/tablets de uso INTERNO, excluye 'bebe' y normalmente 'nino'. Líquidos (drops, syrup) o polvo ingeribles pueden ser aptos para 'nino' e incluso 'bebe' si el contenido es seguro.
2. USO EXTERNO vs INTERNO: si es COSMÉTICO/TÓPICO (aceites cosméticos, cremas, geles, árnica tópica), "drops" NO es ingerible: es externo y suele ser apto para TODAS las etapas (incluido bebé con prudencia).
3. SEGURIDAD: brandy/alcohol (esencias florales) excluye 'bebe' y 'embarazo'; laxantes estimulantes (sen, cáscara sagrada, ruibarbo) excluye 'embarazo' y 'nino'; miel excluye 'bebe'. Ante duda en etapa vulnerable, EXCLÚYELA.

CRITERIO DE PERTINENCIA:
- Usa TODA la info: nombre, categoría, descripción, composición, dosis, presentación, colecciones.
- Un producto puede aplicar a varias necesidades con tiers distintos.
- El colágeno apoya MÁS articulaciones/tejido conectivo que huesos: para huesos es a lo sumo coadyuvante.
- Esencias florales: SIEMPRE lenguaje emocional/acompañamiento, mapéalas a 'calma' aunque el nombre mencione una condición. Usa el nombre del producto tal cual.
- Si no encaja con pertinencia >=45 en ninguna necesidad, "assignments" vacío.

CAMPO "equivalence_group" (para no mostrar sustitutos juntos en el quiz):
Asigna un slug corto que identifique el GRUPO DE SUSTITUCIÓN del producto, combinando TRES ejes:
  (a) principio activo / función esencial (ej. citrato-magnesio, colageno-vitc, alcachofa, calcio-d)
  (b) vía de consumo (oral-solido para cápsula/softgel/tableta; liquido para drops/jarabe ingerible; polvo; topico para cremas/geles/aceites externos; sublingual)
  (c) composición sustancialmente igual
Formato del slug: principio-via, ej: "citrato-magnesio-oral-solido", "colageno-vitc-oral-solido", "alcachofa-liquido", "calcio-d-oral-solido".
REGLA CLAVE: dos productos deben recibir el MISMO equivalence_group SOLO si son sustitutos reales: mismo principio activo Y misma vía de consumo Y composición equivalente (dan lo mismo, cambiar de uno a otro no aporta nada nuevo). Ejemplos:
  - Colágeno+C en softgel x60 y el mismo en x100 -> MISMO grupo (solo cambia tamaño).
  - Colágeno+C en softgel y colágeno en crema -> grupos DISTINTOS (distinta vía: oral vs tópico, se complementan).
  - Magnesio citrato en cápsula y magnesio citrato líquido -> grupos DISTINTOS (distinta vía).
  - Magnesio citrato y magnesio + potasio en polvo -> grupos DISTINTOS (composición distinta).
Si el producto no tiene sustitutos evidentes o es único en su tipo, igual asígnale un slug descriptivo (principio-via); el sistema solo agrupará si OTRO producto comparte el mismo slug. Nunca uses null salvo que sea imposible categorizar.

FORMATO DE SALIDA: responde ÚNICAMENTE con JSON válido, sin texto adicional ni markdown:
{"assignments":[{"need_slug":"...","relevance_tier":"direct","score":80,"suitable_stages":["adulto"],"reason":"..."}],"equivalence_group":"principio-via"}
Si no aplica a ninguna necesidad: {"assignments":[],"equivalence_group":"principio-via"}`;
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

Devuelve solo el JSON.`;
}

interface ClassifyResult {
  assignments: { need_slug: string; relevance_tier: string; score: number; suitable_stages: string[]; reason: string }[];
  equivalence_group: string | null;
}

async function classifyProduct(system: string, product: Record<string, unknown>): Promise<ClassifyResult> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system, messages: [{ role: "user", content: buildUserPrompt(product) }] }),
  });
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const text = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim();
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  let parsed: unknown;
  try { parsed = JSON.parse(clean); } catch { throw new Error(`Respuesta no es JSON válido: ${clean.slice(0, 200)}`); }
  const obj = (parsed ?? {}) as { assignments?: unknown; equivalence_group?: unknown };
  const rawAssignments = Array.isArray(obj.assignments) ? obj.assignments : [];
  const assignments = rawAssignments.filter((a) =>
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
  let group: string | null = null;
  if (typeof obj.equivalence_group === "string" && obj.equivalence_group.trim().length > 0) {
    group = obj.equivalence_group.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  }
  return { assignments, equivalence_group: group };
}

Deno.serve(async (req: Request) => {
  if (req.headers.get("x-sync-secret") !== QUIZ_SYNC_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
  }
  const body = await req.json().catch(() => ({}));
  const triggerSource: string = body.trigger_source ?? "cron";
  const singleProductId: string | null = body.product_id ?? null;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: runRow } = await supabase.from("quiz_reco_sync_runs").insert({ trigger_source: triggerSource, status: "running" }).select("id").single();
  const runId = runRow?.id;

  try {
    const { data: needs } = await supabase.from("quiz_needs").select("slug,name,description").eq("is_active", true).order("sort_order");
    const system = buildSystemPrompt(needs ?? []);
    const { data: allNeeds } = await supabase.from("quiz_needs").select("id,slug");
    const needIdBySlug = new Map((allNeeds ?? []).map((n) => [n.slug, n.id]));

    const PRODUCT_COLS = "id,name,short_description,description,full_description,composition_use,dosage,ingredients,presentation,presentation_type,category_id,reco_content_hash,categories(name)";
    let candidates: Record<string, unknown>[] | null = null;
    if (singleProductId) {
      const { data } = await supabase.from("products").select(PRODUCT_COLS).eq("is_active", true).eq("status", "active").eq("id", singleProductId).limit(1);
      candidates = data;
    } else {
      const { data: dirty } = await supabase.from("quiz_reco_dirty_products").select("id").limit(MAX_PER_RUN);
      const dirtyIds = (dirty ?? []).map((d: { id: string }) => d.id);
      if (dirtyIds.length === 0) { candidates = []; }
      else { const { data } = await supabase.from("products").select(PRODUCT_COLS).in("id", dirtyIds); candidates = data; }
    }

    let processed = 0, failed = 0;
    const dirtyCount = candidates?.length ?? 0;

    for (const prod of candidates ?? []) {
      try {
        const { data: cols } = await supabase.from("product_collections").select("collections(slug)").eq("product_id", prod.id);
        const colSlugs = (cols ?? []).map((c: { collections?: { slug?: string } }) => c.collections?.slug).filter(Boolean).join(",");
        const enriched = { ...prod, categoria: (prod as { categories?: { name?: string } }).categories?.name ?? "", cols: colSlugs };
        const { assignments, equivalence_group } = await classifyProduct(system, enriched);

        await supabase.from("quiz_recommendations").delete().eq("product_id", prod.id);
        if (assignments.length > 0) {
          const rows = assignments.filter((a) => needIdBySlug.has(a.need_slug)).map((a) => ({
            need_id: needIdBySlug.get(a.need_slug), product_id: prod.id, relevance_tier: a.relevance_tier,
            score: a.score, reason: a.reason, suitable_stages: a.suitable_stages, review_status: "approved", generated_by: MODEL,
          }));
          if (rows.length > 0) await supabase.from("quiz_recommendations").insert(rows);
        }

        // Actualizar equivalence_group + marcar sincronizado
        await supabase.from("products")
          .update({ equivalence_group, reco_synced_hash: prod.reco_content_hash, reco_synced_at: new Date().toISOString() })
          .eq("id", prod.id);

        processed++;
      } catch (e) { failed++; console.error(`Fallo clasificando ${prod.id} (${prod.name}):`, e); }
    }

    await supabase.from("quiz_reco_sync_runs").update({ dirty_count: dirtyCount, processed, failed, status: "completed", finished_at: new Date().toISOString() }).eq("id", runId);
    return new Response(JSON.stringify({ ok: true, dirtyCount, processed, failed }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    await supabase.from("quiz_reco_sync_runs").update({ status: "failed", error_detail: String(e), finished_at: new Date().toISOString() }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
});
