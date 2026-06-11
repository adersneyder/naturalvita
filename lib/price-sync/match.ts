import type { MatchCandidate, MatchedLine, ParsedLine } from "./types";

/**
 * Matching semántico LOCAL entre líneas del proveedor y productos del
 * catálogo del MISMO laboratorio. Universo chico (decenas-centenas) →
 * algoritmo cuadrático es perfectamente viable.
 *
 * Estrategia:
 *  1. Normalizar nombre: lowercase, sin acentos, sin paréntesis, sin
 *     unidades de medida ("60 caps", "x 30 tabletas"), sin "ref".
 *  2. Tokenizar: palabras de ≥3 chars + dosis ("500mg", "1000ui").
 *  3. Score: Jaccard sobre tokens, bonus si comparten SKU exacto.
 *
 * No usamos Claude aquí — el algoritmo local es suficiente para productos
 * dentro del mismo lab. Si en el futuro el catálogo crece a >1000 SKUs
 * por lab, se puede añadir una segunda pasada con Claude para los
 * `confidence: "suggest"`.
 */

type CatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
  cost_cop: number | null;
  price_cop: number | null;
};

/**
 * Normaliza un nombre para comparar. Idempotente.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .replace(/\([^)]*\)/g, " ") // quita contenido entre paréntesis
    .replace(/\bref(?:erencia)?\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokeniza separando dosis ("500mg" → token único) de palabras.
 */
function tokenize(text: string): Set<string> {
  const normalized = normalize(text);
  const tokens = new Set<string>();
  for (const word of normalized.split(/\s+/)) {
    if (!word) continue;
    // Capturamos dosis (500mg, 1000ui, 30caps, 60tab) como un solo token
    // para que matcheen exactamente y no diluyan con números sueltos.
    const doseMatch = word.match(
      /^(\d+(?:[.,]\d+)?)(mg|g|mcg|ui|ml|caps?|tab|tabletas?|capsulas?|comprimidos?|porciones?|gomas?|gotas?)$/,
    );
    if (doseMatch) {
      tokens.add(`${doseMatch[1]}${doseMatch[2]}`);
      continue;
    }
    // Números sueltos los ignoramos salvo que tengan ≥3 dígitos (ej. "500"
    // suelto sin unidad probablemente sea una dosis truncada).
    if (/^\d+$/.test(word)) {
      if (word.length >= 3) tokens.add(word);
      continue;
    }
    if (word.length >= 3) tokens.add(word);
  }
  return tokens;
}

/**
 * Jaccard normalizado con peso a tokens de dosis (más discriminativos).
 */
function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  let weightedInter = 0;
  let weightedUnion = 0;
  const seen = new Set<string>();

  const isDose = (t: string) => /\d/.test(t);

  for (const t of a) {
    const w = isDose(t) ? 2 : 1;
    weightedUnion += w;
    if (b.has(t)) {
      intersection++;
      weightedInter += w;
    }
    seen.add(t);
  }
  for (const t of b) {
    if (seen.has(t)) continue;
    weightedUnion += isDose(t) ? 2 : 1;
  }
  // Promedio entre Jaccard simple y Jaccard pesado por dosis.
  const union = a.size + b.size - intersection;
  const jaccard = intersection / union;
  const weighted = weightedInter / weightedUnion;
  return jaccard * 0.4 + weighted * 0.6;
}

function decideConfidence(top: MatchCandidate | null, second: MatchCandidate | null) {
  if (!top) return "none" as const;
  if (top.score < 0.5) return "none" as const;
  if (top.score >= 0.85 && (!second || top.score - second.score >= 0.15)) {
    return "auto" as const;
  }
  return "suggest" as const;
}

/**
 * Ejecuta el matching de una línea contra un catálogo. Retorna top-3
 * candidatos con score.
 */
function matchOne(
  line: ParsedLine,
  catalog: CatalogProduct[],
): MatchedLine {
  const lineTokens = tokenize(line.supplier_name);
  const candidates: MatchCandidate[] = [];

  for (const product of catalog) {
    const productTokens = tokenize(product.name);
    let score = similarity(lineTokens, productTokens);

    // Bonus por match exacto de SKU. Si el proveedor mandó SKU y coincide
    // con el SKU interno (que es nuestro SKU del proveedor en la mayoría
    // de fichas), forzamos score alto.
    if (
      line.supplier_sku &&
      product.sku &&
      line.supplier_sku.toLowerCase() === product.sku.toLowerCase()
    ) {
      score = Math.max(score, 0.95);
    }

    candidates.push({
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      current_cost_cop: product.cost_cop,
      current_price_cop: product.price_cop,
      score,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const top3 = candidates.slice(0, 3);
  const confidence = decideConfidence(top3[0] ?? null, top3[1] ?? null);

  return {
    ...line,
    candidates: top3,
    confidence,
    // Para "auto", pre-seleccionamos el match. Admin puede desmarcar.
    decision: confidence === "auto" ? top3[0].product_id : null,
  };
}

/**
 * Punto de entrada. Para cada línea del proveedor, encuentra los top-3
 * candidatos del catálogo. Si dos líneas distintas matchean al mismo
 * producto con "auto", se reportan ambas (el admin decidirá).
 */
export function matchLines(
  lines: ParsedLine[],
  catalog: CatalogProduct[],
): MatchedLine[] {
  return lines.map((line) => matchOne(line, catalog));
}
