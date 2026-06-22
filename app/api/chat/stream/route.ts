import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, publicApiRatelimit } from "@/lib/ratelimit";
import { runAgentTurn } from "@/lib/chat/agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// El loop con tools puede durar hasta 30-60s en casos complejos.
export const maxDuration = 90;

/**
 * Streaming SSE del agente conversacional.
 *
 * Request:
 *   POST { conversation_id?: uuid, visitor_id: string, message: string,
 *          initial_page_path?: string }
 *
 * Response: SSE con event types:
 *   - { conversation_id }   primera línea, para que el cliente sepa el id
 *   - { type: "text", delta: string }
 *   - { type: "tool_use", name: string }
 *   - { type: "done", tokens_input, tokens_output, cost_usd }
 *   - { type: "error", message }
 *
 * Privacidad:
 *   - El cliente NO inserta directo en chat_messages — todo pasa por
 *     este endpoint (service_role server-side).
 *   - Si el usuario está autenticado, conversation.customer_id se setea.
 *
 * Rate limit: 30 mensajes/min/visitor.
 */

const Schema = z.object({
  conversation_id: z.string().uuid().nullable().optional(),
  visitor_id: z.string().min(8).max(64),
  message: z.string().min(1).max(4000),
  initial_page_path: z.string().max(2048).nullable().optional(),
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const parsed = Schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { conversation_id, visitor_id, message, initial_page_path } =
    parsed.data;

  // Rate limit por visitor (anti-abuso + control de costo).
  try {
    const rlKey = `chat:${visitor_id}`;
    const { success } = await publicApiRatelimit.limit(rlKey);
    if (!success) {
      return NextResponse.json(
        { error: "Demasiados mensajes. Espera unos segundos." },
        { status: 429 },
      );
    }
  } catch (rlErr) {
    console.warn("[chat/stream] ratelimit no disponible", rlErr);
  }
  // Adicional por IP.
  try {
    const ip = getClientIp(req);
    await publicApiRatelimit.limit(`chat-ip:${ip}`);
  } catch {
    /* tolerante */
  }

  const admin = createAdminClient();

  // Resolver/crear conversación. Si viene id, validamos que pertenezca
  // al visitor; si no, creamos una nueva.
  let convId = conversation_id;
  if (convId) {
    const { data: existing } = await admin
      .from("chat_conversations")
      .select("id, visitor_id, status")
      .eq("id", convId)
      .maybeSingle();
    if (!existing || existing.visitor_id !== visitor_id) {
      return NextResponse.json(
        { error: "Conversación no encontrada" },
        { status: 404 },
      );
    }
  } else {
    // customer_id si hay sesión autenticada. IMPORTANTE: la FK de
    // chat_conversations.customer_id apunta a public.customers, no a
    // auth.users. Un usuario logueado que NO tiene fila en customers
    // (ej. un admin, o un cliente recién creado antes del onboarding)
    // haría fallar el insert por violación de FK. Por eso solo vinculamos
    // customer_id cuando confirmamos que existe la fila; si no, la
    // conversación queda como visitante anónimo (identificado por
    // visitor_id), que es válido.
    let customerId: string | null = null;
    try {
      const sb = await createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (user) {
        const { data: cust } = await admin
          .from("customers")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        customerId = cust?.id ?? null;
      }
    } catch {
      /* anónimo está OK */
    }
    const { data: created, error: createErr } = await admin
      .from("chat_conversations")
      .insert({
        visitor_id,
        customer_id: customerId,
        status: "active",
        initial_page_path: initial_page_path ?? null,
      })
      .select("id")
      .single();
    if (createErr || !created) {
      console.error("[chat/stream] insert conversation failed", {
        message: createErr?.message,
        code: createErr?.code,
        details: createErr?.details,
        hint: createErr?.hint,
      });
      return NextResponse.json(
        { error: "No pudimos iniciar la conversación" },
        { status: 500 },
      );
    }
    convId = created.id;
  }

  // Guardar el mensaje del usuario antes de invocar al agente.
  await admin.from("chat_messages").insert({
    conversation_id: convId,
    role: "user",
    content: message,
  });

  // Si la conversación estaba escalated/assigned, NO invocamos agente —
  // un humano está al mando. El cliente recibe sus respuestas vía
  // Realtime (sin pasar por este endpoint). Devolvemos noop OK.
  const { data: convNow } = await admin
    .from("chat_conversations")
    .select("status")
    .eq("id", convId)
    .maybeSingle();
  if (
    convNow &&
    (convNow.status === "escalated" || convNow.status === "assigned")
  ) {
    const noopStream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(
          enc.encode(
            `data: ${JSON.stringify({ conversation_id: convId })}\n\n`,
          ),
        );
        controller.enqueue(
          enc.encode(
            `data: ${JSON.stringify({ type: "done", tokens_input: 0, tokens_output: 0, cost_usd: 0 })}\n\n`,
          ),
        );
        controller.close();
      },
    });
    return new Response(noopStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Streaming SSE del agente.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Header: conversation_id (el cliente lo necesita para Realtime).
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ conversation_id: convId })}\n\n`,
        ),
      );
      try {
        for await (const event of runAgentTurn({
          conversationId: convId!,
          userMessage: message,
        })) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error inesperado";
        console.error("[chat/stream] agent loop error", msg);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: msg })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
