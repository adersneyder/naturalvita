"use server";

import { subscribeToNewsletter } from "@/lib/newsletter/queries";
import { sendEmail } from "@/lib/email/client";
import { NewsletterWelcome } from "@/lib/email/templates/newsletter-welcome";
import { publicApiRatelimit, getClientIpFromHeaders } from "@/lib/ratelimit";

export type NewsletterSignupState = {
  ok: boolean;
  message: string;
};

/**
 * Server action para suscribir email al newsletter desde el footer.
 *
 * Validación stack:
 *   1. Honeypot field (campo oculto que solo bots llenan).
 *   2. Validación formato email.
 *   3. Rate limit por IP (Upstash, 30 req/min).
 *   4. subscribeToNewsletter() valida duplicados y reactiva si necesario.
 *   5. Si es nueva suscripción real, dispara email de bienvenida con cupón.
 *
 * Retorna state plano con mensaje para useActionState() en el cliente.
 */
export async function subscribeNewsletterAction(
  _prevState: NewsletterSignupState,
  formData: FormData,
): Promise<NewsletterSignupState> {
  // Honeypot: si está lleno, es bot. Fingimos éxito para no dar pistas.
  const honeypot = formData.get("website")?.toString() ?? "";
  if (honeypot.trim() !== "") {
    return { ok: true, message: "¡Listo! Revisa tu correo." };
  }

  const email = formData.get("email")?.toString().trim() ?? "";
  if (!email) {
    return { ok: false, message: "Ingresa un correo electrónico" };
  }

  // Rate limit
  try {
    const ip = await getClientIpFromHeaders();
    const { success } = await publicApiRatelimit.limit(`newsletter:${ip}`);
    if (!success) {
      return {
        ok: false,
        message: "Demasiadas solicitudes. Intenta en unos minutos.",
      };
    }
  } catch (err) {
    // Si Upstash falla, no bloqueamos al usuario legítimo
    console.warn("[newsletter-action] ratelimit no disponible:", err);
  }

  const result = await subscribeToNewsletter({
    email,
    source: "footer",
  });

  if (!result.ok) {
    return { ok: false, message: result.error };
  }

  // Solo enviar email de bienvenida si es suscripción NUEVA o reactivación.
  // Si ya estaba suscrito, no spammeamos.
  if (result.created) {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co";
    const unsubscribeUrl = `${baseUrl}/newsletter/desuscribir/${result.unsubscribe_token}`;

    // Disparar email pero NO bloqueamos la respuesta si Resend tarda
    sendEmail({
      to: email,
      subject: "Bienvenido a NaturalVita · cupón WELCOME10 dentro",
      template: NewsletterWelcome({
        customerName: null,
        couponCode: "WELCOME10",
        couponDescription:
          "10% en tu primera compra · mínimo $30.000 · descuento máximo $50.000",
        shopUrl: `${baseUrl}/tienda`,
        unsubscribeUrl,
      }),
      tags: [
        { name: "type", value: "newsletter_welcome" },
        { name: "source", value: "footer" },
      ],
    }).catch((err) => {
      console.error("[newsletter-action] error enviando welcome:", err);
    });
  }

  return {
    ok: true,
    message: result.created
      ? "¡Bienvenido! Revisa tu correo, te enviamos un cupón de bienvenida."
      : "Ya estás suscrito. Revisa tu bandeja para más novedades.",
  };
}
