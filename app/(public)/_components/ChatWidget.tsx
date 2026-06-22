"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { usePathname } from "next/navigation";

/**
 * Widget del Asistente NV. Burbuja flotante inferior izquierda + panel
 * lateral derecho en desktop / slide-up en móvil.
 *
 * Stack:
 *   - Mensajes del usuario → POST /api/chat/stream (SSE)
 *   - Respuestas del modelo → leídas del stream + persistidas server-side
 *   - Mensajes humanos (cuando se escala) → Supabase Realtime subscribed
 *     al canal de chat_messages filtrando por conversation_id
 *
 * Identidad: usa el visitor_id del tracker Sembrado (localStorage). Si
 * el usuario está logueado, el server resuelve customer_id en /api/chat
 * y vincula la conversación.
 */

type Message = {
  id: string;
  role: "user" | "assistant" | "human";
  content: string;
  authored_by_name?: string | null;
  created_at: string;
};

const VISITOR_KEY = "nv:visitor:v1";
const CONV_KEY = "nv:chat:conv:v1";

function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8) return existing;
  } catch {
    /* incógnito */
  }
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  const id = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    localStorage.setItem(VISITOR_KEY, id);
  } catch {
    /* same */
  }
  return id;
}

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const visitorIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(
    null,
  );

  // Init visitor_id + conversation_id desde storage.
  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId();
    try {
      const stored = sessionStorage.getItem(CONV_KEY);
      if (stored) setConversationId(stored);
    } catch {
      /* same */
    }
  }, []);

  // Cargar historial al abrir.
  const loadHistory = useCallback(async () => {
    if (!conversationId) return;
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
    }
    const { data } = await supabaseRef.current
      .from("chat_messages")
      .select("id, role, content, created_at, authored_by_user_id")
      .eq("conversation_id", conversationId)
      .in("role", ["user", "assistant", "human"])
      .order("created_at", { ascending: true });

    setMessages(
      (data ?? []).map((m) => ({
        id: m.id as string,
        role: m.role as Message["role"],
        content: m.content as string,
        created_at: m.created_at as string,
      })),
    );
  }, [conversationId]);

  // Suscripción Realtime: nuevos mensajes humanos / del agente.
  useEffect(() => {
    if (!conversationId) return;
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
    }
    const sb = supabaseRef.current;
    const channel = sb
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as {
            id: string;
            role: string;
            content: string;
            created_at: string;
          };
          // Solo agregamos los que llegan por humanos — los user/assistant
          // ya vienen del propio stream y queremos evitar duplicados.
          if (m.role === "human") {
            setMessages((prev) => {
              if (prev.some((x) => x.id === m.id)) return prev;
              return [
                ...prev,
                {
                  id: m.id,
                  role: "human",
                  content: m.content,
                  created_at: m.created_at,
                },
              ];
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const c = payload.new as { status: string };
          setEscalated(c.status === "escalated" || c.status === "assigned");
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [conversationId]);

  // Cargar historial al abrir o al cambiar conversación.
  useEffect(() => {
    if (open) loadHistory();
  }, [open, loadHistory]);

  // Auto-scroll al fondo.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setStreamingText("");

    // Pintar mensaje del usuario optimista.
    const userMsg: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          visitor_id: visitorIdRef.current,
          message: text,
          initial_page_path: pathname,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content:
              "Tuve un problema técnico. Por favor intenta de nuevo en un momento.",
            created_at: new Date().toISOString(),
          },
        ]);
        setSending(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE: cada línea "data: <json>\n\n"
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const m = line.match(/^data: (.+)$/);
          if (!m) continue;
          try {
            const evt = JSON.parse(m[1]) as
              | { conversation_id: string }
              | { type: "text"; delta: string }
              | { type: "tool_use"; name: string }
              | { type: "done" }
              | { type: "error"; message: string };

            if ("conversation_id" in evt && !conversationId) {
              setConversationId(evt.conversation_id);
              try {
                sessionStorage.setItem(CONV_KEY, evt.conversation_id);
              } catch {
                /* same */
              }
            } else if ("type" in evt && evt.type === "text") {
              assistantText += evt.delta;
              setStreamingText(assistantText);
            } else if ("type" in evt && evt.type === "error") {
              assistantText = `Lo siento, hubo un problema: ${evt.message}`;
              setStreamingText(assistantText);
            } else if ("type" in evt && evt.type === "done") {
              if (assistantText) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `assist-${Date.now()}`,
                    role: "assistant",
                    content: assistantText,
                    created_at: new Date().toISOString(),
                  },
                ]);
              }
              setStreamingText("");
            }
          } catch {
            /* skip línea inválida */
          }
        }
      }
    } catch (err) {
      console.error("[chat] stream error", err);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Burbuja flotante */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar chat con Asistente NV" : "Abrir chat con Asistente NV"}
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-[var(--color-leaf-700)] text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:bg-[var(--color-leaf-900)] hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-leaf-700)] focus-visible:ring-offset-2"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M6 18L18 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed z-40 inset-x-0 bottom-0 md:inset-x-auto md:right-6 md:bottom-24 md:w-[380px] h-[80vh] md:h-[600px] md:rounded-2xl bg-white shadow-2xl border border-[var(--color-earth-100)] flex flex-col overflow-hidden">
          <header className="px-4 py-3 bg-[var(--color-leaf-700)] text-white flex items-center justify-between">
            <div>
              <p className="text-sm font-medium m-0">Asistente NV</p>
              <p className="text-[10px] opacity-80 m-0">
                {escalated
                  ? "Estás conectado con el equipo"
                  : "Asistente automatizado · 24/7"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="md:hidden text-white/80 hover:text-white"
              aria-label="Cerrar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M6 18L18 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-[var(--color-earth-50)]/40"
          >
            {messages.length === 0 && !streamingText && (
              <div className="text-center py-8">
                <p className="text-sm text-[var(--color-leaf-900)] font-medium m-0">
                  Hola 👋 Soy el Asistente NV
                </p>
                <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
                  Te ayudo con productos, envíos, pedidos y dudas. Disponible
                  24/7.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {streamingText && (
              <MessageBubble
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingText,
                  created_at: new Date().toISOString(),
                }}
              />
            )}
            {sending && !streamingText && (
              <div className="flex items-center gap-1.5 px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-earth-500)] animate-bounce" />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--color-earth-500)] animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--color-earth-500)] animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-earth-100)] p-3 bg-white">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                  escalated
                    ? "Escribe al equipo…"
                    : "Pregunta lo que necesites…"
                }
                rows={1}
                disabled={sending}
                className="flex-1 resize-none px-3 py-2 rounded-lg border border-[var(--color-earth-100)] text-sm focus:outline-none focus:border-[var(--color-iris-700)] disabled:opacity-50 max-h-24"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !input.trim()}
                aria-label="Enviar"
                className="w-9 h-9 rounded-lg bg-[var(--color-leaf-700)] text-white flex items-center justify-center hover:bg-[var(--color-leaf-900)] disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <p className="text-[9px] text-[var(--color-earth-500)] mt-1.5 m-0 text-center leading-tight">
              Información orientativa. Para temas de salud consulta a tu
              profesional.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isHuman = message.role === "human";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
          isUser
            ? "bg-[var(--color-leaf-700)] text-white rounded-br-sm"
            : isHuman
              ? "bg-[var(--color-iris-100)] text-[var(--color-leaf-900)] rounded-bl-sm border border-[var(--color-iris-700)]/30"
              : "bg-white text-[var(--color-leaf-900)] rounded-bl-sm border border-[var(--color-earth-100)]"
        }`}
      >
        {isHuman && (
          <p className="text-[9px] uppercase tracking-wider text-[var(--color-iris-700)] m-0 mb-0.5 font-medium">
            Equipo NaturalVita
          </p>
        )}
        {message.content}
      </div>
    </div>
  );
}
