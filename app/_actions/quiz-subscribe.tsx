"use server";

/**
 * app/_actions/quiz-subscribe.tsx
 *
 * Server action de captura/guardado del resultado del Quiz-Hero.
 * Sprint 2 Sesión A.2.
 *
 * Maneja DOS escenarios sin fricción:
 *
 *   A) Usuario LOGUEADO:
 *      - No pide email (usa el de su cuenta).
 *      - Vincula el resultado a su customer_id.
 *      - Respeta accepts_marketing: si es false, NO envía email automático
 *        (solo guarda + devuelve URL). Si es true, envía el email.
 *
 *   B) Usuario ANÓNIMO:
 *      - Pide email (opcional — el resultado ya se vio en pantalla).
 *      - Si deja email: lo guarda en newsletter_subscribers + envía email
 *        con la URL del resultado + cupón.
 *
 * En ambos casos guarda el resultado en quiz_results con un slug
 * compartible y devuelve la URL /quiz/r/[slug].
 */

import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  publicApiRatelimit,
  getClientIpFromHeaders,
} from "@/lib/ratelimit";
import { sendEmail } from "@/lib/email/client";
import { QuizResult } from "@/lib/email/templates/quiz-result";
import { saveQuizResult } from "@/lib/quiz/save-result";
import { STAGES, GOALS, selectionLabel } from "@/components/home/quiz-data";
import type { MatchedProduct } from "@/lib/quiz/match-products";
import type { Json } from "@/lib/supabase/types";

export type QuizSubscribeState = {
  ok: boolean;
  message: string;
  /** URL del resultado compartible (si se pudo guardar) */
  resultUrl?: string;
};

const stageIds = STAGES.map((s) => s.id) as [string, ...string[]];
const goalIds = GOALS.map((g) => g.id) as [string, ...string[]];

const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  priceCop: z.number(),
  imageUrl: z.string().nullable(),
  reason: z.string(),
});

