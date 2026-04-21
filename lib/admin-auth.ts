import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type AdminRole = "owner" | "admin" | "editor" | "cashier" | "warehouse";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  is_active: boolean;
};

/**
 * Obtiene el admin_user actual o redirige a login si no está autenticado.
 * Úsalo en layouts y páginas de servidor.
 */
export async function getAdminUser(): Promise<AdminUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id, email, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!adminUser || !adminUser.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=not_authorized");
  }

  return adminUser as AdminUser;
}

/**
 * Verifica si el admin tiene alguno de los roles permitidos.
 * Redirige a /admin con mensaje si no tiene permiso.
 */
export async function requireRole(allowed: AdminRole[]): Promise<AdminUser> {
  const adminUser = await getAdminUser();
  if (!allowed.includes(adminUser.role)) {
    redirect("/admin?error=sin_permiso");
  }
  return adminUser;
}

/**
 * Verifica si un rol tiene permiso sin redirigir (para mostrar/ocultar botones).
 */
export function hasRole(userRole: AdminRole, allowed: AdminRole[]): boolean {
  return allowed.includes(userRole);
}
