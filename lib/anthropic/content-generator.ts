import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPrompt,
  getDisclaimerForTemplate,
  getTemplateIdForCategory,
  validateRegulatoryCompliance,
  validateStructure,
  type AiContentFields,
  type GenerationResult,
  type PromptVariables,
} from "@/lib/ai-content";
import { ACTIVE_MODEL, createAnthropicClient, estimateCostUsd } from "./client";

/**
 * Versión del schema de plantillas. Si en el futuro cambiamos la estructura
 * de los 5 campos o la voz de marca, incrementar para auditoría.
 * Se persiste en ai_metadata.template_version y en ai_generation_log.
 */
const TEMPLATE_VERSION = "v1";

/**
 * Datos mínimos del producto necesarios para construir el prompt.
 * Lo que cargamos de la BD antes de llamar al API.
 */
type ProductForGeneration = {
  id: string;
  name: string;
  invima_number: string | null;
  presentation: string | null;
  description: string | null; // descripción cruda que vino del scraper
  category_slug: string | null;
  category_name: string | null;
  laboratory_name: string | null;
};

/**
 * Carga los datos del producto + categoría + laboratorio en una sola query.
 * Devuelve null si no existe o no tiene categoría asignada (no podemos generar
 * sin saber qué plantilla regulatoria usar).
 */
