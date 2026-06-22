"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { resolveConversation, respondInConversation } from "../actions";

type Msg = {
  id: string;
  role: "user" | "assistant" | "human" | "tool" | "system";
  content: string;
  created_at: string;
  author_name: string | null;
};

export default function ConversationDetail({
  conversationId,
  status: initialStatus,
  currentUserId,
  assignedTo,
  initialMessages,
}: {
  conversationId: string;
  status: string;
  currentUserId: string;
  assignedTo: string | null;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Suscripción Realtime a mensajes nuevos.
  useEffect(() => {
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const channel = sb
      .channel(`admin-chat:${conversationId}`)
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
            authored_by_user_id: string | null;
          };
          // Ignoramos role 'tool' en la UI del inbox (ruido técnico).
          if (m.role === "tool") return;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [
              ...prev,
              {
                id: m.id,
                role: m.role as Msg["role"],
                content: m.content,
                created_at: m.created_at,
                author_name: null,
              },
            ];
          });
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
          setStatus(c.status);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await respondInConversation({
        conversation_id: conversationId,
        message: text,
      });
      if (res.ok) {
        setInput("");
      } else {
        setError(res.error);
      }
    });
  }

  function resolve() {
    if (!confirm("¿Cerrar esta conversación?")) return;
    setError(null);
    startTransition(async () => {
      const res = await resolveConversation(conversationId);
      if (!res.ok) setError(res.error);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  }

  const isAssignedToMe = assignedTo === currentUserId;
  const canRespond =
    status !== "resolved" && status !== "abandoned";

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-4">
      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] flex flex-col h-[70vh]">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        >
          {messages
            .filter((m) => m.role !== "tool" && m.role !== "system")
            .map((m) => (
              <MsgBubble key={m.id} msg={m} />
            ))}
        </div>

        {canRespond && (
          <div className="border-t border-[var(--color-earth-100)] p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Responde al cliente… (Ctrl+Enter para enviar)"
              rows={3}
              disabled={pending}
              className="w-full resize-none px-3 py-2 rounded-lg border border-[var(--color-earth-100)] text-sm focus:outline-none focus:border-[var(--color-iris-700)] disabled:opacity-50"
            />
            {error && (
              <p className="text-[#B23A1F] text-xs m-0 mt-1">{error}</p>
            )}
            <div className="flex justify-between items-center mt-2">
              <p className="text-[10px] text-[var(--color-earth-500)] m-0">
                El cliente recibe tu mensaje al instante.{" "}
                {!isAssignedToMe && status !== "resolved" && (
                  <span className="text-[var(--color-iris-700)]">
                    Al responder tomas esta conversación.
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={send}
                disabled={pending || !input.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
              >
                {pending ? "Enviando…" : "Responder"}
              </button>
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-3">
        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-earth-500)] m-0">
            Estado
          </p>
          <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0 mt-1">
            {status}
          </p>
          {assignedTo && (
            <p className="text-[10px] text-[var(--color-earth-500)] mt-1 m-0">
              {isAssignedToMe ? "Asignada a ti" : "Asignada a otro miembro"}
            </p>
          )}
        </div>
        {canRespond && (
          <button
            type="button"
            onClick={resolve}
            disabled={pending}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium border border-[var(--color-earth-300)] text-[var(--color-earth-900)] hover:bg-[var(--color-earth-50)] disabled:opacity-50"
          >
            Marcar como resuelta
          </button>
        )}
      </aside>
    </div>
  );
}

function MsgBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const isHuman = msg.role === "human";
  const align = isUser ? "justify-start" : "justify-end";
  const bg = isUser
    ? "bg-[var(--color-earth-50)] text-[var(--color-leaf-900)]"
    : isHuman
      ? "bg-[var(--color-iris-100)] text-[var(--color-leaf-900)] border border-[var(--color-iris-700)]/30"
      : "bg-[var(--color-leaf-700)] text-white";
  return (
    <div className={`flex ${align}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${bg}`}>
        {isHuman && msg.author_name && (
          <p className="text-[9px] uppercase tracking-wider opacity-70 m-0 mb-0.5 font-medium">
            {msg.author_name}
          </p>
        )}
        {!isUser && !isHuman && (
          <p className="text-[9px] uppercase tracking-wider opacity-70 m-0 mb-0.5">
            Asistente NV
          </p>
        )}
        {msg.content}
      </div>
    </div>
  );
}
