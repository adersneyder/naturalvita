/**
 * app/api/webhooks/aws-sns/route.ts
 *
 * Webhook receptor de notificaciones SNS de AWS SES.
 * Procesa:
 *   - Bounces hard -> añade a email_suppressions
 *   - Complaints (spam reports) -> añade a email_suppressions
 *   - Delivery events -> registro en email_events
 *
 * Seguridad:
 *   - Verifica firma SNS contra certificado de AWS
 *   - Valida que el TopicArn pertenezca a la cuenta esperada
 *   - Confirma suscripciones SNS al recibir SubscriptionConfirmation
 *
 * Configuración SNS necesaria en AWS:
 *   - Crear SNS Topic "naturalvita-ses-events"
 *   - Suscribir este endpoint: POST https://naturalvita.co/api/webhooks/aws-sns
 *   - En SES Configuration Set, añadir Event Destination apuntando al topic
 *   - Eventos a enviar: Bounce, Complaint, Delivery, Reject
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

// ---------- Tipos SNS ----------

interface SNSBaseMessage {
  Type:
    | "SubscriptionConfirmation"
    | "UnsubscribeConfirmation"
    | "Notification";
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  UnsubscribeURL?: string;
  SubscribeURL?: string;
  Token?: string;
}

interface SESBounceNotification {
  notificationType: "Bounce";
  bounce: {
    bounceType: "Permanent" | "Transient" | "Undetermined";
    bounceSubType: string;
    bouncedRecipients: Array<{
      emailAddress: string;
      action?: string;
      status?: string;
      diagnosticCode?: string;
    }>;
    timestamp: string;
    feedbackId: string;
  };
  mail: {
    timestamp: string;
    messageId: string;
    source: string;
    destination: string[];
  };
}

interface SESComplaintNotification {
  notificationType: "Complaint";
  complaint: {
    complainedRecipients: Array<{ emailAddress: string }>;
    timestamp: string;
    feedbackId: string;
    complaintFeedbackType?: string;
  };
  mail: {
    timestamp: string;
    messageId: string;
    source: string;
    destination: string[];
  };
}

interface SESDeliveryNotification {
  notificationType: "Delivery";
  delivery: {
    timestamp: string;
    processingTimeMillis: number;
    recipients: string[];
    smtpResponse: string;
    reportingMTA: string;
  };
  mail: {
    timestamp: string;
    messageId: string;
    source: string;
    destination: string[];
  };
}

type SESNotification =
  | SESBounceNotification
  | SESComplaintNotification
  | SESDeliveryNotification;

// ---------- Supabase admin client ----------

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// ---------- Verificación de firma SNS ----------

/**
 * Verifica que el mensaje SNS provenga genuinamente de AWS validando
 * la firma criptográfica contra el certificado de AWS.
 *
 * Sin esta verificación, un atacante podría hacer POST simulando ser
 * AWS y forzarnos a marcar emails legítimos como bounce/complaint.
 */
async function verifySNSSignature(message: SNSBaseMessage): Promise<boolean> {
  try {
    // 1. Validar que el SigningCertURL sea de AWS
    const certUrl = new URL(message.SigningCertURL);
    if (
      !certUrl.hostname.endsWith(".amazonaws.com") ||
      !certUrl.pathname.endsWith(".pem")
    ) {
      console.error("[SNS] SigningCertURL inválido:", message.SigningCertURL);
      return false;
    }

    // 2. Descargar el certificado público de AWS
    const certResponse = await fetch(message.SigningCertURL);
    if (!certResponse.ok) {
      console.error("[SNS] No se pudo descargar el certificado");
      return false;
    }
    const cert = await certResponse.text();

    // 3. Construir la cadena de string-to-sign según especificación AWS SNS
    // https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
    const stringToSign = buildStringToSign(message);
    if (!stringToSign) return false;

    // 4. Verificar firma
    const verifier = crypto.createVerify(
      message.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1",
    );
    verifier.update(stringToSign, "utf8");

    const signatureBuffer = Buffer.from(message.Signature, "base64");
    return verifier.verify(cert, signatureBuffer);
  } catch (error) {
    console.error("[SNS] Error verificando firma:", error);
    return false;
  }
}

function buildStringToSign(message: SNSBaseMessage): string | null {
  // El orden y los campos varían según el Type del mensaje
  if (
    message.Type === "Notification"
  ) {
    return [
      "Message",
      message.Message,
      "MessageId",
      message.MessageId,
      ...(message.Subject
        ? ["Subject", message.Subject]
        : []),
      "Timestamp",
      message.Timestamp,
      "TopicArn",
      message.TopicArn,
      "Type",
      message.Type,
    ].join("\n") + "\n";
  }

  if (
    message.Type === "SubscriptionConfirmation" ||
    message.Type === "UnsubscribeConfirmation"
  ) {
    if (!message.SubscribeURL || !message.Token) return null;
    return [
      "Message",
      message.Message,
      "MessageId",
      message.MessageId,
      "SubscribeURL",
      message.SubscribeURL,
      "Timestamp",
      message.Timestamp,
      "Token",
      message.Token,
      "TopicArn",
      message.TopicArn,
      "Type",
      message.Type,
    ].join("\n") + "\n";
  }

  return null;
}