export async function loadProductForGeneration(
  supabase: SupabaseClient,
  productId: string,
): Promise<ProductForGeneration | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, invima_number, presentation, description,
       category:categories!category_id(slug, name),
       laboratory:laboratories!laboratory_id(name)`,
    )
    .eq("id", productId)
    .single();

  if (error || !data) return null;

  const cat = Array.isArray(data.category) ? data.category[0] : data.category;
  const lab = Array.isArray(data.laboratory) ? data.laboratory[0] : data.laboratory;

  if (!cat?.slug) return null;

  return {
    id: data.id,
    name: data.name,
    invima_number: data.invima_number,
    presentation: data.presentation,
    description: data.description,
    category_slug: cat.slug,
    category_name: cat.name,
    laboratory_name: lab?.name ?? null,
  };
}

/**
 * Carga hasta 5 productos hermanos (misma categoría + laboratorio) que ya tienen
 * full_description generada, para pasarle a la IA y que diversifique el ángulo.
 *
 * No falla si no hay hermanos: devuelve string vacío que el prompt resolverá
 * a "(no disponible)".
 */
async function loadSiblings(
  supabase: SupabaseClient,
  product: ProductForGeneration,
): Promise<string> {
  const { data } = await supabase
    .from("products")
    .select("name")
    .eq("category_id", await getCategoryIdBySlug(supabase, product.category_slug!))
    .eq("laboratory_id", await getLaboratoryIdByName(supabase, product.laboratory_name ?? ""))
    .neq("id", product.id)
    .not("full_description", "is", null)
    .limit(5);

  if (!data || data.length === 0) return "";
  return data.map((p) => p.name).join(", ");
}

async function getCategoryIdBySlug(supabase: SupabaseClient, slug: string): Promise<string> {
  const { data } = await supabase.from("categories").select("id").eq("slug", slug).single();
  return data?.id ?? "";
}

async function getLaboratoryIdByName(supabase: SupabaseClient, name: string): Promise<string> {
  if (!name) return "";
  const { data } = await supabase.from("laboratories").select("id").eq("name", name).single();
  return data?.id ?? "";
}

/**
 * Genera el contenido IA para un producto. NO lo aplica al producto: solo devuelve
 * el resultado. La aplicación es responsabilidad del caller (endpoint o bulk),
 * que decide según política de aprobación.
 *
 * Siempre intenta persistir un registro en ai_generation_log, pase lo que pase.
 * Esto da trazabilidad completa para debugging y auditoría de costos.
 */
export async function generateContentForProduct(
  supabase: SupabaseClient,
  productId: string,
  triggeredBy: string | null,
): Promise<GenerationResult> {
  const startTime = Date.now();
  let logFields: {
    template_id: string;
    prompt_input: PromptVariables | null;
    output_raw: string | null;
    output_parsed: AiContentFields | null;
    regulatory_issues: string[] | null;
    input_tokens: number;
    output_tokens: number;
    estimated_cost_usd: number;
    duration_ms: number;
    status: GenerationResult["status"];
    error_message: string | null;
  } = {
    template_id: "alimento_suplemento",
    prompt_input: null,
    output_raw: null,
    output_parsed: null,
    regulatory_issues: null,
    input_tokens: 0,
    output_tokens: 0,
    estimated_cost_usd: 0,
    duration_ms: 0,
    status: "api_error",
    error_message: null,
  };

  try {
    // 1. Cargar producto
    const product = await loadProductForGeneration(supabase, productId);
    if (!product) {
      throw new Error("Producto no encontrado o sin categoría asignada");
    }

    // 2. Determinar plantilla regulatoria por categoría
    const templateId = getTemplateIdForCategory(product.category_slug);
    logFields.template_id = templateId;

    // 3. Cargar hermanos para diversificación
    const siblings = await loadSiblings(supabase, product);

    // 4. Construir variables y prompt
    const variables: PromptVariables = {
      nombre: product.name,
      categoria: product.category_name ?? "",
      invima: product.invima_number ?? "",
      laboratorio: product.laboratory_name ?? "",
      presentacion: product.presentation ?? "",
      descripcion_origen: product.description ?? "",
      hermanos: siblings,
    };
    logFields.prompt_input = variables;

    const promptText = buildPrompt(templateId, variables);

    // 5. Llamar a Anthropic API
    const anthropic = createAnthropicClient();
    const response = await anthropic.messages.create({
      model: ACTIVE_MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: promptText }],
    });

    logFields.input_tokens = response.usage.input_tokens;
    logFields.output_tokens = response.usage.output_tokens;
    logFields.estimated_cost_usd = estimateCostUsd(
      response.usage.input_tokens,
      response.usage.output_tokens,
    );

    // 6. Extraer texto de la respuesta
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("La respuesta del API no contiene bloque de texto");
    }
    const rawText = textBlock.text.trim();
    logFields.output_raw = rawText;

    // 7. Parsear JSON. La IA a veces incluye ```json ... ``` aunque le pidamos lo contrario
    const jsonStr = extractJson(rawText);
    let parsed: AiContentFields;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      logFields.status = "parse_error";
      logFields.error_message =
        err instanceof Error ? err.message : "JSON parse error";
      throw new Error(`No se pudo parsear el JSON de la respuesta: ${logFields.error_message}`);
    }
    logFields.output_parsed = parsed;

    // 8 y 9. Validar estructura y compliance regulatorio.
    // Diseño: ningún path lanza. El admin recibe el draft incluso si hay problemas
    // y decide qué hacer (aprobar tal cual con riesgo, editar y aprobar, descartar).
    let regulatory: ReturnType<typeof validateRegulatoryCompliance> | null = null;
    const struct = validateStructure(parsed);
    const structuralWarnings: string[] = struct.warnings;

    const disclaimer = getDisclaimerForTemplate(templateId);
    regulatory = validateRegulatoryCompliance(templateId, parsed, [disclaimer]);

    // Determinar status: parse_error tiene precedencia (problema más fundamental),
    // luego regulatory_failed, luego success.
    if (!struct.ok) {
      logFields.status = "parse_error";
      const note = structuralWarnings.length > 0
        ? ` · advertencias: ${structuralWarnings.join(" · ")}`
        : "";
      logFields.error_message = `Estructura: ${struct.errors.join(" · ")}${note}`;
    } else if (!regulatory.passed) {
      logFields.status = "regulatory_failed";
      logFields.regulatory_issues = regulatory.issues;
      logFields.error_message = `Términos prohibidos: ${regulatory.issues.join(", ")}`;
    } else {
      logFields.status = "success";
      if (structuralWarnings.length > 0) {
        logFields.error_message = `Advertencias: ${structuralWarnings.join(" · ")}`;
      }
    }

    logFields.duration_ms = Date.now() - startTime;

    // 10. Persistir log
    const { error: logInsertError } = await supabase.from("ai_generation_log").insert({
      product_id: productId,
      triggered_by: triggeredBy,
      ...logFields,
      applied_to_product: false,
    });
    if (logInsertError) {
      console.error("[content-generator] Failed to insert log (success path):", logInsertError.message);
    }

    // Devolvemos el draft SIEMPRE que se haya parseado, aunque tenga issues.
    // El cliente (UI) decide qué hacer con un parse_error o regulatory_failed.
    return {
      status: logFields.status,
      template_id: templateId,
      model: ACTIVE_MODEL,
      output_raw: logFields.output_raw,
      output_parsed: parsed,
      regulatory: !regulatory.passed ? regulatory : null,
      input_tokens: logFields.input_tokens,
      output_tokens: logFields.output_tokens,
      estimated_cost_usd: logFields.estimated_cost_usd,
      duration_ms: logFields.duration_ms,
      error_message: logFields.error_message,
    };
  } catch (error) {
    logFields.duration_ms = Date.now() - startTime;
    if (logFields.status === "api_error") {
      logFields.error_message =
        error instanceof Error ? error.message : "Error desconocido";
    }

    // Persistir log incluso ante error, para tener histórico completo.
    // Si el insert mismo falla (ej. RLS), lo loggeamos para diagnóstico.
    try {
      const { error: logError } = await supabase.from("ai_generation_log").insert({
        product_id: productId,
        triggered_by: triggeredBy,
        ...logFields,
        applied_to_product: false,
      });
      if (logError) {
        console.error("[content-generator] Failed to insert log:", logError.message);
      }
    } catch (logErr) {
      console.error("[content-generator] Exception inserting log:", logErr);
    }

    return {
      status: logFields.status,
      template_id: logFields.template_id as GenerationResult["template_id"],
      model: ACTIVE_MODEL,
      output_raw: logFields.output_raw,
      output_parsed: null,
      regulatory: null,
      input_tokens: logFields.input_tokens,
      output_tokens: logFields.output_tokens,
      estimated_cost_usd: logFields.estimated_cost_usd,
      duration_ms: logFields.duration_ms,
      error_message: logFields.error_message,
    };
  }
}

/**
 * Aplica los 5 campos generados al producto y marca el log como aplicado.
 * El caller decide cuándo llamar esto: típicamente después de aprobación manual
 * en la UI, o automáticamente solo si status='success'.
 */
export async function applyContentToProduct(
  supabase: SupabaseClient,
  productId: string,
  fields: AiContentFields,
  metadata: {
    template_id: string;
    model: string;
    regulatory_check_passed: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("products")
    .update({
      short_description: fields.short_description,
      full_description: fields.full_description,
      composition_use: fields.composition_use,
      dosage: fields.dosage,
      warnings: fields.warnings,
      ai_metadata: {
        generated_at: now,
        model: metadata.model,
        template_id: metadata.template_id,
        template_version: TEMPLATE_VERSION,
        regulatory_check_passed: metadata.regulatory_check_passed,
        manual_edits_count: 0,
        last_edit_at: null,
      },
    })
    .eq("id", productId);

  if (updateError) return { success: false, error: updateError.message };

  // Marcar el último log de éxito como aplicado
  await supabase
    .from("ai_generation_log")
    .update({ applied_to_product: true, applied_at: now })
    .eq("product_id", productId)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);

  return { success: true };
}

/**
 * Extrae el JSON de la respuesta de la IA. Tolera que la IA envuelva en
 * ```json ... ``` o agregue texto antes/después aunque le hayamos dicho que no.
 */
function extractJson(rawText: string): string {
  const text = rawText.trim();

  // Caso 1: bloque ```json ... ```
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```/);
  if (fenced) return fenced[1].trim();

  // Caso 2: el JSON empieza con { y termina con } pero hay texto antes/después
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }

  // Caso 3: ya está limpio
  return text;
}
