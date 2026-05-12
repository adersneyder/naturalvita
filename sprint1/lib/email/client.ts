/**
 * lib/email/client.ts
 *
 * Cliente unificado de envío de email para NaturalVita usando AWS SES.
 * Reemplaza completamente la integración previa con Resend.
 *
 * Mantiene la misma interfaz pública sendEmail() que ya consumen las
 * server actions y plantillas existentes, por lo que la migración es
 * transparente para el resto del código.
 *
 * Modelo de identidades de envío:
 *  - "notificaciones@naturalvita.co"     -> transaccionales (default)
 *  - "hola@news.naturalvita.co"          -> marketing (Savia)
 *
 * Reply-To por defecto: info@naturalvita.co (cara pública del cliente)
 */

import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";
import { render } from "@react-email/render";
import type { ReactElement } from "react";

// ---------- Configuración base ----------

const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";

const ses = new SESv2Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// ---------- Identidades de envío ----------

/**
 * Identidad para emails transaccionales (confirmación de pedido,
 * pagos, envíos, facturas, recuperación de contraseña).
 * Envía desde el dominio raíz, reputación independiente.
 */
const FROM_TRANSACTIONAL =
  process.env.SES_FROM_TRANSACTIONAL ??
  "NaturalVita <notificaciones@naturalvita.co>";

/**
 * Identidad para emails de marketing emitidos por Savia
 * (welcome series, carrito abandonado, recompra, campañas).
 * Envía desde el subdominio news, reputación independiente.
 */
const FROM_MARKETING =
  process.env.SES_FROM_MARKETING ??
  "NaturalVita <hola@news.naturalvita.co>";

/**
 * Reply-To por defecto: las respuestas humanas de los clientes
 * caen siempre en el buzón público info@.
 */
const DEFAULT_REPLY_TO =
  process.env.SES_REPLY_TO ?? "info@naturalvita.co";

// ---------- Tipos ----------

export type EmailCategory = "transactional" | "marketing";

export interface SendEmailInput {
  /** Destinatario (uno o varios) */
  to: string | string[];

  /** Asunto del email */
  subject: string;

  /** Contenido HTML del email */
  html?: string;

  /** Versión texto plano (auto-generada si no se provee) */
  text?: string;

  /** Componente React Email (alternativa a html/text directos) */
  react?: ReactElement;

  /** Categoría del email — determina remitente y reputación */
  category?: EmailCategory;

  /** Reply-To custom (sobrescribe default) */
  replyTo?: string;

  /** From custom (sobrescribe default por categoría) */
  from?: string;

  /** Headers adicionales (List-Unsubscribe, etc.) */
  headers?: Record<string, string>;

  /** Tags para tracking en SES (opcional) */
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ---------- Función principal ----------

/**
 * Envía un email vía AWS SES.
 *
 * Para emails transaccionales: usar category: "transactional" (default).
 * Para emails de Savia/marketing: usar category: "marketing".
 *
 * Ejemplo transaccional:
 * ```ts
 * await sendEmail({
 *   to: customer.email,
 *   subject: "Tu pedido fue confirmado",
 *   react: <OrderPaid order={order} />,
 * });
 * ```
 *
 * Ejemplo marketing (Savia):
 * ```ts
 * await sendEmail({
 *   to: subscriber.email,
 *   subject: "Bienvenido a NaturalVita",
 *   react: <NewsletterWelcome ... />,
 *   category: "marketing",
 *   headers: {
 *     "List-Unsubscribe": `<https://naturalvita.co/api/savia/unsubscribe/${token}>`,
 *     "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
 *   },
 * });
 * ```
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  try {
    // Validación mínima
    if (!input.to || (Array.isArray(input.to) && input.to.length === 0)) {
      return { success: false, error: "Destinatario requerido" };
    }
    if (!input.subject) {
      return { success: false, error: "Asunto requerido" };
    }
    if (!input.html && !input.text && !input.react) {
      return { success: false, error: "Contenido HTML, texto o React requerido" };
    }

    // Resolver contenido HTML y texto
    let htmlBody = input.html;
    let textBody = input.text;

    if (input.react) {
      // react-email v0.x soporta render con opciones { plainText }
      htmlBody = await render(input.react);
      if (!textBody) {
        textBody = await render(input.react, { plainText: true });
      }
    }

    // Resolver remitente según categoría
    const category = input.category ?? "transactional";
    const from =
      input.from ??
      (category === "marketing" ? FROM_MARKETING : FROM_TRANSACTIONAL);

    // Resolver Reply-To
    const replyTo = input.replyTo ?? DEFAULT_REPLY_TO;

    // Normalizar destinatarios
    const toAddresses = Array.isArray(input.to) ? input.to : [input.to];

    // Construir comando SES
    const command: SendEmailCommandInput = {
      FromEmailAddress: from,
      Destination: {
        ToAddresses: toAddresses,
      },
      ReplyToAddresses: [replyTo],
      Content: {
        Simple: {
          Subject: { Data: input.subject, Charset: "UTF-8" },
          Body: {
            ...(htmlBody && {
              Html: { Data: htmlBody, Charset: "UTF-8" },
            }),
            ...(textBody && {
              Text: { Data: textBody, Charset: "UTF-8" },
            }),
          },
          ...(input.headers && {
            Headers: Object.entries(input.headers).map(([name, value]) => ({
              Name: name,
              Value: value,
            })),
          }),
        },
      },
      ...(input.tags && {
        EmailTags: input.tags.map((tag) => ({
          Name: tag.name,
          Value: tag.value,
        })),
      }),
      // Configuration Set: lo configuraremos después para tracking de eventos
      // ConfigurationSetName: "naturalvita-default",
    };

    const result = await ses.send(new SendEmailCommand(command));

    return {
      success: true,
      messageId: result.MessageId,
    };
  } catch (error) {
    console.error("[sendEmail] AWS SES error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al enviar email",
    };
  }
}

// ---------- Helpers retrocompatibles ----------

/**
 * Helper para mantener compatibilidad con código existente que importaba
 * `getResendClient()` o similares. Devuelve la instancia configurada del
 * cliente SES por si se necesita acceso directo.
 */
export function getSESClient(): SESv2Client {
  return ses;
}

/**
 * Verifica que las variables de entorno necesarias estén configuradas.
 * Útil para healthchecks de despliegue.
 */
export function validateEmailConfig(): { valid: boolean; missing: string[] } {
  const required = [
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ];
  const missing = required.filter((key) => !process.env[key]);
  return { valid: missing.length === 0, missing };
}
