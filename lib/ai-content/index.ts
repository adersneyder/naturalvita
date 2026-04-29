export type {
  AiContentFields,
  PromptVariables,
  PromptTemplateId,
  RegulatoryCheckResult,
  GenerationStatus,
  GenerationResult,
  ProductAiMetadata,
} from "./types";

export { getTemplateIdForCategory } from "./template-mapping";
export { buildPrompt, clearTemplateCache, getDisclaimerForTemplate } from "./prompt-builder";
export { validateRegulatoryCompliance, validateStructure } from "./regulatory-validator";
