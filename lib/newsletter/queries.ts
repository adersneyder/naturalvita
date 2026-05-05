import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Lib de newsletter.
 *
 * Modelo: single opt-in con email de bienvenida + cupón.
 * Justificación: doble opt-in agrega fricción significativa (clic en email
 * de confirmación) y reduce conversión 30-40%. Como mitigación de spam
 * usamos:
 *   1. Honeypot field (anti-bots).
 *   2. Validación de formato de email estricta.
 *   3. Rate limit por IP en server action.
 *   4. unsubscribe_token en cada email para opt-out fácil.
 *
 * El email de bienvenida con cupón sirve como confirmación implícita: si
 * la persona no se suscribió y recibe spam, hace clic en "desuscribir" y
 * queda fuera. Si sí se suscribió, recibe valor inmediato (cupón) y el
 * email refuerza el opt-in.
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase service role no configurado");
  }
  return createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type NewsletterSubscribeResult =
  | {
      ok: true;
      /** True si es nueva suscripción, false si reactivamos uno desuscrito previamente */
      created: boolean;
      unsubscribe_token: string;
    }
  | { ok: false; error: string };

/**
 * Suscribir un email al newsletter.
 *
 * Comportamiento:
 *   - Email nuevo: insert + retorna {created: true}.
 *   - Email existente activo: no-op + retorna {created: false} (idempotente).
 *   - Email existente desuscrito previamente: reactiva + retorna {created: false}.
 */
export async function subscribeToNewsletter(params: {
  email: string;
  source: string;
  fullName?: string | null;
}): Promise<NewsletterSubscribeResult> {
  const emailNorm = params.email.trim().toLowerCase();
  if (!isValidEmail(emailNorm)) {
    return { ok: false, error: "Correo inválido" };
  }

  const supabase = getServiceClient();

  // ¿Ya existe?
  const { data: existing } = await supabase
    .from("newsletter_subscribers")
    .select("id, status, unsubscribe_token")
    .eq("email", emailNorm)
    .maybeSingle();

  if (existing) {
    if (existing.status === "subscribed") {
      // Ya suscrito: idempotente OK pero NO mandamos email de bienvenida
      return {
        ok: true,
        created: false,
        unsubscribe_token: existing.unsubscribe_token,
      };
    }
    // Reactivar desuscripción previa
    const { error: updateErr } = await supabase
      .from("newsletter_subscribers")
      .update({
        status: "subscribed",
        unsubscribed_at: null,
        updated_at: new Date().toISOString(),
        full_name: params.fullName ?? null,
      })
      .eq("id", existing.id);

    if (updateErr) {
      console.error("[newsletter] error reactivando:", updateErr);
      return { ok: false, error: "No pudimos procesar la suscripción" };
    }

    return {
      ok: true,
      created: false,
      unsubscribe_token: existing.unsubscribe_token,
    };
  }

  // Nuevo
  const { data: created, error: insertErr } = await supabase
    .from("newsletter_subscribers")
    .insert({
      email: emailNorm,
      source: params.source,
      full_name: params.fullName ?? null,
    })
    .select("unsubscribe_token")
    .single();

  if (insertErr || !created) {
    console.error("[newsletter] error insertando:", insertErr);
    return { ok: false, error: "No pudimos procesar la suscripción" };
  }

  return {
    ok: true,
    created: true,
    unsubscribe_token: created.unsubscribe_token,
  };
}

/**
 * Desuscribir por token único. Token viene del link en cada email.
 * Idempotente: desuscribir alguien ya desuscrito retorna OK.
 */
export async function unsubscribeFromNewsletter(
  token: string,
): Promise<{ ok: boolean; email?: string; error?: string }> {
  const tokenClean = token.trim();
  if (!tokenClean || tokenClean.length < 16 || tokenClean.length > 64) {
    return { ok: false, error: "Token inválido" };
  }

  const supabase = getServiceClient();

  const { data: subscriber } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, status")
    .eq("unsubscribe_token", tokenClean)
    .maybeSingle();

  if (!subscriber) {
    return { ok: false, error: "Token no válido o ya expirado" };
  }

  if (subscriber.status === "unsubscribed") {
    return { ok: true, email: subscriber.email };
  }

  const { error: updateErr } = await supabase
    .from("newsletter_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriber.id);

  if (updateErr) {
    console.error("[newsletter] error desuscribiendo:", updateErr);
    return { ok: false, error: "No pudimos procesar la desuscripción" };
  }

  return { ok: true, email: subscriber.email };
}

function isValidEmail(email: string): boolean {
  // Validación pragmática: tiene que tener @, dominio con punto, sin espacios,
  // y rango de longitud razonable. RFC compliance estricto NO es deseable
  // porque rechaza emails válidos pero raros.
  if (!email || email.length < 5 || email.length > 254) return false;
  if (/\s/.test(email)) return false;
  const at = email.indexOf("@");
  if (at < 1 || at === email.length - 1) return false;
  const domain = email.slice(at + 1);
  if (!domain.includes(".")) return false;
  return true;
}