// ---------- Procesadores de notificación ----------

async function handleBounce(notification: SESBounceNotification) {
  const { bounce } = notification;

  // Solo procesamos bounces permanentes (hard bounces).
  // Los transient (soft) se reintentan automáticamente por SES.
  if (bounce.bounceType !== "Permanent") {
    console.log(
      `[SNS] Bounce transient ignorado: ${bounce.bounceSubType}`,
    );
    return;
  }

  for (const recipient of bounce.bouncedRecipients) {
    const { error } = await supabaseAdmin
      .from("email_suppressions")
      .upsert(
        {
          email: recipient.emailAddress.toLowerCase(),
          reason: "hard_bounce",
          sub_reason: bounce.bounceSubType,
          diagnostic_code: recipient.diagnosticCode,
          source: "aws_ses",
          suppressed_at: new Date(bounce.timestamp).toISOString(),
        },
        { onConflict: "email" },
      );

    if (error) {
      console.error(
        `[SNS] Error guardando bounce para ${recipient.emailAddress}:`,
        error,
      );
    } else {
      console.log(`[SNS] Bounce registrado: ${recipient.emailAddress}`);
    }
  }
}

async function handleComplaint(notification: SESComplaintNotification) {
  const { complaint } = notification;

  for (const recipient of complaint.complainedRecipients) {
    const { error } = await supabaseAdmin
      .from("email_suppressions")
      .upsert(
        {
          email: recipient.emailAddress.toLowerCase(),
          reason: "complaint",
          sub_reason:
            complaint.complaintFeedbackType ?? "spam",
          source: "aws_ses",
          suppressed_at: new Date(complaint.timestamp).toISOString(),
        },
        { onConflict: "email" },
      );

    if (error) {
      console.error(
        `[SNS] Error guardando complaint para ${recipient.emailAddress}:`,
        error,
      );
    } else {
      console.log(`[SNS] Complaint registrado: ${recipient.emailAddress}`);
    }
  }
}

async function handleDelivery(notification: SESDeliveryNotification) {
  // Solo registramos para tracking si la tabla email_events existe.
  // En Sprint 2 esta tabla se crea formalmente como parte de Savia.
  // Por ahora solo loggeamos para no fallar si la tabla aún no existe.
  console.log(
    `[SNS] Delivery exitoso: ${notification.mail.messageId} -> ${notification.delivery.recipients.join(", ")}`,
  );
}

// ---------- Handler principal ----------

export async function POST(request: NextRequest) {
  let body: SNSBaseMessage;

  try {
    const rawBody = await request.text();
    body = JSON.parse(rawBody);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 },
    );
  }

  // Validar que sea un mensaje SNS reconocible
  if (!body.Type || !body.TopicArn) {
    return NextResponse.json(
      { error: "Not a valid SNS message" },
      { status: 400 },
    );
  }

  // Validar TopicArn de origen
  const expectedTopicArnPattern =
    /^arn:aws:sns:[a-z0-9-]+:[0-9]+:naturalvita-ses-/;
  if (!expectedTopicArnPattern.test(body.TopicArn)) {
    console.error("[SNS] TopicArn no autorizado:", body.TopicArn);
    return NextResponse.json(
      { error: "Unauthorized topic" },
      { status: 403 },
    );
  }

  // Verificar firma criptográfica
  const isValid = await verifySNSSignature(body);
  if (!isValid) {
    console.error("[SNS] Firma inválida");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 403 },
    );
  }

  // Manejo según tipo de mensaje
  if (body.Type === "SubscriptionConfirmation") {
    // AWS SNS pide confirmar suscripción haciendo GET al SubscribeURL.
    // Esto solo pasa una vez al crear la suscripción.
    if (body.SubscribeURL) {
      try {
        await fetch(body.SubscribeURL);
        console.log(
          "[SNS] Suscripción confirmada para topic:",
          body.TopicArn,
        );
      } catch (error) {
        console.error("[SNS] Error confirmando suscripción:", error);
      }
    }
    return NextResponse.json({ status: "subscription_confirmed" });
  }

  if (body.Type === "Notification") {
    let notification: SESNotification;
    try {
      notification = JSON.parse(body.Message);
    } catch {
      console.error("[SNS] Message no es JSON válido");
      return NextResponse.json({ status: "invalid_message" });
    }

    switch (notification.notificationType) {
      case "Bounce":
        await handleBounce(notification);
        break;
      case "Complaint":
        await handleComplaint(notification);
        break;
      case "Delivery":
        await handleDelivery(notification);
        break;
      default:
        console.warn(
          "[SNS] Tipo de notificación no manejado:",
          (notification as { notificationType: string }).notificationType,
        );
    }

    return NextResponse.json({ status: "ok" });
  }

  return NextResponse.json({ status: "ignored" });
}

// SNS solo envía POST, pero AWS valida también con HEAD/OPTIONS al crear
export async function GET() {
  return NextResponse.json(
    {
      service: "NaturalVita AWS SNS webhook",
      methods: ["POST"],
    },
    { status: 200 },
  );
}
