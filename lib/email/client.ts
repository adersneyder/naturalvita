import { Resend } from "resend";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

/**
 * Wrapper alrededor de Resend SDK.
 *
 * Razones de centralizar:
 *   1. Una sola instancia del cliente Resend reutilizada (singleton).
 *   2. Lectura uniforme de FROM_EMAIL y REPLY_TO desde env vars.
 *   3. Render de templates JSX a HTML en un solo lugar.
 *   4. Logging de errores consistente (no fallamos el flujo si el email
 *      falla — el pedido se procesó OK, el email es notificación).
 */

let _client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY no configurada, emails desactivados");
    return null;
  }
  if (!_client) _client = new Resend(key);
  return _client;
}

export type SendEmailParams = {
  to: string;
  subject: string;
  /** Componente React/JSX (de react-email/components). */
  template: ReactElement;
  /** Tags para tracking en Resend dashboard. */
  tags?: Array<{ name: string; value: string }>;
};

export async function sendEmail(
  params: SendEmailParams,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "Email service not configured" };
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "NaturalVita <info@naturalvita.co>";
  const replyTo =
    process.env.RESEND_REPLY_TO ?? "pedidos@naturalvita.co";

  try {
    const html = await render(params.template);
    const result = await client.emails.send({
      from,
      to: [params.to],
      replyTo,
      subject: params.subject,
      html,
      tags: params.tags,
    });

    if (result.error) {
      console.error("[email] error enviando:", result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[email] excepción enviando:", msg);
    return { ok: false, error: msg };
  }
}
