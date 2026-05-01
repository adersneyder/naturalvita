import type { AiContentFields, PromptTemplateId, RegulatoryCheckResult } from "./types";

/**
 * Listas negras de términos prohibidos por categoría regulatoria.
 *
 * El matching es case-insensitive y por palabra/frase completa (con boundary).
 * Diseño conservador: ante la duda, marca como issue. El admin puede revisar
 * y aprobar manualmente si el contexto es legítimo.
 */
const FORBIDDEN_TERMS: Record<PromptTemplateId, string[]> = {
  // ===== Alimentos y Suplementos Dietarios =====
  alimento_suplemento: [
    // Verbos terapéuticos prohibidos
    "cura",
    "curativo",
    "curar",
    "trata el",
    "trata la",
    "tratamiento de",
    "previene",
    "prevención de",
    "prevenir",
    "alivia",
    "alivio de",
    "aliviar",
    "combate",
    "combatir",
    "elimina",
    "eliminar",
    "sana",
    "sanar",
    "sanación",
    "remedia",
    "remedio para",
    // Promesas exageradas
    "milagroso",
    "milagrosa",
    "milagro",
    "garantizado",
    "garantiza la",
    "100% efectivo",
    "100 % efectivo",
    "sin efectos secundarios",
    "totalmente seguro",
    // Sustitución médica
    "sustituye al médico",
    "reemplaza al médico",
    "reemplaza la consulta",
    "alternativa a medicamentos",
    "equivalente a medicamento",
    // Diagnósticos asociados
    "para la diabetes",
    "contra el cáncer",
    "para el cáncer",
    "contra la diabetes",
    "para la hipertensión",
    "para el alzheimer",
    "para la depresión",
  ],

  // ===== Fitoterapéuticos (más permisivo: pueden citar uso tradicional INVIMA) =====
  fitoterapeutico: [
    "cura definitivamente",
    "cura permanente",
    "garantizado",
    "100% efectivo",
    "100 % efectivo",
    "milagroso",
    "milagrosa",
    "sin efectos secundarios",
    "sustituye al médico",
    "reemplaza al médico",
    "reemplaza el tratamiento",
    "alternativa al medicamento",
  ],

  // ===== Dermocosmética (efecto cosmético superficial únicamente) =====
  dermocosmetico: [
    // Claims terapéuticos
    "cura el acné",
    "cura cualquier",
    "trata la dermatitis",
    "trata cualquier",
    "regenera la piel a nivel celular",
    "regenera células",
    "elimina arrugas permanentemente",
    "borra cicatrices",
    "previene el cáncer",
    // Términos prohibidos para cosméticos sin registro distinto
    "antibacteriano",
    "antibacterial",
    "antiviral",
    "medicinal",
    "terapéutico",
    "terapéutica",
    // Promesas
    "garantizado",
    "100% efectivo",
    "100 % efectivo",
    "resultados milagrosos",
    "milagroso",
    "milagrosa",
  ],

  // ===== Esencias Florales (conservador con bienestar emocional) =====
  esencia_floral: [
    "cura la ansiedad",
    "cura la depresión",
    "cura el insomnio",
    "trata trastornos",
    "reemplaza la psicoterapia",
    "alternativa a antidepresivos",
    "alternativa al antidepresivo",
    "elimina el estrés",
    "elimina la angustia",
    "garantiza el bienestar",
    "100% efectivo",
    "100 % efectivo",
    "depresión mayor",
    "trastorno de ansiedad generalizada",
    "tdah",
    "trastorno bipolar",
    "esquizofrenia",
    "cuántico",
    "cuántica",
    "vibracional sanador",
    "vibracional sanadora",
  ],

  // ===== Homeopáticos (más conservador, son medicamentos pero régimen aparte) =====
  homeopatico: [
    "cura definitivamente",
    "cura permanente",
    "garantizado",
    "100% efectivo",
    "100 % efectivo",
    "milagroso",
    "milagrosa",
    "reemplaza la consulta médica",
    "alternativa a antibiótico",
    "alternativa al antibiótico",
  ],
};

/**
 * Recorre los 5 campos del output de la IA buscando términos prohibidos.
 * Devuelve { passed, issues, details }.
 *
 * IMPORTANTE: el disclaimer obligatorio (texto fijo regulatorio) contiene por
 * diseño los verbos "prevenir, tratar, curar" porque la ley lo exige así. Para
 * evitar que el validador marque ese texto fijo como issue, se pasa la lista
 * `exemptSnippets`: cualquier coincidencia que ocurra DENTRO de uno de esos
 * snippets se ignora.
 */
