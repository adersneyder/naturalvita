import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Decide a dónde llevar a un usuario recién autenticado.
 *
 * Regla:
 *   - Si su user_id está en admin_users y está activo → /admin
 *   - Si no → fallback (típicamente /mi-cuenta)
 *
 * Se usa en los 3 puntos de entrada de sesión:
 *   - signInWithPasswordAction (login con contraseña)
 *   - /auth/callback (OAuth Google y magic links)
 *   - /login (si llega un usuario que ya tiene sesión)
 *
 * Solo se aplica cuando el `next` solicitado es el default (/mi-cuenta):
 * si alguien pidió explícitamente ir a /checkout o a una ruta concreta,
 * se respeta — el role-routing es para el caso "entré sin destino".
 */
export async function resolvePostLoginDestination(
  fallback: string = "/mi-cuenta",
): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fallback;

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (adminUser?.is_active) return "/admin";
    return fallback;
  } catch {
    return fallback;
  }
}
