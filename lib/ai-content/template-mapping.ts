import type { PromptTemplateId } from "./types";

/**
 * Mapea el slug de la categoría del producto a la plantilla de prompt regulatoria correspondiente.
 *
 * "Proteínas" y "Vitaminas y minerales" se tratan como Alimentos y Suplementos a efectos
 * regulatorios porque comparten el mismo régimen INVIMA (SD/RSA/RSAD/NSA/PSA).
 *
 * "Otros" usa el régimen más estricto (alimento_suplemento) por defecto seguro.
 */
const CATEGORY_TO_TEMPLATE: Record<string, PromptTemplateId> = {
  "alimentos-y-suplementos": "alimento_suplemento",
  proteinas: "alimento_suplemento",
  "vitaminas-y-minerales": "alimento_suplemento",
  fitoterapeuticos: "fitoterapeutico",
  dermocosmetica: "dermocosmetico",
  "esencias-florales": "esencia_floral",
  homeopatia: "homeopatico",
  otros: "alimento_suplemento",
};

export function getTemplateIdForCategory(categorySlug: string | null | undefined): PromptTemplateId {
  if (!categorySlug) return "alimento_suplemento"; // default conservador
  return CATEGORY_TO_TEMPLATE[categorySlug] ?? "alimento_suplemento";
}
