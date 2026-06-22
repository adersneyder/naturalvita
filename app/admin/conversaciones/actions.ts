"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCapability } from "@/lib/admin-capabilities";
import { logAdminAction } from "@/lib/audit-log";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChatActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const RespondSchema = z.object({
  conversation_id: z.string().uuid(),
  message: z.string().trim().min(1).max(4000),
});

/**
 * Responder a una conversación desde el inbox del equipo. Si la
 * conversación estaba 'active' o 'escalated', pasa a 'assigned' y
 * queda vinculada a quien responde. Si ya estaba assigned por otro,
 * lo respetamos (no robamos).
 */
export async function respondInConversation(
  input: z.infer<typeof RespondSchema>,
): Promise<ChatActionResult> {
  const actor = await requireCapability("chat.respond");
  const parsed = RespondSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const admin = createAdminClient();
  const { data: conv } = await admin
    .from("chat_conversations")
    .select("id, status, assigned_to")
    .eq("id", parsed.data.conversation_id)
    .maybeSingle();
  if (!conv) return { ok: false, error: "Conversación no encontrada" };

  if (conv.status === "resolved" || conv.status === "abandoned") {
    return { ok: false, error: `La conversación está ${conv.status}` };
  }

  // Si no estaba assigned, la tomamos.
  if (!conv.assigned_to) {
    await admin
      .from("chat_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        assigned_to: actor.id,
        status: "assigned",
      })
      .eq("id", parsed.data.conversation_id);
  } else {
    await admin
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", parsed.data.conversation_id);
  }

  const { error } = await admin.from("chat_messages").insert({
    conversation_id: parsed.data.conversation_id,
    role: "human",
    content: parsed.data.message,
    authored_by_user_id: actor.id,
  });
  if (error) {
    return { ok: false, error: "No pudimos enviar la respuesta" };
  }

  revalidatePath(`/admin/conversaciones/${parsed.data.conversation_id}`);
  revalidatePath("/admin/conversaciones");
  return { ok: true };
}

export async function resolveConversation(
  conversationId: string,
  intent?: string,
): Promise<ChatActionResult> {
  const actor = await requireCapability("chat.respond");
  if (!z.string().uuid().safeParse(conversationId).success) {
    return { ok: false, error: "ID inválido" };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("chat_conversations")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_intent: intent ?? null,
    })
    .eq("id", conversationId);
  if (error) return { ok: false, error: "No pudimos cerrar la conversación" };

  await logAdminAction({
    action: "config.update",
    entityType: "config",
    entityId: `chat:${conversationId}`,
    summary: `Cerró conversación de chat${intent ? ` (intent: ${intent})` : ""}`,
    metadata: { resolved_intent: intent ?? null },
  });
  void actor;

  revalidatePath("/admin/conversaciones");
  return { ok: true };
}
