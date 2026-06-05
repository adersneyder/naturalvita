/**
 * lib/savia/transport/resend.ts
 *
 * Adapter de transporte de Savia.
 *
 * Savia decide (flows, segmentacion, triggers); Resend entrega. Este
 * adapter es la frontera: traduce un SaviaMessage a una llamada de
 * sendEmail() con categoria "marketing", de modo que:
 *   - El envio sale por la API key dedicada de Savia (RESEND_SAVIA_API_KEY),
 *     con reputacion de subdominio aislada (lo resuelve lib/email/client).
 *   - El From es hola@news.naturalvita.co; el Reply-To, info@naturalvita.co.
 *   - Se inyecta List-Unsubscribe one-click (RFC 8058) con mailto + https.
 *   - Se adjuntan tags de flow/step/job para correlacionar email_events.
 *
 * El reintento ante 429 (rate limit) vive en lib/email/client.ts, en la
 * frontera HTTP real, por lo que este adapter se mantiene delgado.
 */

import { sendEmail, type SendEmailResult } from "@/lib/email/client";
import { COMPANY } from "@/lib/legal/company-info";
import type { ReactElement } from "react";

export interface SaviaMessage {
  /** Email del destinatario. */
  to: string;

  /** Asunto del email. */
  subject: string;

  /** Contenido React (se renderiza a HTML + texto plano en el client). */
  react: ReactElement;

  /** Token unico del suscriptor para el link de unsubscribe. */
  unsubscribeToken: string;

  /** ID del flow que origino el envio (welcome-series, cart_abandoned, ...). */
  flowId?: string;

  /** ID del step dentro del flow. */
  flowStepId?: string;

  /** ID del job en email_jobs (para correlacionar eventos). */
  jobId?: string;

  /** Tags personalizados adicionales. */
  tags?: Record<string, string>;
}

export interface SaviaResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** True si el envío se bloqueó por estar en la lista de suppression. */
  suppressed?: boolean;
}

/**
 * Envia un email de marketing siguiendo las buenas practicas de
 * deliverability. Devuelve un SaviaResult plano para que el dispatcher
 * lo persista en email_jobs / email_events.
 */
export async function saviaSendEmail(msg: SaviaMessage): Promise<SaviaResult> {
  // List-Unsubscribe RFC 8058: mailto + https one-click. El POST al endpoint
  // https da de baja sin interaccion del usuario (Gmail/Outlook lo invocan).
  const httpUnsubscribe = `${COMPANY.url}/api/savia/unsubscribe?token=${encodeURIComponent(msg.unsubscribeToken)}`;
  const mailtoUnsubscribe = `mailto:${COMPANY.email.marketing}?subject=unsubscribe`;

  const headers: Record<string, string> = {
    "List-Unsubscribe": `<${mailtoUnsubscribe}>, <${httpUnsubscribe}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };

  // Tags para correlacionar eventos del webhook con flow/step/job.
  const tags = [
    { name: "category", value: "marketing" },
    ...(msg.flowId ? [{ name: "flow", value: msg.flowId }] : []),
    ...(msg.flowStepId ? [{ name: "step", value: msg.flowStepId }] : []),
    ...(msg.jobId ? [{ name: "job", value: msg.jobId }] : []),
    ...Object.entries(msg.tags ?? {}).map(([name, value]) => ({
      name,
      value,
    })),
  ];

  const result: SendEmailResult = await sendEmail({
    to: msg.to,
    subject: msg.subject,
    react: msg.react,
    category: "marketing",
    headers,
    tags,
  });

  return {
    success: result.success,
    messageId: result.messageId,
    error: result.success ? undefined : (result.errorMessage ?? result.error),
    suppressed: result.error === "suppressed",
  };
}
