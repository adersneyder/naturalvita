import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PromptTemplateId, PromptVariables } from "./types";

const PROMPTS_DIR = join(process.cwd(), "lib", "ai-content", "prompts");

/**
 * Caché en memoria de las plantillas.
 * Las plantillas son archivos estáticos del repo, así que cargarlas una vez
 * por proceso es suficiente.
 */
const templateCache = new Map<string, string>();

function loadTemplate(filename: string): string {
  const cached = templateCache.get(filename);
  if (cached) return cached;
  const content = readFileSync(join(PROMPTS_DIR, filename), "utf-8");
  templateCache.set(filename, content);
  return content;
}

/**
 * Mapea PromptTemplateId al nombre del archivo .md que contiene sus reglas regulatorias.
 */
const TEMPLATE_FILES: Record<PromptTemplateId, string> = {
  alimento_suplemento: "alimento_suplemento.md",
  fitoterapeutico: "fitoterapeutico.md",
  dermocosmetico: "dermocosmetico.md",
  esencia_floral: "esencia_floral.md",
  homeopatico: "homeopatico.md",
};

/**
 * Extrae el bloque del disclaimer obligatorio de una plantilla regulatoria.
 *
 * Las plantillas tienen un encabezado "## Disclaimer obligatorio para `warnings`"
 * seguido de uno o más bloques `> texto`. Capturamos todo el contenido del blockquote
 * hasta que aparezca otra sección (## ...) o el final del archivo.
 */
function extractDisclaimer(regulatoryTemplate: string): string {
  const sectionMatch = regulatoryTemplate.match(
    /## Disclaimer obligatorio[^\n]*\n+([\s\S]+?)$/,
  );
  if (!sectionMatch) {
    throw new Error("Plantilla regulatoria sin sección 'Disclaimer obligatorio'");
  }
  // Tomar todas las líneas blockquote (que empiezan con >) y unirlas
  const lines = sectionMatch[1]
    .split("\n")
    .filter((line) => line.trim().startsWith(">"))
    .map((line) => line.trim().replace(/^>\s?/, ""));
  if (lines.length === 0) {
    throw new Error("Sección 'Disclaimer obligatorio' sin texto blockquote (>)");
  }
  return lines.join(" ").trim();
}

/**
 * Construye el prompt final combinando:
 * 1. La plantilla base (estructura, formato JSON, voz de marca, validaciones)
 * 2. La plantilla regulatoria de la categoría (vocabulario, disclaimer)
 * 3. Las variables del producto específico
 *
 * El resultado es un string listo para enviar como user message a Claude.
 */
export function buildPrompt(templateId: PromptTemplateId, variables: PromptVariables): string {
  const baseTemplate = loadTemplate("_base.md");
  const regulatoryTemplate = loadTemplate(TEMPLATE_FILES[templateId]);
  const disclaimer = extractDisclaimer(regulatoryTemplate);

  // Inyecta primero las plantillas anidadas, luego las variables del producto.
  // El orden importa: las {{variables}} dentro de la regulatoria también deben resolverse.
  let prompt = baseTemplate;
  prompt = prompt.replace("{{reglas_regulatorias}}", regulatoryTemplate);
  prompt = prompt.replace(/\{\{disclaimer_regulatorio\}\}/g, disclaimer);

  // Variables del producto
  for (const [key, value] of Object.entries(variables)) {
    const safeValue = (value ?? "").toString().trim() || "(no disponible)";
    prompt = prompt.replaceAll(`{{${key}}}`, safeValue);
  }

  return prompt;
}

/**
 * Devuelve el disclaimer obligatorio fijo para una categoría.
 * El endpoint lo pasa al validador como `exemptSnippets` para evitar falsos positivos
 * cuando el texto regulatorio dice "no tiene la finalidad de prevenir, tratar, curar...".
 */
export function getDisclaimerForTemplate(templateId: PromptTemplateId): string {
  const regulatoryTemplate = loadTemplate(TEMPLATE_FILES[templateId]);
  return extractDisclaimer(regulatoryTemplate);
}

/**
 * Limpia caché. Útil para tests o si se modifican las plantillas en runtime.
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}