const schema = z.object({
  // email es opcional: los logueados no lo mandan, los anónimos sí
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  etapa: z.enum(stageIds),
  objetivo: z.enum(goalIds),
  products: z.array(productSchema).max(3),
  website: z.string().optional(), // honeypot
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co";

export async function quizSubscribeAction(
  _prev: QuizSubscribeState,
  formData: FormData,
): Promise<QuizSubscribeState> {
  // 1. Honeypot
  const honeypot = formData.get("website")?.toString() ?? "";
  if (honeypot) {
    return { ok: true, message: "¡Listo! Revisa tu correo." };
  }

  // 2. Parseo de inputs (products viene como JSON string)
  let productsRaw: unknown = [];
  try {
    productsRaw = JSON.parse(formData.get("products")?.toString() ?? "[]");
  } catch {
    productsRaw = [];
  }

  const parsed = schema.safeParse({
    email: formData.get("email")?.toString().trim().toLowerCase() ?? "",
    etapa: formData.get("etapa")?.toString() ?? "",
    objetivo: formData.get("objetivo")?.toString() ?? "",
    products: productsRaw,
    website: honeypot,
  });

  if (!parsed.success) {
    return { ok: false, message: "Revisa los datos e intenta de nuevo." };
  }

  const { etapa, objetivo, products } = parsed.data;
  const formEmail = parsed.data.email && parsed.data.email !== "" ? parsed.data.email : null;

  // 3. Detectar usuario logueado (sin fricción)
  let customerId: string | null = null;
  let customerEmail: string | null = null;
  let customerAcceptsMarketing = false;
  try {
    const supabaseUser = await createClient();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (user) {
      customerId = user.id;
      // Leer datos del customer (email + accepts_marketing)
      const admin = createAdminClient();
      const { data: customer } = await admin
        .from("customers")
        .select("email, accepts_marketing")
        .eq("id", user.id)
        .maybeSingle();
      if (customer) {
        customerEmail = (customer.email as string) ?? user.email ?? null;
        customerAcceptsMarketing = Boolean(customer.accepts_marketing);
      } else {
        customerEmail = user.email ?? null;
      }
    }
  } catch (err) {
    console.warn("[quiz-subscribe] No se pudo leer sesión:", err);
  }

  const isLoggedIn = customerId !== null;
  // Email efectivo: el de la cuenta si está logueado, si no el del formulario
  const effectiveEmail = customerEmail ?? formEmail;

  // 4. Rate limit por IP
  try {
    const ip = await getClientIpFromHeaders();
    const { success } = await publicApiRatelimit.limit(`quiz-sub:${ip}`);
    if (!success) {
      return { ok: false, message: "Demasiadas solicitudes. Espera unos minutos." };
    }
  } catch (err) {
    console.warn("[quiz-subscribe] ratelimit no disponible:", err);
  }

  // 5. Guardar el resultado (siempre, para tener URL compartible)
  const slug = await saveQuizResult({
    etapa,
    objetivo,
    products: products as MatchedProduct[],
    customerId,
    email: effectiveEmail,
  });
  const resultUrl = slug ? `${SITE_URL}/quiz/r/${slug}` : undefined;

  // 6. Si hay email (logueado o anónimo que lo dejó), gestionar suscripción
  //    y decidir si enviar email automático.
  let shouldSendEmail = false;
  let unsubscribeToken: string | null = null;

  if (effectiveEmail) {
    const admin = createAdminClient();
    const quizProperties: Json = {
      etapa,
      objetivo,
      recommended_product_ids: products.map((p) => p.id),
      result_slug: slug,
      completed_at: new Date().toISOString(),
    };

    if (isLoggedIn) {
      // Usuario logueado: respeta accepts_marketing.
      // Solo enviamos email si aceptó marketing.
      shouldSendEmail = customerAcceptsMarketing;
      // Igual guardamos sus quiz_properties en newsletter_subscribers si
      // ya está suscrito, para alimentar Savia (sin re-suscribir).
      const { data: existing } = await admin
        .from("newsletter_subscribers")
        .select("id, status, unsubscribe_token")
        .eq("email", effectiveEmail)
        .maybeSingle();
      if (existing) {
        await admin
          .from("newsletter_subscribers")
          .update({ quiz_properties: quizProperties })
          .eq("id", existing.id as string);
        unsubscribeToken = (existing.unsubscribe_token as string) ?? null;
        // Si está dado de baja, no le mandamos aunque accepts_marketing sea true
        if (existing.status !== "subscribed") shouldSendEmail = false;
      }
    } else {
      // Usuario anónimo que dejó email: suscribir + enviar.
      const { data: existing } = await admin
        .from("newsletter_subscribers")
        .select("id, status, unsubscribe_token")
        .eq("email", effectiveEmail)
        .maybeSingle();

      if (existing) {
        await admin
          .from("newsletter_subscribers")
          .update({ quiz_properties: quizProperties })
          .eq("id", existing.id as string);
        unsubscribeToken = (existing.unsubscribe_token as string) ?? null;
        shouldSendEmail = existing.status === "subscribed";
      } else {
        const { data: inserted, error: insertError } = await admin
          .from("newsletter_subscribers")
          .insert({
            email: effectiveEmail,
            source: "quiz",
            status: "subscribed",
            quiz_properties: quizProperties,
          })
          .select("unsubscribe_token")
          .single();
        if (insertError) {
          console.error("[quiz-subscribe] Error insert:", insertError.message);
          // No abortamos: el resultado ya se guardó, devolvemos la URL igual.
        } else {
          unsubscribeToken = (inserted?.unsubscribe_token as string) ?? null;
          shouldSendEmail = true;
        }
      }
    }
  }

  // 7. Email vía after() (fuera del response window)
  if (shouldSendEmail && effectiveEmail) {
    const emailTo = effectiveEmail;
    const token = unsubscribeToken;
    after(async () => {
      try {
        const unsubscribeUrl = token
          ? `${SITE_URL}/newsletter/desuscribir/${token}`
          : undefined;
        await sendEmail({
          to: emailTo,
          subject: "Tu selección personalizada de NaturalVita 🌿",
          react: (
            <QuizResult
              products={products as MatchedProduct[]}
              selectionLabel={selectionLabel(etapa, objetivo)}
              couponCode="WELCOME10"
              baseUrl={SITE_URL}
              resultUrl={resultUrl}
              unsubscribeUrl={unsubscribeUrl}
            />
          ),
          category: "marketing",
          ...(unsubscribeUrl
            ? {
                headers: {
                  "List-Unsubscribe": `<${unsubscribeUrl}>`,
                  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
              }
            : {}),
          tags: [
            { name: "flow", value: "quiz-result" },
            { name: "etapa", value: etapa },
            { name: "objetivo", value: objetivo },
          ],
        });
      } catch (err) {
        console.error("[quiz-subscribe] Error enviando email:", err);
      }
    });
  }

  // 8. Mensaje según escenario
  let message: string;
  if (isLoggedIn) {
    message = shouldSendEmail
      ? "¡Guardamos tu selección! Te la enviamos también al correo."
      : "¡Guardamos tu selección! Puedes volver a verla cuando quieras.";
  } else if (effectiveEmail && shouldSendEmail) {
    message = "¡Listo! Te enviamos tu selección y un cupón de bienvenida al correo.";
  } else {
    message = "¡Listo! Aquí tienes tu selección.";
  }

  return { ok: true, message, resultUrl };
}
