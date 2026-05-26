// lib/quiz/actions.ts
"use server";

// Server actions del quiz:
//  - resolveQuizAction: dada (necesidad, etapa), devuelve el resultado.
//  - saveQuizResultAction: persiste el resultado del quiz. Si el usuario
//    está logueado, lo vincula a su customer_id (sin pedir email). Si es
//    anónimo y entrega email, lo captura para el cupón / newsletter.
//
// Nota de integración: este archivo asume helpers que YA existen en el repo
// (rate limit Upstash, cliente Supabase server, sesión). Si los nombres
// difieren, ajustar los imports — están marcados con TODO.

import { z } from "zod";
import { resolveQuiz } from "./queries";
import { type LifeStage } from "./types";
import { quizServiceClient } from "./_internal/supabase";
import { quizRateLimit } from "./_internal/rate-limit";
import { getQuizCustomer } from "./_internal/session";

const resolveSchema = z.object({
  needSlug: z.string().min(1).max(64),
  stage: z.enum([
    "bebe",
    "nino",
    "adolescente",
    "embarazo",
    "adulto",
    "adulto-mayor",
  ]),
});

export async function resolveQuizAction(input: {
  needSlug: string;
  stage: LifeStage;
}) {
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Datos inválidos." };
  }
  const result = await resolveQuiz(parsed.data.needSlug, parsed.data.stage);
  if (!result) return { ok: false as const, error: "No se pudo resolver." };
  return { ok: true as const, result };
}

const saveSchema = z.object({
  needSlug: z.string().min(1).max(64),
  stage: z.string().min(1).max(32),
  email: z.string().email().optional(),
  // honeypot: debe venir vacío. Si trae algo, es bot.
  website: z.string().max(0).optional(),
  acceptsMarketing: z.boolean().optional(),
  // snapshot de productos recomendados (para guardar en products jsonb)
  productsSnapshot: z
    .array(
      z.object({
        productId: z.string(),
        name: z.string(),
        slug: z.string(),
        tier: z.string(),
      }),
    )
    .optional(),
});

export async function saveQuizResultAction(input: unknown) {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Datos inválidos." };
  }
  const { needSlug, stage, email, website, acceptsMarketing, productsSnapshot } =
    parsed.data;

  // Honeypot anti-bot
  if (website && website.length > 0) {
    return { ok: true as const, skipped: true }; // responde ok silencioso
  }

  const supabase = quizServiceClient();
  const customer = await getQuizCustomer().catch(() => null);

  // Rate limit por IP/usuario para el guardado anónimo con email
  if (!customer && email) {
    const id = `quiz-save:${email}`;
    const { success } = await quizRateLimit(id);
    if (!success) {
      return { ok: false as const, error: "Demasiados intentos. Intenta más tarde." };
    }
  }

  // slug único corto para poder compartir/recuperar el resultado
  const shareSlug = crypto.randomUUID().slice(0, 8);

  // Persistir resultado del quiz en el esquema existente de quiz_results.
  // products: snapshot jsonb de lo recomendado (para mostrar al recuperar).
  const { error } = await supabase.from("quiz_results").insert({
    slug: shareSlug,
    etapa: stage,
    objetivo: needSlug,
    products: productsSnapshot ?? [],
    customer_id: customer?.id ?? null,
    email: customer ? null : (email ?? null),
  });

  if (error) {
    console.error("saveQuizResultAction:", error.message);
    return { ok: false as const, error: "No se pudo guardar." };
  }

  // Si entregó email y aceptó marketing y NO está logueado, encolar bienvenida
  // vía el sistema existente (Savia / newsletter). TODO(repo): integrar con
  // subscribeToNewsletter o el flujo de cupón WELCOME10 ya existente.
  return { ok: true as const, loggedIn: Boolean(customer), shareSlug };
}
