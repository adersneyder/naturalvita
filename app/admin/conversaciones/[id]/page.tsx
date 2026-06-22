import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/admin-capabilities";
import { createAdminClient } from "@/lib/supabase/admin";
import ConversationDetail from "./_ConversationDetail";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ConversationDetailPage({
  params,
}: {
  params: Params;
}) {
  const actor = await requireCapability("chat.respond");
  const { id } = await params;

  const admin = createAdminClient();
  const { data: conv } = await admin
    .from("chat_conversations")
    .select(
      "id, visitor_id, customer_id, status, assigned_to, message_count, last_message_at, escalated_at, resolved_at, started_at, initial_page_path, total_cost_usd, resolved_intent",
    )
    .eq("id", id)
    .maybeSingle();

  if (!conv) notFound();

  const { data: messages } = await admin
    .from("chat_messages")
    .select(
      "id, role, content, created_at, authored_by_user_id, tool_calls, tool_results",
    )
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  // Resolver nombres de quienes respondieron (humanos del equipo).
  const userIds = Array.from(
    new Set(
      (messages ?? [])
        .map((m) => m.authored_by_user_id)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const namesById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: admins } = await admin
      .from("admin_users")
      .select("id, full_name, email")
      .in("id", userIds);
    for (const a of admins ?? []) {
      namesById.set(a.id, a.full_name ?? a.email);
    }
  }

  // Si es cliente logueado, traemos nombre/email para mostrar.
  let customerLabel: string | null = null;
  if (conv.customer_id) {
    const { data: c } = await admin
      .from("customers")
      .select("full_name, email")
      .eq("id", conv.customer_id)
      .maybeSingle();
    if (c) customerLabel = c.full_name ?? c.email ?? null;
  }

  return (
    <>
      <header className="mb-4">
        <Link
          href="/admin/conversaciones"
          className="text-xs text-[var(--color-iris-700)] hover:underline"
        >
          ← Conversaciones
        </Link>
        <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0 mt-2">
          {customerLabel ?? `Visitante anónimo`}
        </h1>
        <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
          {conv.message_count} mensajes · iniciada{" "}
          {new Date(conv.started_at).toLocaleString("es-CO", { hour12: false })}
          {conv.initial_page_path ? ` · desde ${conv.initial_page_path}` : ""}
          {conv.total_cost_usd > 0
            ? ` · costo agente $${conv.total_cost_usd.toFixed(4)}`
            : ""}
        </p>
      </header>

      <ConversationDetail
        conversationId={conv.id}
        status={conv.status}
        currentUserId={actor.id}
        assignedTo={conv.assigned_to}
        initialMessages={(messages ?? []).map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "human" | "tool" | "system",
          content: m.content,
          created_at: m.created_at,
          author_name: m.authored_by_user_id
            ? (namesById.get(m.authored_by_user_id) ?? null)
            : null,
        }))}
      />
    </>
  );
}
