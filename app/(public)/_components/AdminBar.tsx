import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminBarHidden } from "./admin-bar-actions";
import AdminBarMenu from "./AdminBarMenu";

/**
 * Barra superior persistente en el sitio público, visible SOLO para
 * usuarios autenticados que existen en public.admin_users con
 * is_active=true. Inspirada en la admin bar de WordPress: permite al
 * equipo saltar al panel sin perder contexto de navegación.
 *
 * Estricta confidencialidad: si el visitante no es admin, este componente
 * devuelve null y no añade marca HTML alguna (no leaks en source view).
 *
 * Coste: 1 select adicional por request del layout público para
 * autenticados. Para visitantes anónimos no hay query extra — auth.getUser
 * ya corre antes en el layout.
 */
export default async function AdminBar() {
  let adminUser: { full_name: string | null; email: string; role: string } | null =
    null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("admin_users")
      .select("full_name, email, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!data || !data.is_active) return null;
    adminUser = {
      full_name: data.full_name,
      email: data.email,
      role: data.role,
    };
  } catch {
    return null;
  }

  if (await isAdminBarHidden()) return null;

  const displayName = adminUser.full_name?.split(" ")[0] ?? adminUser.email;

  return (
    <div className="sticky top-0 z-40 bg-[var(--color-leaf-900)] text-white border-b border-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-8 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="font-medium hover:text-[var(--color-leaf-100)] transition-colors flex items-center gap-1"
          >
            <span aria-hidden>←</span>
            Volver al panel
          </Link>
          <span className="text-white/40 hidden sm:inline">·</span>
          <span className="text-white/60 hidden sm:inline">
            Estás navegando como{" "}
            <span className="font-medium text-white">{displayName}</span>{" "}
            <span className="text-white/40">({adminUser.role})</span>
          </span>
        </div>
        <AdminBarMenu />
      </div>
    </div>
  );
}
