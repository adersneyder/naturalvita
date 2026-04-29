/**
 * Tipos del módulo de generación de contenido con IA.
 *
 * Aquí vive todo lo público que consume el resto del código.
 */

/**
 * Las 5 piezas editoriales de la ficha de un producto.
 * Es lo que devuelve la IA en JSON y lo que se persiste en columnas planas
 * en la tabla products.
 */
export type AiContentFields = {
  short_description: string;
  full_description: string;
  composition_use: string;
  dosage: string;
  warnings: string;
};

/**
 * Variables que se inyectan en la plantilla base.
 * Se construyen desde los datos del producto + categoría + hermanos.
 */
export type PromptVariables = {
  nombre: string;
  categoria: string;
  invima: string;
  laboratorio: string;
  presentacion: string;
  descripcion_origen: string;
  hermanos: string;
};

/**
 * Identificadores de las plantillas regulatorias.
 * Cada categoría del catálogo mapea a una de estas plantillas.
 */
export type PromptTemplateId =
  | "alimento_suplemento"
  | "fitoterapeutico"
  | "dermocosmetico"
  | "esencia_floral"
  | "homeopatico";

/**
 * Resultado de la validación regulatoria automática que corre sobre el output de la IA
 * antes de aplicarlo al producto. Si hay términos prohibidos, el contenido NO se aplica.
 */
export type RegulatoryCheckResult = {
  passed: boolean;
  /** Lista de términos prohibidos detectados, o lista vacía si pasó. */
  issues: string[];
  /** Detalle por campo de qué término prohibido apareció dónde. */
  details: Array<{
    field: keyof AiContentFields;
    term: string;
    snippet: string;
  }>;
};

/**
 * Status final de una llamada de generación.
 * Coincide con el CHECK constraint de la columna ai_generation_log.status.
 */
export type GenerationStatus =
  | "success"
  | "regulatory_failed"
  | "api_error"
  | "parse_error";

/**
 * Resultado completo de una llamada de generación.
 * Es lo que recibe el endpoint y lo que se loguea en BD.
 */
export type GenerationResult = {
  status: GenerationStatus;
  template_id: PromptTemplateId;
  model: string;
  /** El texto bruto que devolvió la IA. Útil para debugging. */
  output_raw: string | null;
  /** El JSON parseado (si se pudo parsear y pasó validación). */
  output_parsed: AiContentFields | null;
  /** Issues regulatorias detectadas (si las hubo). */
  regulatory: RegulatoryCheckResult | null;
  /** Métricas. */
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  duration_ms: number;
  /** Mensaje de error si status es api_error o parse_error. */
  error_message: string | null;
};

/**
 * Metadata que se guarda en products.ai_metadata cuando una generación se aplica.
 */
export type ProductAiMetadata = {
  generated_at: string; // ISO timestamp
  model: string;
  template_id: PromptTemplateId;
  template_version: string; // ej: "v1"
  regulatory_check_passed: boolean;
  manual_edits_count: number;
  last_edit_at: string | null;
};
