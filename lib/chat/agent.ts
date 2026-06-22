import "server-only";
import { createAnthropicClient } from "@/lib/anthropic/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { SYSTEM_PROMPT } from "./system-prompt";
import { TOOL_DEFINITIONS, executeTool } from "./tools";

/**
 * Loop del agente conversacional con tool use de Claude.
 *
 * Modelo: Sonnet 4.6 (decisión del usuario). Más capaz que Haiku para
 * el catálogo, menos costoso que Opus.
 *
 * Streaming: SSE chunks al cliente con event types:
 *   - "text"        delta de texto del assistant
 *   - "tool_use"    info de qué tool se invocó
 *   - "done"        fin de la respuesta (incluye usage final)
 *   - "error"       error fatal
 *
 * Tool use loop: si Claude pide tools en su respuesta, las ejecutamos
 * y volvemos a llamar el modelo con los resultados. Máximo 5 iteraciones
 * para evitar bucles infinitos.
 */

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOOL_ITERATIONS = 5;
const MAX_TOKENS_OUTPUT = 1024;

// Pricing del modelo (Sonnet 4.5 / 4.6) — USD por millón de tokens.
const PRICE_INPUT_PER_M = 3;
const PRICE_OUTPUT_PER_M = 15;

export type AgentTurnInput = {
  conversationId: string;
  /** Mensaje del usuario que acaba de llegar. Ya guardado en BD. */
  userMessage: string;
};

export type AgentStreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_use"; name: string }
  | { type: "done"; tokens_input: number; tokens_output: number; cost_usd: number }
  | { type: "error"; message: string };

/**
 * Ejecuta un turno del agente. Devuelve un async iterator de eventos.
 * El consumidor (route SSE) los serializa como `data: <json>\n\n`.
 */
