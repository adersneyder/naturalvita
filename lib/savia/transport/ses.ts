/**
 * lib/savia/transport/ses.ts
 *
 * Adapter de transporte de Savia hacia AWS SES.
 *
 * Savia (Sprint 2+) es el sistema propio de marketing de NaturalVita
 * que decide qué emails enviar, a quién, cuándo. AWS SES es el cartero
 * que entrega físicamente esos emails.
 *
 * Este adapter:
 *   - Recibe órdenes de envío desde el engine de Savia
 *   - Las traduce a llamadas a sendEmail() con categoría marketing
 *   - Añade headers obligatorios para marketing (List-Unsubscribe RFC 8058)
 *   - Inyecta tags de tracking de SES para reporting
 *
 * En Sprint 2 se conectará con email_jobs (tabla de cola) y el cron
 * de savia-dispatch que procesa la cola cada minuto.
 */

import { sendEmail, type SendEmailResult } from "@/lib/email/client";
import { COMPANY } from "@/lib/legal/company-info";
import type { ReactElement } from "react";

export interface SaviaMessage {
  /** Email del destinatario */
  to: string;

  /** Asunto del email */
  subject: string;

  /** Contenido React (preferido) */
  react: ReactElement;

  /** Token único del suscriptor para link de unsubscribe */
  unsubscribeToken: string;

  /** ID del flow que originó el envío (welcome, cart_abandoned, etc.) */
  flowId: string;

  /** ID del step dentro del flow */
  flowStepId?: string;

  /** ID del job en la tabla email_jobs (para tracking de eventos) */
  jobId?: string;

  /** Tags personalizados adicionales */
  tags?: Record<string, string>;
}

/**
 * Envía un email de marketing vía AWS SES siguiendo todas las buenas
 * prácticas de deliverability:
 *   - List-Unsubscribe header con one-click (RFC 8058)
 *   - List-Unsubscribe-Post para opt-out automático
 *   - Tags SES para correlacionar eventos con flow/job
 *   - Reply-To al email público (no rebota a notificaciones@)
 */
export async function saviaSendEmail(
  msg: SaviaMessage,
): Promise<SendEmailResult> {
  const unsubscribeUrl = `${COMPANY.url}/newsletter/desuscribir/${msg.unsubscribeToken}`;

  // Headers obligatorios para deliverability en marketing
  const headers: Record<string, string> = {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };

  // Tags SES para tracking en eventos
  const tags = [
    { name: "category", value: "marketing" },
    { name: "flow", value: msg.flowId },
    ...(msg.flowStepId
      ? [{ name: "step", value: msg.flowStepId }]
      : []),
    ...(msg.jobId ? [{ name: "job", value: msg.jobId }] : []),
    ...Object.entries(msg.tags ?? {}).map(([name, value]) => ({
      name,
      value,
    })),
  ];

  return sendEmail({
    to: msg.to,
    subject: msg.subject,
    react: msg.react,
    category: "marketing",
    headers,
    tags,
  });
}
