/**
 * lib/savia/unsubscribe-token.ts
 *
 * Resuelve un token de baja para enviar marketing a un email. Si el email
 * ya es suscriptor del newsletter, reusa su token real. Si no (ej. comprador
 * que nunca se suscribio explicitamente pero acepto marketing), genera un
 * token efimero deterministico: el endpoint /api/savia/unsubscribe igual lo
 * procesa anadiendo el email a email_suppressions (best-effort), asi que el
 * link de baja siempre funciona sin crear un suscriptor sin consentimiento.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export async function resolveUnsubscribeToken(email: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("newsletter_subscribers")
    .select("unsubscribe_token")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (data?.unsubscribe_token) return data.unsubscribe_token as string;
  return "anon-" + Buffer.from(email.toLowerCase()).toString("base64url");
}

/**
 * Procesa una baja por token, soportando ambos formatos:
 *   - token real de newsletter_subscribers -> delega en unsubscribeFromNewsletter
 *     (marca unsubscribed + anade a email_suppressions).
 *   - token efimero 'anon-<base64url email>' -> decodifica y anade a
 *     email_suppressions directamente (no hay suscriptor que marcar).
 * Idempotente y tolerante: nunca lanza.
 */
export async function processSaviaUnsubscribe(
  token: string,
): Promise<{ ok: boolean; email?: string; error?: string }> {
  const clean = token.trim();

  if (clean.startsWith("anon-")) {
    let email = "";
    try {
      email = Buffer.from(clean.slice(5), "base64url").toString("utf8");
    } catch {
      return { ok: false, error: "Token invalido" };
    }
    if (!email.includes("@")) return { ok: false, error: "Token invalido" };

    const supabase = createAdminClient();
    const { error } = await supabase.from("email_suppressions").upsert(
      { email: email.toLowerCase(), reason: "unsubscribe", source: "savia" },
      { onConflict: "email" },
    );
    if (error) {
      console.error("[savia/unsubscribe] error anon suppress:", error.message);
      return { ok: false, error: "No pudimos procesar la baja" };
    }
    return { ok: true, email };
  }

  // Token de newsletter normal.
  const { unsubscribeFromNewsletter } = await import("@/lib/newsletter/queries");
  return unsubscribeFromNewsletter(clean);
}
