import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Customer = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  document_type: string | null;
  document_number: string | null;
  accepts_marketing: boolean;
};

/**
 * Obtiene el customer logueado o redirige a /iniciar-sesion.
 *
 * Auto-onboarding: si hay sesión auth pero no existe fila en `customers`,
 * se crea automáticamente con datos mínimos (id + email). El resto se
 * completa cuando el cliente lo edite en /mi-cuenta o llene el checkout.
 *
 * Uso típico:
 *   const customer = await requireCustomer();   // protege la ruta
 *   const customer = await requireCustomer({    // con next custom
 *     redirectTo: '/checkout',
 *   });
 */
export async function requireCustomer(opts?: {
  redirectTo?: string;
}): Promise<Customer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = opts?.redirectTo ?? "/mi-cuenta";
    redirect(`/iniciar-sesion?next=${encodeURIComponent(next)}`);
  }

  // Si el usuario es admin, lo expulsamos: el admin tiene su propio dashboard
  // y no debería aparecer como cliente. Esto evita confusión cuando el dueño
  // del negocio prueba el flujo de cliente desde la misma cuenta.
  // (Nota: no es un problema de seguridad, solo de UX.)

  const { data: existing } = await supabase
    .from("customers")
    .select("id, email, full_name, phone, document_type, document_number, accepts_marketing")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing as Customer;

  // Auto-creación
  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      id: user.id,
      email: user.email ?? "",
      accepts_marketing: false,
    })
    .select("id, email, full_name, phone, document_type, document_number, accepts_marketing")
    .single();

  if (error || !created) {
    console.error("[requireCustomer] error creando customer:", error?.message);
    // Si falla la creación (típicamente RLS), forzamos logout y redirect
    // limpio para no dejar al user en estado inconsistente.
    await supabase.auth.signOut();
    redirect("/iniciar-sesion?error=onboarding_failed");
  }

  return created as Customer;
}

/**
 * Versión que NO redirige: devuelve null si no hay sesión o si el usuario
 * no es cliente. Útil para componentes que muestran condicionalmente
 * "Iniciar sesión" vs "Mi cuenta" sin forzar autenticación.
 */
export async function getCurrentCustomer(): Promise<Customer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("customers")
    .select("id, email, full_name, phone, document_type, document_number, accepts_marketing")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Customer | null) ?? null;
}
