/**
 * lib/catalog/name-normalizer.ts
 *
 * Normaliza el nombre de un producto al formato canónico de NaturalVita:
 *   - "echinacea gotas 60ml"          -> name: "Echinacea"               / pres: "60 ml"   / type: drops
 *   - "Centella Asiática 400 mg x 60 cápsulas" -> name: "Centella Asiática 400 mg" / pres: "60 cápsulas" / type: capsules
 *   - "C MIEL 240mL"                  -> name: "C Miel"                  / pres: "240 ml"  / type: drops
 *   - "BCAA 750 mg x 120 Softgels"    -> name: "BCAA 750 mg"             / pres: "120 softgels" / type: softgels
 *   - "Calcium 600 + Vitamin D x 100 Softgels" -> name: "Calcium 600 + Vitamin D" / pres: "100 softgels" / type: softgels
 *
 * Reglas:
 *   1. El nombre conserva el nombre comercial + la dosis activa por unidad
 *      (ej. "400 mg") que es información comercial relevante. NO incluye la
 *      cantidad total ni la forma física (cápsulas, ml, etc).
 *   2. Capitalización tipo título con excepciones: cada palabra inicial en
 *      mayúscula, salvo preposiciones cortas en español (de, del, la, en, con,
 *      sin, y, o, a, al, para). Unidades de medida en minúscula (ml, g, mg,
 *      kg, mcg, oz, L). Acrónimos siempre en mayúscula (BCAA, MSM, MCT, CLA,
 *      HCL, OMG, EPA, DHA, CoQ10, IGF, NAC).
 *   3. La presentación extraída (forma + tamaño) NO sobrescribe lo que ya
 *      había en BD si lo existente es más específico o tenía otra fuente.
 *      El caller decide.
 */

// Acrónimos comunes en suplementos/cosmética que conservan mayúsculas tal cual.
const ACRONYMS = new Set([
  "ADN",
  "ARN",
  "ATP",
  "BCAA",
  "CLA",
  "CoQ10",
  "DHA",
  "DMG",
  "EAA",
  "EPA",
  "GABA",
  "GLA",
  "HCL",
  "HCl",
  "HMB",
  "HPA",
  "IGF",
  "MCT",
  "MK7",
  "MSM",
  "NAC",
  "NMN",
  "OPC",
  "PCC",
  "PEA",
  "PGA",
  "SAM",
  "SAMe",
  "SOD",
  "TMG",
  "VEGAN",
  "ZMA",
]);

// Palabras "menores" en español que van en minúscula si no son la primera/última.
const SPANISH_LOWERCASE = new Set([
  "de",
  "del",
  "la",
  "las",
  "el",
  "los",
  "en",
  "con",
  "sin",
  "y",
  "e",
  "o",
  "u",
  "a",
  "al",
  "para",
  "por",
  "su",
]);

// Unidades de medida que SIEMPRE van en minúscula (excepto L mayúscula
// para litros, decisión SI internacional).
const UNIT_TOKENS = new Set([
  "ml",
  "mg",
  "mcg",
  "g",
  "gm",
  "gr",
  "kg",
  "oz",
  "lb",
  "lbs",
  "iu",
  "ui",
]);

const PRESENTATION_FORMS: Record<string, { es: string; type: string }> = {
  capsule: { es: "cápsulas", type: "capsules" },
  capsules: { es: "cápsulas", type: "capsules" },
  cápsula: { es: "cápsulas", type: "capsules" },
  cápsulas: { es: "cápsulas", type: "capsules" },
  softgel: { es: "softgels", type: "softgels" },
  softgels: { es: "softgels", type: "softgels" },
  tablet: { es: "tabletas", type: "tablets" },
  tablets: { es: "tabletas", type: "tablets" },
  tableta: { es: "tabletas", type: "tablets" },
  tabletas: { es: "tabletas", type: "tablets" },
  gomita: { es: "gomitas", type: "gummies" },
  gomitas: { es: "gomitas", type: "gummies" },
  gummy: { es: "gomitas", type: "gummies" },
  gummies: { es: "gomitas", type: "gummies" },
  sobre: { es: "sobres", type: "sachets" },
  sobres: { es: "sobres", type: "sachets" },
  sachet: { es: "sobres", type: "sachets" },
  sachets: { es: "sobres", type: "sachets" },
  gota: { es: "gotas", type: "drops" },
  gotas: { es: "gotas", type: "drops" },
  drops: { es: "gotas", type: "drops" },
  // Variantes comerciales que distintos labs usan para softgels/cápsulas.
  caps: { es: "cápsulas", type: "capsules" },
  twistcap: { es: "softgels", type: "softgels" },
  twistcaps: { es: "softgels", type: "softgels" },
};

