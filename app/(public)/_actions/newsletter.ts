"use server";

import { after } from "next/server";
import { subscribeToNewsletter } from "@/lib/newsletter/queries";
import {
  publicApiRatelimit,
  getClientIpFromHeaders,
} from "@/lib/ratelimit";
import { sendEmail } from "@/lib/email/client";
import { NewsletterWelcome } from "@/lib/email/templates/newsletter-welcome";

export type NewsletterSignupState = {
  ok: boolean;
  message: string;
};

/**
 * Server action de suscripción al newsletter desde el footer.
 *
 * Diseño:
 *   1. Honeypot anti-bot (campo "website" debe estar vacío).
 *   2. Validación de email mínima (formato lo valida queries.ts).
 *   3. Rate limit por IP.
 *   4. Insert en BD propia (newsletter_subscribers).
 *   5. Side effects en after() para garantizar ejecución post-response:
 *      - Email Resend con cupón WELCOME10.
 *      - Suscripción a lista Klaviyo + evento.
 *
 * after() de Next.js 15 garantiza que el código se ejecute DESPUÉS de
 * enviar el response al cliente pero ANTES de freezing de la lambda en
 * Vercel. Esto evita los delays de minutos del patrón fire-and-forget.
 */
export async function subscribeNewsletterAction(
  _prev: NewsletterSignupState,
  formData: FormData,
): Promise<NewsletterSignupState> {
  // 1. Honeypot
  const honeypot = formData.get("website")?.toString() ?? "";
  if (honeypot) {
    return { ok: true, message: "¡Gracias por suscribirte!" };
  }

  // 2. Validación básica
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  if (!email) {
    return { ok: false, message: "Por favor ingresa tu correo" };
  }

  // 3. Rate limit por IP
  try {
    const ip = await getClientIpFromHeaders();
    const { success } = await publicApiRatelimit.limit(
      `newsletter-sub:${ip}`,
    );
    if (!success) {
      return {
        ok: false,
        message: "Demasiadas solicitudes. Espera unos minutos.",
      };
    }
  } catch (err) {
    console.warn("[newsletter-action] ratelimit no disponible:", err);
  }

  // 4. Insert en BD
  const result = await subscribeToNewsletter({ email, source: "footer" });

  if (!result.ok) {
    return {
      ok: false,
      message:
        result.error ??
        "No pudimos suscribirte. Intenta de nuevo en unos minutos.",
    };
  }

  // 5. Side effects vía after() — solo si suscripción es nueva o reactivada
  if (result.created) {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co";
    const unsubscribeUrl = `${baseUrl}/newsletter/desuscribir/${result.unsubscribe_token}`;

    after(async () => {
      // Email de bienvenida con cupón (Resend)
      try {
        await sendEmail({
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
        });
      } catch (err) {
        console.error(
          "[newsletter-action after] error enviando welcome:",
          err,
        );
      }

      // Suscribir a lista Klaviyo + evento "Newsletter Subscribed"
      try {
        const { trackNewsletterSubscribed } = await import(
          "@/lib/events/track"
        );
        await trackNewsletterSubscribed({
          email,
          source: "footer",
          couponCode: "WELCOME10",
        });
      } catch (err) {
        console.error(
          "[newsletter-action after] error en trackNewsletterSubscribed:",
          err,
        );
      }
    });
  }

  return {
    ok: true,
    message:
      "¡Gracias por suscribirte! Te enviamos tu cupón al correo.",
  };
}
