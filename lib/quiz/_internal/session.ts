// lib/quiz/_internal/session.ts
// Helpers de sesión autocontenidos para el módulo del quiz, basados en
// Supabase Auth leído desde las cookies de la petición (patrón Next 15
// App Router con @supabase/ssr, que el proyecto ya usa para el login
// multi-método: Google OAuth + email/password + magic link).
//
// Exporta:
//  - getQuizCustomer(): devuelve { id } del usuario logueado, o null.
//  - requireQuizAdmin(): lanza si el usuario no es admin.
//
// IMPORTANTE sobre el guard de admin:
// La verificación de admin asume que existe una forma de marcar administradores.
// Implementé DOS estrategias y uso la primera que aplique:
//   (a) app_metadata.role === 'admin' en el usuario de Supabase Auth, o
//   (b) una fila en la tabla `admin_users` con el user id.
// Ajusta isAdmin() abajo a tu modelo real si difiere (está aislado en un
// solo lugar, comentado).

import { cookies } from "next/headers";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

async function ssrClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // En Next 15 cookies() es async; lo resolvemos aquí una vez.
  const cookieStore = await cookies();
  return createSSRClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* lectura solamente: el quiz no modifica la sesión */
      },
    },
  });
}

/** Usuario logueado (id) o null. No lanza. */
export async function getQuizCustomer(): Promise<{ id: string } | null> {
  try {
    const supabase = await ssrClient();
    const { data } = await supabase.auth.getUser();
    return data.user ? { id: data.user.id } : null;
  } catch {
    return null;
  }
}

/** Lanza si no hay admin autenticado. Usar al inicio de acciones admin. */
export async function requireQuizAdmin(): Promise<{ id: string }> {
  const supabase = await ssrClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("No autenticado.");

  // --- Verificación de admin (ajusta a tu modelo si difiere) ---
  // (a) rol en app_metadata
  const role = (user.app_metadata as { role?: string } | null)?.role;
  if (role === "admin") return { id: user.id };

  // (b) fila en admin_users
  try {
    const { data: row } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (row) return { id: user.id };
  } catch {
    /* si la tabla no existe, cae al rechazo */
  }
  // -------------------------------------------------------------

  throw new Error("No autorizado: se requiere rol de administrador.");
}
