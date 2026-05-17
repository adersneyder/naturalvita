/**
 * lib/email/client.ts
 *
 * Cliente unificado de envío de emails de NaturalVita.
 *
 * MIGRACIÓN SPRINT 2 SESIÓN 0 (14-may-2026):
 *   Reemplaza el adapter AWS SES por Resend tras la denegación del sandbox
 *   exit por parte de AWS. La infraestructura SES queda dormida para
 *   reapelación en mes 2-3. Esta migración mantiene la interfaz pública
 *   `sendEmail()` intacta para que todas las server actions, plantillas
 *   y futuras integraciones de Savia funcionen sin modificación.
 *
 * Modelo de correos (sin cambios desde Sprint 1):
 *   - transactional → notificaciones@naturalvita.co
 *   - marketing     → hola@news.naturalvita.co
 *   - reply-to      → info@naturalvita.co (humano, Hostinger)
 *
 * Responsabilidades de este módulo:
 *   1. Encapsular el SDK de Resend en un singleton lazy
 *   2. Decidir el `from` según `category`
 *   3. Renderizar React → HTML + plain-text (con auto-fallback de texto)
 *   4. Consultar `email_suppressions` antes de cada envío
 *   5. Inyectar headers RFC para marketing (List-Unsubscribe en Sprint 3)
 *   6. Devolver un resultado tipado con messageId para tracking
 *
 * Lo que NO hace (cubierto por Savia en Sprint 3):
 *   - Encolar envíos (eso es `email_jobs` + cron)
 *   - Tracking de open/click (eso son endpoints propios)
 *   - Procesar bounces/complaints (eso es el webhook `/api/webhooks/resend`)
 */

import { Resend } from "resend";
import { render } from "@react-email/render";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReactElement } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

export type EmailCategory = "transactional" | "marketing";

export interface SendEmailOptions {
  /** Email del destinatario. String simple o "Nombre <email@dominio>" */
  to: string;

  /** Asunto del email */
  subject: string;

  /**
   * Contenido React (preferido). Se renderiza a HTML y a plain-text
   * automáticamente usando `@react-email/render`.
   */
  react?: ReactElement;

  /** HTML crudo. Si pasas `react`, se ignora. */
  html?: string;

  /**
   * Plain-text alternativo. Si no se pasa y se usa `react`, se genera
   * automáticamente. Se recomienda enviar siempre para deliverability.
   */
  text?: string;

  /**
   * Categoría del email. Determina el `from` automáticamente y el
   * tratamiento de headers / suppression list.
   * @default "transactional"
   */
  category?: EmailCategory;

  /**
   * Override del `from`. Solo se usa en casos especiales (p. ej. dev@).
   * En el 99% de los casos déjalo en blanco para que el cliente decida.
   */
  from?: string;

  /** Override del Reply-To. Por defecto `info@naturalvita.co`. */
  replyTo?: string;

  /**
   * Tags arbitrarios para reporting en Resend (filtros de campañas,
   * eventos por tipo, etc.). Se pasan como tags nativos de Resend.
   */
  tags?: Array<{ name: string; value: string }>;

  /**
   * Headers HTTP extra del email. Útil para `List-Unsubscribe` y
   * `List-Unsubscribe-Post` que Savia inyecta en Sprint 3.
   */
  headers?: Record<string, string>;

  /**
   * Si está en `true`, omite el chequeo de suppression list.
   * SOLO usar para correos verdaderamente críticos (recuperación de
   * contraseña, etc.). Por defecto `false`.
   * @default false
   */
  skipSuppressionCheck?: boolean;
}

export interface SendEmailResult {
  /** `true` si el envío fue aceptado por Resend */
  success: boolean;

  /**
   * Alias de `success` para compatibilidad con código pre-existente
   * que consume el cliente. Siempre tiene el mismo valor que `success`.
   * Nuevos consumidores deberían usar `success`.
   */
  ok: boolean;

  /** ID del mensaje en Resend para tracking de eventos */
  messageId?: string;

  /**
   * Razón cuando `success = false`. Valores posibles:
   *   - "suppressed": el email está en la lista de suppression
   *   - "invalid_input": faltó `to`, `subject`, o contenido
   *   - "transport_error": Resend devolvió error
   *   - "internal_error": excepción no manejada
   */
  error?: "suppressed" | "invalid_input" | "transport_error" | "internal_error";

