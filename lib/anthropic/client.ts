import Anthropic from "@anthropic-ai/sdk";

/**
 * Cliente Anthropic compartido. USO EXCLUSIVAMENTE SERVER-SIDE.
 *
 * Nunca exportar este cliente a código que corra en el navegador,
 * porque la API key da acceso total a la cuenta y se factura por uso.
 *
 * El modelo por defecto del proyecto es Claude Sonnet 4.5, suficiente para
 * generación estructurada de fichas con compliance regulatorio.
 */
export function createAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Falta ANTHROPIC_API_KEY en variables de entorno. Crea una en https://console.anthropic.com, agrégala en Vercel → Settings → Environment Variables (Production y Preview), y redeploya.",
    );
  }

  return new Anthropic({ apiKey });
}

/**
 * Modelo activo del proyecto. Centralizado aquí para cambiar en un solo lugar
 * si se decide migrar a Opus o a versiones futuras.
 */
export const ACTIVE_MODEL = "claude-sonnet-4-5";

/**
 * Costos del modelo activo en USD por millón de tokens.
 * Útil para estimar el costo de cada generación y guardarlo en el log.
 *
 * Verificar contra https://docs.claude.com/en/docs/about-claude/pricing
 * cuando cambien los precios.
 */
export const MODEL_PRICING_USD_PER_MTOK = {
  input: 3.0,
  output: 15.0,
};

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * MODEL_PRICING_USD_PER_MTOK.input +
    (outputTokens / 1_000_000) * MODEL_PRICING_USD_PER_MTOK.output
  );
}
