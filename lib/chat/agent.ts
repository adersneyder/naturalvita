import "server-only";
import { createAnthropicClient } from "@/lib/anthropic/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { SYSTEM_PROMPT } from "./system-prompt";
import { TOOL_DEFINITIONS, executeTool } from "./tools";
import type { ProductCardData } from "./shared-types";

/**
 * Extrae datos de tarjeta de producto del resultado de una tool de
 * producto (search_products o get_product). Devuelve [] si la tool no
 * es de producto o el resultado no tiene productos. El widget acumula
 * estos productos y los renderiza como tarjetas cuando el texto del
 * agente incluye el marcador [[product:slug]].
 */
function extractProductCards(
  toolName: string,
  resultJson: string,
): ProductCardData[] {
  if (toolName !== "search_products" && toolName !== "get_product") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(resultJson);
  } catch {
    return [];
  }
  const toCard = (o: Record<string, unknown>): ProductCardData | null => {
    if (typeof o.slug !== "string" || typeof o.name !== "string") return null;
    if (typeof o.price_cop !== "number") return null;
    return {
      slug: o.slug,
      name: o.name,
      presentation: typeof o.presentation === "string" ? o.presentation : null,
      price_cop: o.price_cop,
      image_url: typeof o.image_url === "string" ? o.image_url : null,
    };
  };
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.results)) {
      return obj.results
        .map((r) => toCard(r as Record<string, unknown>))
        .filter((c): c is ProductCardData => c !== null);
    }
    // get_product devuelve un objeto plano de producto.
    const single = toCard(obj);
    return single ? [single] : [];
  }
  return [];
}

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

// Sonnet 4.6 — decisión del usuario. Balance costo/calidad para el
// catálogo. Centralizado aquí para cambiar en un solo lugar.
const MODEL = "claude-sonnet-4-6";
const MAX_TOOL_ITERATIONS = 5;
const MAX_TOKENS_OUTPUT = 1024;

// Pricing de Sonnet 4.6 — USD por millón de tokens.
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
  | { type: "products"; items: ProductCardData[] }
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

  // 1. Cargar los ÚLTIMOS N mensajes de la conversación. order desc +
  // limit toma los más recientes; luego revertimos a orden cronológico.
  const { data: historyDesc } = await admin
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("conversation_id", input.conversationId)
    .order("created_at", { ascending: false })
    .limit(30);
  const history = (historyDesc ?? []).slice().reverse();

  // 2. Convertir historial a formato de Anthropic — SOLO TEXTO.
  //
  // IMPORTANTE: NO re-enviamos al modelo los tool_use/tool_result de
  // turnos pasados. La API de Anthropic exige que cada tool_use tenga su
  // tool_result inmediatamente después; al recargar historial largo es
  // fácil que ese emparejamiento se rompa (corte de ventana, orden de
  // timestamps iguales), causando 400 "tool_use without tool_result".
  // El historial conversacional que el modelo necesita es el intercambio
  // de TEXTO; los tool calls solo viven dentro del turno actual (loop más
  // abajo), donde están correctamente emparejados en memoria.
  //
  // Además colapsamos mensajes consecutivos del mismo rol (p.ej. dos
  // 'assistant' seguidos cuando un turno tuvo tool turn + respuesta) y
  // descartamos mensajes de texto vacío (los assistant que solo eran
  // tool_use). La API requiere alternancia user/assistant.
  type AnthropicMessage = {
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
  };
  const messages: AnthropicMessage[] = [];

  function pushMsg(role: "user" | "assistant", text: string) {
    const content = text.trim();
    if (!content) return;
    const last = messages[messages.length - 1];
    if (last && last.role === role && typeof last.content === "string") {
      // Mismo rol consecutivo: concatenamos para mantener alternancia.
      last.content = `${last.content}\n\n${content}`;
    } else {
      messages.push({ role, content });
    }
  }

  for (const m of history) {
    if (m.role === "user") {
      pushMsg("user", m.content);
    } else if (m.role === "assistant") {
      pushMsg("assistant", m.content);
    } else if (m.role === "human") {
      // Mensaje del equipo humano: para el modelo es "lado del negocio".
      pushMsg("assistant", `[Miembro del equipo respondió]: ${m.content}`);
    }
    // role 'tool' y 'system' se ignoran en el payload al modelo.
  }

  // La API exige que el primer mensaje sea 'user'. Si el historial empieza
  // con assistant (raro, por ventana cortada), lo quitamos.
  while (messages.length > 0 && messages[0].role !== "user") {
    messages.shift();
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
      const result = await executeTool(call.name, call.input, {
        conversationId: input.conversationId,
      });
      toolResults.push({ tool_use_id: call.id, content: result });

      // Si la tool devolvió productos, los emitimos al cliente para que
      // los renderice como tarjetas. Llega ANTES del texto del agente,
      // así el widget ya tiene los datos cuando aparece [[product:slug]].
      const cards = extractProductCards(call.name, result);
      if (cards.length > 0) {
        yield { type: "products", items: cards };
      }
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
