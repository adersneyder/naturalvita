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
 * Validaciones estructurales del output que NO son regulatorias pero que también deben pasar.
 * Si alguna falla, marcamos como parse_error en el log.
 */
export function validateStructure(output: AiContentFields): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!output.short_description || output.short_description.trim().length < 100) {
    issues.push("short_description muy corta (<100 chars)");
  }
  if (output.short_description && output.short_description.length > 165) {
    issues.push(`short_description muy larga (${output.short_description.length} chars, máx 165)`);
  }

  const fullWords = (output.full_description ?? "").split(/\s+/).filter(Boolean).length;
  if (fullWords < 130 || fullWords > 220) {
    issues.push(`full_description fuera de rango (${fullWords} palabras, esperado 150-180)`);
  }

  if (!output.composition_use || output.composition_use.trim().length < 50) {
    issues.push("composition_use muy corta o vacía");
  }
  if (!output.dosage || output.dosage.trim().length < 20) {
    issues.push("dosage muy corta o vacía");
  }
  if (!output.warnings || output.warnings.trim().length < 100) {
    issues.push("warnings muy corta o vacía");
  }

  return { ok: issues.length === 0, issues };
}