/**
 * Busca una forma en la tabla. Intenta varias formas:
 *   1. Match literal del string completo ("cápsulas")
 *   2. Match concatenado sin espacios ("twist caps" → "twistcaps")
 *   3. Match SOLO de la última palabra (descarta tokens previos que no
 *      son forma — útil cuando el regex consumió 2 palabras y solo la
 *      última es realmente la forma física).
 * Devuelve null si ninguna intenta encaja.
 */
type FormLookup = { es: string; type: string; matchedWords: number };
function lookupForm(raw: string): FormLookup | null {
  const lower = raw.toLowerCase().trim();
  const direct = PRESENTATION_FORMS[lower];
  if (direct) return { ...direct, matchedWords: lower.split(/\s+/).length };

  const noSpace = lower.replace(/\s+/g, "");
  const joined = PRESENTATION_FORMS[noSpace];
  if (joined) return { ...joined, matchedWords: lower.split(/\s+/).length };

  // Fallback: prueba solo la última palabra (el regex consumió de más).
  const words = lower.split(/\s+/);
  if (words.length > 1) {
    const last = PRESENTATION_FORMS[words[words.length - 1]];
    if (last) return { ...last, matchedWords: 1 };
  }
  return null;
}

export type NormalizedName = {
  /** Nombre limpio en formato canónico. */
  cleanName: string;
  /** Texto de presentación en español ("60 ml", "60 cápsulas"), si se extrajo. */
  extractedPresentation: string | null;
  /** Slug de tipo (capsules, softgels, drops, ...), si se extrajo. */
  extractedPresentationType: string | null;
};

// --- helpers ----------------------------------------------------------------

function isAcronymToken(token: string): boolean {
  // Tokens que ya vienen en mayúsculas en el original, o están en la tabla.
  return ACRONYMS.has(token) || ACRONYMS.has(token.toUpperCase());
}

