/**
 * Tipos compartidos del sincronizador de precios.
 *
 * Una "corrida" (run) pasa por 4 estados:
 *   parsed     → archivo procesado, líneas extraídas
 *   matched    → matching ejecutado, esperando aprobación del admin
 *   applied    → cambios aplicados a products.cost_cop / source_price_cop
 *   cancelled  → admin descartó la corrida
 */

export type ParsedLine = {
  /** Índice (0-based) en el archivo fuente, útil para diagnosticar. */
  index: number;
  /** Nombre del producto tal como aparece en el archivo del proveedor. */
  supplier_name: string;
  /** SKU/código del proveedor, si vino en el archivo. */
  supplier_sku: string | null;
  /** Precio en COP (sin IVA si así viene el proveedor, ver notas del run). */
  price_cop: number;
  /** Línea cruda original (debug). */
  raw: Record<string, string | number>;
};

export type MatchCandidate = {
  product_id: string;
  product_name: string;
  product_sku: string | null;
  /** Costo actual en BD (cost_cop). */
  current_cost_cop: number | null;
  /** Precio público actual (para calcular margen). */
  current_price_cop: number | null;
  /** Score 0..1 (1 = match perfecto). */
  score: number;
};

export type MatchedLine = ParsedLine & {
  /**
   * Candidatos ordenados por score desc. Cap a top-3 para no explotar el
   * payload JSONB.
   */
  candidates: MatchCandidate[];
  /**
   * Confianza: "auto" (top1 >= 0.85 y delta >= 0.15), "suggest" (>= 0.5),
   * "none" (< 0.5). El admin SIEMPRE puede sobreescribir la decisión.
   */
  confidence: "auto" | "suggest" | "none";
  /**
   * Decisión del admin. Se rellena en Step 3.
   *   - product_id: aplicar a este producto del catálogo
   *   - "skip": no aplicar esta línea
   *   - null: no decidido (aún en preview)
   */
  decision: string | null;
};

export type RunPayload = {
  /** Versión del payload (futuro-proofing). */
  version: 1;
  /** Líneas con su matching y decisiones. */
  lines: MatchedLine[];
  /** Notas opcionales escritas por el admin al crear la corrida. */
  notes?: string;
};
