/**
 * app/api/webhooks/resend/route.ts
 *
 * Webhook receptor de eventos de Resend.
 *
 * Eventos procesados:
 *   - email.bounced     → si bounce_type = "hard" añade a email_suppressions
 *   - email.complained  → siempre añade a email_suppressions
 *   - email.delivered   → log estructurado (telemetría)
 *   - email.opened      → reservado para Savia (Sprint 3)
 *   - email.clicked     → reservado para Savia (Sprint 3)
 *
 * Seguridad: verifica firma Svix (svix-id, svix-timestamp, svix-signature).
 *
 * Patrón ack-early con Next.js 15 `after()`:
 *   Validación de firma dentro del response window. Procesamiento de
 *   suppression / log fuera del window vía `after()`. Evita reintentos
 *   por timeout cuando Supabase está lento.
 */

import { NextResponse, after, type NextRequest } from "next/server";
import { Webhook } from "svix";
import { createAdminClient } from "@/lib/supabase/admin";

type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.complained"
  | "email.bounced"
  | "email.opened"
  | "email.clicked"
  | "email.failed";

interface ResendEvent {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    bounce_type?: "hard" | "soft" | "undetermined";
    bounce?: {
      type?: string;
      subType?: string;
      message?: string;
    };
    complaint?: {
      type?: string;
      feedback_type?: string;
    };
    click?: {
      link: string;
      timestamp: string;
    };
    tags?: Array<{ name: string; value: string }>;
  };
}

async function processBounce(event: ResendEvent) {
  const supabase = createAdminClient();
  const recipient = event.data.to[0]?.toLowerCase();
  if (!recipient) return;

  const isHard =
    event.data.bounce_type === "hard" ||
    event.data.bounce?.type?.toLowerCase() === "permanent";

  if (!isHard) {
    console.info(
      `[webhooks/resend] Soft bounce ignorado para ${recipient} (email_id=${event.data.email_id})`,
    );
    return;
  }

  const diagnosticCode =
    event.data.bounce?.message ?? event.data.bounce?.subType ?? null;
  const subReason = event.data.bounce?.subType ?? null;
  const notes = `Resend email_id: ${event.data.email_id}`;

  const { error } = await supabase.from("email_suppressions").upsert(
    {
      email: recipient,
      reason: "bounce",
      source: "resend",
      sub_reason: subReason,
      diagnostic_code: diagnosticCode,
      notes,
    },
    { onConflict: "email" },
  );

  if (error) {
    console.error(
      `[webhooks/resend] Error añadiendo bounce suppression para ${recipient}:`,
      error.message,
    );
  } else {
    console.info(`[webhooks/resend] Hard bounce suppressed: ${recipient}`);
  }
}

async function processComplaint(event: ResendEvent) {
  const supabase = createAdminClient();
  const recipient = event.data.to[0]?.toLowerCase();
  if (!recipient) return;

  const subReason =
    event.data.complaint?.feedback_type ??
    event.data.complaint?.type ??
    null;
  const notes = `Resend email_id: ${event.data.email_id}`;

  const { error } = await supabase.from("email_suppressions").upsert(
    {
      email: recipient,
      reason: "complaint",
      source: "resend",
      sub_reason: subReason,
      notes,
    },
    { onConflict: "email" },
  );

  if (error) {
    console.error(
      `[webhooks/resend] Error añadiendo complaint suppression para ${recipient}:`,
      error.message,
    );
  } else {
    console.warn(`[webhooks/resend] Complaint suppressed: ${recipient}`);
  }
}

async function processDelivery(event: ResendEvent) {
  console.info(
    `[webhooks/resend] Delivered: ${event.data.email_id} → ${event.data.to[0]}`,
  );
}

async function processOpenOrClick(event: ResendEvent) {
  console.info(
    `[webhooks/resend] ${event.type}: ${event.data.email_id} → ${event.data.to[0]}`,
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhooks/resend] RESEND_WEBHOOK_SECRET no configurado.");
    return NextResponse.json(
      { error: "webhook_not_configured" },
      { status: 500 },
    );
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "missing_signature_headers" },
      { status: 400 },
    );
  }

  const payload = await request.text();

  let event: ResendEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendEvent;
  } catch (err) {
    console.warn(
      "[webhooks/resend] Firma inválida:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  after(async () => {
    try {
      switch (event.type) {
        case "email.bounced":
          await processBounce(event);
          break;
        case "email.complained":
          await processComplaint(event);
          break;
        case "email.delivered":
          await processDelivery(event);
          break;
        case "email.opened":
        case "email.clicked":
          await processOpenOrClick(event);
          break;
        case "email.sent":
        case "email.delivery_delayed":
        case "email.failed":
          console.info(
            `[webhooks/resend] ${event.type}: ${event.data.email_id}`,
          );
          break;
        default:
          console.warn(
            `[webhooks/resend] Tipo de evento no manejado: ${(event as ResendEvent).type}`,
          );
      }
    } catch (err) {
      console.error("[webhooks/resend] Error procesando evento:", err);
    }
  });

  return NextResponse.json({ status: "ok" });
}

export async function GET() {
  return NextResponse.json(
    {
      service: "NaturalVita Resend webhook",
      methods: ["POST"],
      events: [
        "email.bounced",
        "email.complained",
        "email.delivered",
        "email.opened",
        "email.clicked",
      ],
    },
    { status: 200 },
  );
}