function capitalizeWord(word: string): string {
  if (!word) return word;
  // Preserva guiones internos: "anti-aging" -> "Anti-Aging"
  if (word.includes("-")) {
    return word
      .split("-")
      .map((p) => capitalizeWord(p))
      .join("-");
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function titleCaseToken(token: string, index: number, total: number): string {
  const lower = token.toLowerCase();

  // Acrónimo conocido → mayúsculas tal cual está en la tabla.
  for (const a of ACRONYMS) {
    if (a.toLowerCase() === lower) return a;
  }

  // Letra sola (C, D, E, K, B): suele ser nombre de vitamina o letra-marca.
  // SIEMPRE en mayúscula. Maneja también "gm" -> normalizado abajo.
  if (token.length === 1 && /^[a-záéíóúñü]$/i.test(token)) {
    return token.toUpperCase();
  }

  // Unidad de medida → minúscula. Excepción: L litros, en mayúscula.
  if (UNIT_TOKENS.has(lower)) {
    if (lower === "gm") return "g"; // normalizar gm -> g
    return lower === "iu" || lower === "ui" ? lower.toUpperCase() : lower;
  }
  if (token === "L") return "L";

  // Token numérico crudo → sin tocar (los números no se capitalizan).
  if (/^\d+([.,]\d+)?$/.test(token)) return token;

  // Preposiciones/artículos menores en minúscula, salvo si son la primera o
  // última palabra del nombre.
  if (
    SPANISH_LOWERCASE.has(lower) &&
    index !== 0 &&
    index !== total - 1
  ) {
    return lower;
  }

  return capitalizeWord(token);
}

/**
 * Separa números pegados a letras: "60ml" -> "60 ml", "240mL" -> "240 mL".
 */
function splitNumberUnit(s: string): string {
  return s.replace(/(\d+(?:[.,]\d+)?)\s*([a-zA-Zµ]+)/g, "$1 $2");
}

/**
 * Distingue qué hay al final del nombre y devuelve qué es presentación
 * (extraída del nombre) vs. qué se queda como parte del nombre (ej. dosis).
 *
 * Reglas:
 *   - Forma contable (cápsulas/softgels/tabletas/gomitas/sobres) con "x N":
 *     "N forma" es presentación con type. Cualquier "N mg" anterior es
 *     dosis del producto y se queda en el nombre.
 *   - Volumen al final (N ml, N g, N oz): tamaño del envase, presentación
 *     sin type (el caller puede sumar el type si la forma física es líquida).
 *   - Forma líquida sola al final ("gotas", "jarabe") sin número: se quita
 *     del nombre y se devuelve como type.
 */
function extractTrailingPresentation(
  raw: string,
): { presentation: string | null; type: string | null; remaining: string } | null {
  const text = splitNumberUnit(raw).trim();

  // Helper: si lookupForm consumió menos palabras que las capturadas, devuelve
  // las sobrantes al remaining para que sigan formando parte del nombre.
  // Ej: "Alcachofa Cápsulas x 80" — el regex captura "Alcachofa Cápsulas",
  // pero solo "Cápsulas" es forma; "Alcachofa" debe permanecer en el nombre.
  function buildRemaining(left: string, captured: string, matched: number): string {
    const words = captured.trim().split(/\s+/);
    if (matched >= words.length) return left.trim().replace(/[\s,]+$/, "");
    const extra = words.slice(0, words.length - matched).join(" ");
    const combined = (left.trim() + " " + extra).trim();
    return combined.replace(/[\s,]+$/, "");
  }

  // A. "... x 60 cápsulas" / "... x 60 Twist Caps" (1-2 palabras de forma).
  const a = text.match(
    /^(.*?)[\s,]*x\s*(\d+(?:[.,]\d+)?)\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ]+(?:\s+[a-zA-ZáéíóúñÁÉÍÓÚÑ]+)?)\s*$/i,
  );
  if (a) {
    const count = parseFloat(a[2].replace(",", "."));
    const form = lookupForm(a[3]);
    if (form) {
      return {
        presentation: `${count} ${form.es}`,
        type: form.type,
        remaining: buildRemaining(a[1], a[3], form.matchedWords),
      };
    }
  }

  // B. "... Cápsulas x 30" (forma intercambiada — algunos labs lo escriben así).
  const b = text.match(
    /^(.*?)[\s,]*([a-zA-ZáéíóúñÁÉÍÓÚÑ]+(?:\s+[a-zA-ZáéíóúñÁÉÍÓÚÑ]+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*$/i,
  );
  if (b) {
    const form = lookupForm(b[2]);
    const count = parseFloat(b[3].replace(",", "."));
    if (form) {
      return {
        presentation: `${count} ${form.es}`,
        type: form.type,
        remaining: buildRemaining(b[1], b[2], form.matchedWords),
      };
    }
  }

  // C. "... 30 cápsulas" / "... 60 softgels" sin x.
  const c = text.match(
    /^(.*?)[\s,]+(\d+(?:[.,]\d+)?)\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ]+(?:\s+[a-zA-ZáéíóúñÁÉÍÓÚÑ]+)?)\s*$/i,
  );
  if (c) {
    const form = lookupForm(c[3]);
    if (form) {
      const count = parseFloat(c[2].replace(",", "."));
      return {
        presentation: `${count} ${form.es}`,
        type: form.type,
        remaining: buildRemaining(c[1], c[3], form.matchedWords),
      };
    }
  }

  // D. Volumen al final: "... x 30 ml" / "... 240 ml" / "... 907 g" / "... 32 oz"
  // Solo se considera presentación si NO es la dosis del producto (mg/mcg).
  const d = text.match(
    /^(.*?)[\s,]*(?:x\s*)?(\d+(?:[.,]\d+)?)\s*(ml|l|g|gr|gm|kg|oz|lbs?)\s*$/i,
  );
  if (d) {
    const value = parseFloat(d[2].replace(",", "."));
    let unit = d[3].toLowerCase();
    if (unit === "gr" || unit === "gm") unit = "g";
    if (unit === "l") unit = "L";
    if (unit === "lb") unit = "lbs";
    return {
      presentation: `${value} ${unit}`,
      type: null,
      remaining: d[1].trim().replace(/[\s,]+$/, ""),
    };
  }

  // E. Forma líquida sola al final ("Echinacea gotas"): quitar y reportar type.
  const e = text.match(
    /^(.*?)[\s,]+([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)\s*$/i,
  );
  if (e) {
    const form = PRESENTATION_FORMS[e[2].toLowerCase()];
    if (form && e[1].trim().length >= 3) {
      return {
        presentation: null, // sin cantidad, solo type
        type: form.type,
        remaining: e[1].trim().replace(/[\s,]+$/, ""),
      };
    }
  }

  return null;
}

/**
 * Tokeniza un texto preservando símbolos relevantes (+, &, números pegados).
 */
function tokenize(text: string): string[] {
  // Inserta espacios alrededor de + y & para tratarlos como tokens propios.
  const spaced = text.replace(/([+&])/g, " $1 ").replace(/\s+/g, " ").trim();
  return spaced.split(" ").filter((t) => t.length > 0);
}

/**
 * Aplica title case a un nombre, respetando acrónimos, unidades y palabras
 * menores. No toca presentación; trabaja sobre el nombre limpio.
 */
function applyTitleCase(name: string): string {
  // Separa números pegados a letras antes de tokenizar para que "240mL" se
  // procese como "240 mL".
  const prepared = splitNumberUnit(name);
  const tokens = tokenize(prepared);
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === "+" || tok === "&") {
      out.push(tok);
      continue;
    }
    // Si viene ya en mayúsculas y es un acrónimo conocido, lo respetamos.
    if (tok.length >= 2 && tok === tok.toUpperCase() && isAcronymToken(tok)) {
      out.push(tok);
      continue;
    }
    out.push(titleCaseToken(tok, i, tokens.length));
  }
  return out.join(" ");
}