export async function* runAgentTurn(
  input: AgentTurnInput,
): AsyncGenerator<AgentStreamEvent, void, unknown> {
  const client = createAnthropicClient();
  const admin = createAdminClient();

  // 1. Cargar historial de la conversación (últimos N mensajes).
  // Excluimos mensajes 'tool' del payload al modelo — esos los maneja
  // el loop dentro de este turno.
  const { data: history } = await admin
    .from("chat_messages")
    .select("role, content, tool_calls, tool_results")
    .eq("conversation_id", input.conversationId)
    .order("created_at", { ascending: true })
    .limit(40);

  // 2. Convertir historial a formato de Anthropic.
  // Roles válidos para messages: user, assistant (human y system se
  // representan como user con prefijo, tool va en content blocks).
  const messages: Array<{
    role: "user" | "assistant";
    content:
      | string
      | Array<
          | { type: "text"; text: string }
          | {
              type: "tool_use";
              id: string;
              name: string;
              input: Record<string, unknown>;
            }
          | { type: "tool_result"; tool_use_id: string; content: string }
        >;
  }> = [];

  for (const m of history ?? []) {
    if (m.role === "user") {
      messages.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      // Si tuvo tool_calls, las re-incluimos para que el modelo recuerde
      // el contexto del tool turn anterior.
      const calls = m.tool_calls as
        | Array<{ id: string; name: string; input: Record<string, unknown> }>
        | null;
      if (calls && calls.length > 0) {
        const blocks: Array<
          | { type: "text"; text: string }
          | {
              type: "tool_use";
              id: string;
              name: string;
              input: Record<string, unknown>;
            }
        > = [];
        if (m.content) blocks.push({ type: "text", text: m.content });
        for (const c of calls) {
          blocks.push({ type: "tool_use", id: c.id, name: c.name, input: c.input });
        }
        messages.push({ role: "assistant", content: blocks });
      } else {
        messages.push({ role: "assistant", content: m.content });
      }
    } else if (m.role === "tool") {
      // Resultados de tool — se ponen en el siguiente user message.
      const results = m.tool_results as
        | Array<{ tool_use_id: string; content: string }>
        | null;
      if (results && results.length > 0) {
        messages.push({
          role: "user",
          content: results.map((r) => ({
            type: "tool_result" as const,
            tool_use_id: r.tool_use_id,
            content: r.content,
          })),
        });
      }
    } else if (m.role === "human") {
      // Mensaje del equipo humano: se inyecta como assistant para el
      // modelo (porque el cliente lo ve como respuesta del lado del
      // negocio). En el contexto del agente decimos quién es.
      messages.push({
        role: "assistant",
        content: `[Miembro del equipo respondió]: ${m.content}`,
      });
    }
    // role 'system' se ignora aquí — el system prompt va aparte.
  }

  // 3. Tool use loop.
  let totalInput = 0;
  let totalOutput = 0;
  let lastAssistantText = "";
  let lastToolCalls:
    | Array<{ id: string; name: string; input: Record<string, unknown> }>
    | null = null;

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    let textBuf = "";
    let stopReason: string | null = null;
    const toolUseBlocks: Array<{
      id: string;
      name: string;
      input: string; // se construye streaming, parseamos al final
    }> = [];
    let currentToolIdx = -1;

    try {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS_OUTPUT,
        system: SYSTEM_PROMPT,
        tools: TOOL_DEFINITIONS,
        messages,
      });

      for await (const event of stream) {
        if (event.type === "content_block_start") {
          if (event.content_block.type === "tool_use") {
            currentToolIdx = toolUseBlocks.length;
            toolUseBlocks.push({
              id: event.content_block.id,
              name: event.content_block.name,
              input: "",
            });
            yield { type: "tool_use", name: event.content_block.name };
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            textBuf += event.delta.text;
            yield { type: "text", delta: event.delta.text };
          } else if (
            event.delta.type === "input_json_delta" &&
            currentToolIdx >= 0
          ) {
            toolUseBlocks[currentToolIdx].input += event.delta.partial_json;
          }
        } else if (event.type === "content_block_stop") {
          currentToolIdx = -1;
        } else if (event.type === "message_delta") {
          if (event.delta.stop_reason) stopReason = event.delta.stop_reason;
          if (event.usage) {
            totalInput += event.usage.input_tokens ?? 0;
            totalOutput += event.usage.output_tokens ?? 0;
          }
        }
      }
      const final = await stream.finalMessage();
      // Override con el usage final que es más exacto.
      totalInput = final.usage.input_tokens ?? totalInput;
      totalOutput = final.usage.output_tokens ?? totalOutput;
      stopReason = final.stop_reason ?? stopReason;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      yield { type: "error", message: msg };
      return;
    }

    lastAssistantText = textBuf;

    // Si no hay tools, terminó.
    if (toolUseBlocks.length === 0 || stopReason !== "tool_use") {
      lastToolCalls = null;
      break;
    }

    // Parsear inputs de tools y ejecutar.
    const parsedCalls = toolUseBlocks.map((b) => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(b.input || "{}");
      } catch {
        parsed = {};
      }
      return { id: b.id, name: b.name, input: parsed };
    });
    lastToolCalls = parsedCalls;

    const toolResults: Array<{ tool_use_id: string; content: string }> = [];
    for (const call of parsedCalls) {
      const result = await executeTool(call.name, call.input);
      toolResults.push({ tool_use_id: call.id, content: result });
    }

    // Añadir el turno assistant (con tool_use) y user (con tool_result)
    // al array messages para la siguiente iteración.
    const assistantBlocks: Array<
      | { type: "text"; text: string }
      | {
          type: "tool_use";
          id: string;
          name: string;
          input: Record<string, unknown>;
        }
    > = [];
    if (textBuf) assistantBlocks.push({ type: "text", text: textBuf });
    for (const c of parsedCalls) {
      assistantBlocks.push({
        type: "tool_use",
        id: c.id,
        name: c.name,
        input: c.input,
      });
    }
    messages.push({ role: "assistant", content: assistantBlocks });

    // Guardamos el tool turn en BD para historial futuro.
    await admin.from("chat_messages").insert({
      conversation_id: input.conversationId,
      role: "assistant",
      content: textBuf,
      tool_calls: parsedCalls as never,
      tokens_input: totalInput,
      tokens_output: totalOutput,
      cost_usd: computeCost(totalInput, totalOutput),
    });
    await admin.from("chat_messages").insert({
      conversation_id: input.conversationId,
      role: "tool",
      content: "",
      tool_results: toolResults as never,
    });

    messages.push({
      role: "user",
      content: toolResults.map((r) => ({
        type: "tool_result" as const,
        tool_use_id: r.tool_use_id,
        content: r.content,
      })),
    });

    // Reset acumuladores para la siguiente iteración (cada llamada al
    // modelo es una nueva facturación).
    totalInput = 0;
    totalOutput = 0;
  }

  // Guardar el mensaje final del assistant si no fue tool-only.
  if (lastAssistantText && !lastToolCalls) {
    const cost = computeCost(totalInput, totalOutput);
    await admin.from("chat_messages").insert({
      conversation_id: input.conversationId,
      role: "assistant",
      content: lastAssistantText,
      tokens_input: totalInput,
      tokens_output: totalOutput,
      cost_usd: cost,
    });
    yield {
      type: "done",
      tokens_input: totalInput,
      tokens_output: totalOutput,
      cost_usd: cost,
    };
  } else {
    yield {
      type: "done",
      tokens_input: totalInput,
      tokens_output: totalOutput,
      cost_usd: computeCost(totalInput, totalOutput),
    };
  }
}

function computeCost(input: number, output: number): number {
  const cost =
    (input * PRICE_INPUT_PER_M) / 1_000_000 +
    (output * PRICE_OUTPUT_PER_M) / 1_000_000;
  return Number(cost.toFixed(6));
}