  /** Mensaje de error humano-legible para logs */
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────────────────────────────────────

const FROM_TRANSACTIONAL =
  process.env.RESEND_FROM_TRANSACTIONAL ??
  "NaturalVita <notificaciones@naturalvita.co>";

const FROM_MARKETING =
  process.env.RESEND_FROM_MARKETING ??
  "NaturalVita <hola@news.naturalvita.co>";

const REPLY_TO_DEFAULT =
  process.env.RESEND_REPLY_TO ?? "info@naturalvita.co";

// ─────────────────────────────────────────────────────────────────────────────
// Singletons lazy (Resend client + Supabase admin)
// ─────────────────────────────────────────────────────────────────────────────

let _resend: Resend | null = null;

function getResendClient(): Resend {
  if (_resend) return _resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[email/client] RESEND_API_KEY no está configurada en variables de entorno.",
    );
  }

  _resend = new Resend(apiKey);
  return _resend;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades internas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrae la parte de email puro de un string que puede venir como
 * "Nombre <email@dominio>" o como "email@dominio" directo.
 */
function extractEmail(addr: string): string {
  const match = addr.match(/<([^>]+)>/);
  return (match ? match[1] : addr).trim().toLowerCase();
}

/**
 * Consulta la tabla `email_suppressions` para verificar si una dirección
 * está bloqueada (por bounce hard, complaint, o unsubscribe).
 * Devuelve `true` si el envío debe continuar, `false` si está bloqueado.
 */
async function isAllowedRecipient(email: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("email_suppressions")
      .select("email")
      .eq("email", extractEmail(email))
      .maybeSingle();

    if (error) {
      // Si Supabase falla, mejor enviar que perder el correo crítico.
      // El bounce posterior lo añadirá si era inválido de todas formas.
      console.warn(
        "[email/client] Suppression check falló, permitiendo envío:",
        error.message,
      );
      return true;
    }

    return !data;
  } catch (err) {
    console.warn("[email/client] Suppression check exception:", err);
    return true;
  }
}

/**
 * Resuelve el `from` según categoría. Si el caller especifica `from`
 * lo respeta (caso edge).
 */
function resolveFrom(category: EmailCategory, override?: string): string {
  if (override) return override;
  return category === "marketing" ? FROM_MARKETING : FROM_TRANSACTIONAL;
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública: sendEmail
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envía un email a través de Resend con la configuración correcta según
 * categoría. Es la única función que el resto del código debe usar.
 *
 * @example
 * // Email transaccional (default)
 * await sendEmail({
 *   to: "cliente@example.com",
 *   subject: "Confirmación de pedido",
 *   react: <OrderPaid order={order} />,
 * });
 *
 * @example
 * // Email de marketing (Savia)
 * await sendEmail({
 *   to: subscriber.email,
 *   subject: "Bienvenido a NaturalVita",
 *   react: <NewsletterWelcome firstName={subscriber.firstName} />,
 *   category: "marketing",
 *   tags: [
 *     { name: "flow", value: "welcome-series" },
 *     { name: "step", value: "1" },
 *   ],
 * });
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const {
    to,
    subject,
    react,
    html: htmlInput,
    text: textInput,
    category = "transactional",
    from: fromOverride,
    replyTo = REPLY_TO_DEFAULT,
    tags,
    headers,
    skipSuppressionCheck = false,
  } = options;

  // Validación de inputs
  if (!to || !subject || (!react && !htmlInput)) {
    return {
      success: false,
      ok: false,
      error: "invalid_input",
      errorMessage: "Faltan campos requeridos: to, subject, y react/html.",
    };
  }

  // Chequeo de suppression list
  if (!skipSuppressionCheck) {
    const allowed = await isAllowedRecipient(to);
    if (!allowed) {
      console.info(
        `[email/client] Envío bloqueado por suppression list: ${extractEmail(to)}`,
      );
      return {
        success: false,
        ok: false,
        error: "suppressed",
        errorMessage: `${extractEmail(to)} está en la lista de suppression.`,
      };
    }
  }

  // Render React → HTML + text si aplica
  let html: string;
  let text: string;

  if (react) {
    try {
      html = await render(react);
      text = textInput ?? (await render(react, { plainText: true }));
    } catch (err) {
      console.error("[email/client] Error renderizando React email:", err);
      return {
        success: false,
        ok: false,
        error: "internal_error",
        errorMessage: "Falló el render de la plantilla React.",
      };
    }
  } else {
    html = htmlInput!;
    text = textInput ?? stripHtml(html);
  }

  // Envío vía Resend
  try {
    const resend = getResendClient();
    const from = resolveFrom(category, fromOverride);

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      replyTo,
      headers,
      tags,
    });

    if (error) {
      console.error("[email/client] Resend devolvió error:", error);
      return {
        success: false,
        ok: false,
        error: "transport_error",
        errorMessage: error.message,
      };
    }

    return {
      success: true,
      ok: true,
      messageId: data?.id,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido en sendEmail.";
    console.error("[email/client] Excepción en envío:", err);
    return {
      success: false,
      ok: false,
      error: "internal_error",
      errorMessage: message,
    };
  }
}

/**
 * Fallback básico para convertir HTML a plain-text cuando no hay React.
 * Render más sofisticado lo hace `@react-email/render` con `plainText: true`.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
