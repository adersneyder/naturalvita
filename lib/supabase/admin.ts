import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase que bypasea RLS usando la service_role key.
 *
 * USO EXCLUSIVAMENTE SERVER-SIDE. Nunca exportar este cliente a código que
 * corra en el navegador, porque la service_role key da acceso total a la BD.
 *
 * Casos legítimos:
 * - Subir imágenes a Storage desde el scraper (la auth de cookie no llega
 *   confiablemente al request HTTP de Storage cuando el endpoint corre largo)
 * - Operaciones administrativas que necesitan saltarse RLS por diseño
 *
 * Para todo lo demás, usar createClient() de ./server.ts que respeta RLS
 * y la sesión del admin actual.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en variables de entorno",
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
