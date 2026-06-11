import "server-only";
import { headers } from "next/headers";
import { createClient } from "./supabase/server";

/**
 * Tipos de acción registrados. Mantener el namespace `<entidad>.<verbo>`
 * para que los filtros sean fáciles. Si una acción nueva aparece, añádela
 * aquí — el tipo guía a quien escribe el server action.
 */
export type AuditAction =
  | "order.cancel"
  | "order.refund"
  | "order.status_change"
  | "order.note"
  | "flow.toggle"
  | "flow.publish"
  | "flow.unpublish"
  | "suppression.add"
  | "suppression.remove"
  | "guide.publish"
  | "guide.unpublish"
  | "guide.delete"
  | "product.activate"
  | "product.deactivate"
  | "product.delete"
  | "price.sync"
  | "coupon.create"
  | "coupon.deactivate"
  | "user.role_change"
  | "user.deactivate"
  | "config.update";

export type AuditEntityType =
  | "order"
  | "flow"
  | "suppression"
  | "guide"
  | "product"
  | "price_sync"
  | "coupon"
  | "user"
  | "config";

type LogParams = {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

/**
 * Escribe una entrada de auditoría. Debe llamarse desde server actions o
 * route handlers DESPUÉS de que la acción se haya ejecutado con éxito.
 *
 * No lanza: si el insert falla, lo registra en console y continúa. El audit
 * log es importante pero NO debe bloquear la acción legítima — preferimos
 * perder un evento que romperle al usuario una operación válida.
 */
export async function logAdminAction({
  action,
  entityType,
  entityId,
  summary,
  metadata,
}: LogParams): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let actorEmail: string | null = null;
    let actorRole: string | null = null;
    if (user) {
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("email, role")
        .eq("id", user.id)
        .maybeSingle();
      actorEmail = adminUser?.email ?? user.email ?? null;
      actorRole = adminUser?.role ?? null;
    }

    const h = await headers();
    // x-forwarded-for puede traer varios IPs separados por coma; el primero
    // es el cliente real, el resto son proxies intermedios.
    const forwardedFor = h.get("x-forwarded-for");
    const requestIp = forwardedFor?.split(",")[0]?.trim() ?? null;
    const userAgent = h.get("user-agent");

    const { error } = await supabase.from("admin_audit_log").insert({
      actor_user_id: user?.id ?? null,
      actor_email: actorEmail,
      actor_role: actorRole,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      summary,
      metadata: (metadata ?? {}) as never,
      request_ip: requestIp,
      request_user_agent: userAgent,
    });
    if (error) {
      console.error("[audit-log] insert failed", error.message, { action });
    }
  } catch (err) {
    console.error("[audit-log] unexpected error", err);
  }
}