// --- API pública ------------------------------------------------------------

export function normalizeProductName(rawName: string): NormalizedName {
  const trimmed = (rawName ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return {
      cleanName: "",
      extractedPresentation: null,
      extractedPresentationType: null,
    };
  }

  // Hasta 2 pasadas para casos como "Echinacea gotas 60ml": primera pasada
  // extrae "60 ml" (volumen), segunda pasada extrae "gotas" (forma líquida).
  let working = trimmed;
  let extractedPresentation: string | null = null;
  let extractedType: string | null = null;

  for (let pass = 0; pass < 2; pass++) {
    const result = extractTrailingPresentation(working);
    if (!result) break;
    working = result.remaining;

    // La presentación con cantidad/unidad gana sobre una sin números.
    if (result.presentation) {
      if (!extractedPresentation) {
        extractedPresentation = result.presentation;
      } else if (
        /^\D+$/.test(extractedPresentation) &&
        /\d/.test(result.presentation)
      ) {
        extractedPresentation = result.presentation;
      }
    }
    if (!extractedType && result.type) extractedType = result.type;
  }

  // Limpia conectores colgados al final tras la extracción (ej. "Esencia
  // Floral Asthma x" tras quitar 30 ml). Solo "x" y "+": las letras e/o/y
  // pueden ser vitaminas (Vitamin E, Omega) y NO se deben confundir con
  // conjunciones.
  working = working
    .replace(/[\s,]+[x+]\s*$/i, "")
    .replace(/[\s,]+$/, "")
    .trim();

  const cleanName = applyTitleCase(working) || applyTitleCase(trimmed);

  return {
    cleanName,
    extractedPresentation,
    extractedPresentationType: extractedType,
  };
}