export function validateRegulatoryCompliance(
  templateId: PromptTemplateId,
  output: AiContentFields,
  exemptSnippets: string[] = [],
): RegulatoryCheckResult {
  const forbidden = FORBIDDEN_TERMS[templateId] ?? [];
  const details: RegulatoryCheckResult["details"] = [];

  const fields: Array<keyof AiContentFields> = [
    "short_description",
    "full_description",
    "composition_use",
    "dosage",
    "warnings",
  ];

  // Normaliza los snippets exentos: lowercase y trim, para comparar contra texto lowercase
  const exemptLower = exemptSnippets
    .map((s) => s.toLowerCase().trim())
    .filter((s) => s.length > 0);

  for (const field of fields) {
    const text = (output[field] ?? "").toLowerCase();
    if (!text) continue;

    for (const term of forbidden) {
      const termLower = term.toLowerCase();
      const isPhrase = termLower.includes(" ");
      const found = isPhrase
        ? text.includes(termLower)
        : new RegExp(`\\b${escapeRegex(termLower)}\\b`, "i").test(text);

      if (!found) continue;

      // Verificar si el match cae dentro de algún bloque exento
      const idx = text.indexOf(termLower);
      const isExempt = exemptLower.some((exempt) => {
        const exemptIdx = text.indexOf(exempt);
        if (exemptIdx === -1) return false;
        return idx >= exemptIdx && idx < exemptIdx + exempt.length;
      });

      if (isExempt) continue;

      // Capturar contexto para el snippet del issue
      const snippet = output[field]
        .substring(Math.max(0, idx - 30), Math.min(output[field].length, idx + termLower.length + 30))
        .trim();
      details.push({ field, term, snippet });
    }
  }

  return {
    passed: details.length === 0,
    issues: Array.from(new Set(details.map((d) => d.term))),
    details,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validaciones estructurales del output.
 *
 * Distinguimos:
 * - **errors**: bloquean la aplicación al producto. Solo cuando el campo está vacío
 *   o groseramente fuera de rango (indicador de IA confundida).
 * - **warnings**: informativos. La ficha es aceptable pero podría afinarse.
 *
 * Rangos objetivo (priorizando experiencia de compra y conversión sobre densidad):
 *   short_description : 140-160 chars  (límite duro: 60 / 165)
 *   full_description  : 45-65 palabras (límite duro: 35 / 90, 1 párrafo, 3 frases máx)
 *   composition_use   : 15-40 palabras (límite duro: 8 / 80, solo lista de ingredientes)
 *   dosage            : 15-30 palabras (límite duro: 8 / 60)
 *   warnings          : 40-60 palabras (límite duro: 25 / 100, 2 bloques con bullets)
 */
export function validateStructure(output: AiContentFields): {
  ok: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // short_description: meta description de Google (sin cambio)
  const shortLen = (output.short_description ?? "").trim().length;
  if (shortLen === 0) {
    errors.push("short_description vacía");
  } else if (shortLen < 60) {
    errors.push(`short_description demasiado corta (${shortLen} chars)`);
  } else if (shortLen < 140) {
    warnings.push(`short_description corta (${shortLen} chars, ideal 140-160)`);
  } else if (shortLen > 165) {
    warnings.push(`short_description larga (${shortLen} chars, ideal 140-160)`);
  }

  // full_description: 3 frases máximo, párrafo único
  const fullWords = (output.full_description ?? "").split(/\s+/).filter(Boolean).length;
  if (fullWords === 0) {
    errors.push("full_description vacía");
  } else if (fullWords < 35) {
    errors.push(`full_description demasiado corta (${fullWords} palabras)`);
  } else if (fullWords > 90) {
    errors.push(`full_description demasiado larga (${fullWords} palabras)`);
  } else if (fullWords < 45 || fullWords > 65) {
    warnings.push(`full_description fuera de rango ideal (${fullWords} palabras, ideal 45-65)`);
  }

  // composition_use: solo lista de ingredientes (sin sub-sección "Uso recomendado")
  const compoWords = (output.composition_use ?? "").split(/\s+/).filter(Boolean).length;
  if (compoWords === 0) {
    errors.push("composition_use vacía");
  } else if (compoWords < 8) {
    errors.push(`composition_use demasiado corta (${compoWords} palabras)`);
  } else if (compoWords > 80) {
    errors.push(`composition_use demasiado larga (${compoWords} palabras, ¿incluye "Uso recomendado" por error?)`);
  } else if (compoWords < 15 || compoWords > 40) {
    warnings.push(`composition_use fuera de rango ideal (${compoWords} palabras, ideal 15-40)`);
  }
  // Detectar el header "Uso recomendado" que ya no debe aparecer
  if (/uso recomendado/i.test(output.composition_use ?? "")) {
    warnings.push('composition_use contiene "Uso recomendado" (ya no debe incluirse)');
  }

  // dosage: 2 líneas
  const dosageWords = (output.dosage ?? "").split(/\s+/).filter(Boolean).length;
  if (dosageWords === 0) {
    errors.push("dosage vacía");
  } else if (dosageWords < 8) {
    errors.push(`dosage demasiado corta (${dosageWords} palabras)`);
  } else if (dosageWords > 60) {
    errors.push(`dosage demasiado larga (${dosageWords} palabras)`);
  } else if (dosageWords < 15 || dosageWords > 30) {
    warnings.push(`dosage fuera de rango ideal (${dosageWords} palabras, ideal 15-30)`);
  }

  // warnings: 2 bloques con bullets
  const warnWords = (output.warnings ?? "").split(/\s+/).filter(Boolean).length;
  if (warnWords === 0) {
    errors.push("warnings vacía");
  } else if (warnWords < 25) {
    errors.push(`warnings demasiado corta (${warnWords} palabras, ¿incluye disclaimer?)`);
  } else if (warnWords > 100) {
    warnings.push(`warnings larga (${warnWords} palabras, ideal 40-60)`);
  } else if (warnWords < 40 || warnWords > 60) {
    warnings.push(`warnings fuera de rango ideal (${warnWords} palabras, ideal 40-60)`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
