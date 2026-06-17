"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCapability } from "@/lib/admin-capabilities";
import { logAdminAction } from "@/lib/audit-log";
import { createAdminClient } from "@/lib/supabase/admin";

export type UsersActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const VALID_ROLES = ["admin", "editor", "cashier", "warehouse"] as const;
type AssignableRole = (typeof VALID_ROLES)[number];

const InviteSchema = z.object({
  email: z.string().email().max(254),
  full_name: z.string().trim().min(2).max(120),
  role: z.enum(VALID_ROLES),
});

/**
 * Invita un nuevo miembro al equipo. Flujo:
 *  1. Si el email ya existe en auth.users: solo insertamos en
 *     admin_users (o reactivamos si ya estaba).
 *  2. Si no existe: usamos Supabase Auth Admin API para crear el
 *     usuario y enviar magic link. Crear cuenta sin password — el
 *     invitado la define al entrar via /admin/mi-perfil.
 *
 * Solo owner puede asignar/cambiar roles ('users.manage' capability).
 * No se permite asignar 'owner' por UI — se queda como rol exclusivo
 * de quien tiene control real de la BD.
 */
export async function inviteAdmin(
  formData: FormData,
): Promise<UsersActionResult> {
  const actor = await requireCapability("users.manage");

  const parsed = InviteSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    full_name: String(formData.get("full_name") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { email, full_name, role } = parsed.data;

  const admin = createAdminClient();

  // ¿Existe ya en auth.users? Listado paginado, primer match.
  let userId: string | null = null;
  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = data?.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );
    if (existing) userId = existing.id;
  } catch (err) {
    console.warn("[inviteAdmin] listUsers falló", err);
  }

  if (!userId) {
    // No existe — invitarlo (envía magic link automáticamente).
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name },
    });
    if (error || !data.user) {
      console.error("[inviteAdmin] inviteUserByEmail falló", error?.message);
      return {
        ok: false,
        error:
          "No pudimos enviar la invitación. Verifica que el correo sea válido.",
      };
    }
    userId = data.user.id;
  }

  // Insert/reactivar en admin_users
  const { error: upsertErr } = await admin
    .from("admin_users")
    .upsert(
      {
        id: userId,
        email,
        full_name,
        role,
        is_active: true,
      },
      { onConflict: "id" },
    );
  if (upsertErr) {
    console.error("[inviteAdmin] upsert admin_users", upsertErr.message);
    return { ok: false, error: "No pudimos registrar al miembro del equipo" };
  }

  // Registrar invitación (para histórico). Si ya existía registro,
  // upsert por email.
  await admin
    .from("admin_invitations")
    .upsert(
      {
        email,
        role,
        full_name,
        invited_by: actor.id,
        status: "sent",
        invited_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "email" },
    );

  await logAdminAction({
    action: "user.role_change",
    entityType: "user",
    entityId: userId,
    summary: `Invitó a ${email} como ${role}`,
    metadata: { email, role, full_name },
  });

  revalidatePath("/admin/usuarios");
  return {
    ok: true,
    message: `Invitación enviada a ${email}. Le llegó un enlace de acceso.`,
  };
}

const ChangeRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(VALID_ROLES),
});

export async function changeRole(
  input: z.infer<typeof ChangeRoleSchema>,
): Promise<UsersActionResult> {
  const actor = await requireCapability("users.manage");
  const parsed = ChangeRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }
  const { user_id, role } = parsed.data;

  // El owner no se puede degradar desde la UI (defensa contra
  // bloquearse a sí mismo). Detectamos owners y rechazamos.
  if (user_id === actor.id) {
    return {
      ok: false,
      error: "No puedes cambiar tu propio rol. Pídele a otro owner que lo haga.",
    };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("admin_users")
    .select("email, role")
    .eq("id", user_id)
    .maybeSingle();

  if (target?.role === "owner") {
    return {
      ok: false,
      error: "No puedes cambiar el rol de un owner desde aquí.",
    };
  }

  const { error } = await admin
    .from("admin_users")
    .update({ role })
    .eq("id", user_id);
  if (error) return { ok: false, error: "No pudimos cambiar el rol" };

  await logAdminAction({
    action: "user.role_change",
    entityType: "user",
    entityId: user_id,
    summary: `Cambió rol de ${target?.email ?? user_id} a ${role}`,
    metadata: { from: target?.role, to: role },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true, message: "Rol actualizado" };
}

export async function setAdminActive(
  userId: string,
  active: boolean,
): Promise<UsersActionResult> {
  const actor = await requireCapability("users.manage");
  if (!z.string().uuid().safeParse(userId).success) {
    return { ok: false, error: "ID inválido" };
  }
  if (userId === actor.id && !active) {
    return { ok: false, error: "No puedes desactivar tu propia cuenta" };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("admin_users")
    .select("email, role")
    .eq("id", userId)
    .maybeSingle();

  if (target?.role === "owner" && !active) {
    return { ok: false, error: "No puedes desactivar a un owner desde aquí." };
  }

  const { error } = await admin
    .from("admin_users")
    .update({ is_active: active })
    .eq("id", userId);
  if (error) return { ok: false, error: "No pudimos actualizar el estado" };

  await logAdminAction({
    action: "user.deactivate",
    entityType: "user",
    entityId: userId,
    summary: `${active ? "Reactivó" : "Desactivó"} a ${target?.email ?? userId}`,
    metadata: { active },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

const SetCapSchema = z.object({
  role: z.enum(VALID_ROLES),
  capability_code: z.string().min(3).max(80),
  granted: z.boolean(),
});

/**
 * Toggle granular de capability por rol. Owner es wildcard implícito —
 * no se edita desde aquí; siempre tiene TODO.
 */
export async function setRoleCapability(
  input: z.infer<typeof SetCapSchema>,
): Promise<UsersActionResult> {
  const actor = await requireCapability("users.manage");
  const parsed = SetCapSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }
  const { role, capability_code, granted } = parsed.data;

  const admin = createAdminClient();
  if (granted) {
    const { error } = await admin
      .from("admin_role_capabilities")
      .upsert(
        { role, capability_code, granted_by: actor.id },
        { onConflict: "role,capability_code" },
      );
    if (error) return { ok: false, error: "No pudimos otorgar la capacidad" };
  } else {
    const { error } = await admin
      .from("admin_role_capabilities")
      .delete()
      .eq("role", role)
      .eq("capability_code", capability_code);
    if (error) return { ok: false, error: "No pudimos quitar la capacidad" };
  }

  await logAdminAction({
    action: "config.update",
    entityType: "config",
    entityId: `role:${role}`,
    summary: `${granted ? "Otorgó" : "Quitó"} capacidad ${capability_code} al rol ${role}`,
    metadata: { role, capability_code, granted },
  });

  revalidatePath("/admin/usuarios/roles");
  return { ok: true };
}
