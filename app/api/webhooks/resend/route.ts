/**
 * app/api/webhooks/resend/route.ts
 *
 * Webhook receptor de eventos de Resend.
 *
 * MIGRACIÓN SPRINT 2 SESIÓN 0 (14-may-2026):
 *   Sustituye al webhook AWS SNS (`/api/webhooks/aws-sns`) ahora que
 *   volvemos a Resend tras la denegación del sandbox exit por AWS.
 *   Mantenemos el archivo aws-sns intacto pero sin tráfico (la
 *   suscripción SNS quedó dormida) para reapelar en mes 2-3.
 *
 * Eventos procesados:
 *   - email.bounced     → si bounce_type = "hard" añade a email_suppressions
 *   - email.complained  → siempre añade a email_suppressions
 *   - email.delivered   → log estructurado (telemetría)
 *   - email.opened      → reservado para Savia (Sprint 3)
 *   - email.clicked     → reservado para Savia (Sprint 3)
 *
 * Seguridad:
 *   - Verifica firma Svix (svix-id, svix-timestamp, svix-signature)
 *   - Rechaza requests sin secret configurado
 *   - Valida formato del payload antes de procesar
 *
 * Patrón ack-early con Next.js 15 `after()`:
 *   - Validación de firma y parsing dentro del response window
 *   - Procesamiento de suppression / log fuera del window vía `after()`
 *   - Esto evita reintentos por timeout cuando Supabase está lento
 *
 * Configuración en panel de Resend:
 *   1. Resend → Webhooks → Add Endpoint
 *   2. URL: https://naturalvita.co/api/webhooks/resend
 *   3. Events: email.bounced, email.complained, email.delivered,
 *              email.opened, email.clicked
 *   4. Copiar el "Signing Secret" → RESEND_WEBHOOK_SECRET en Vercel
 */

import { NextResponse, after, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Webhook } from "svix";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de eventos Resend
// ─────────────────────────────────────────────────────────────────────────────

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
    // Campos específicos según tipo:
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

// ─────────────────────────────────────────────────────────────────────────────
// Supabase admin (lazy)
// ─────────────────────────────────────────────────────────────────────────────

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[webhooks/resend] Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  _supabaseAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabaseAdmin;
}

// ─────────────────────────────────────────────────────────────────────────────
// Procesadores de eventos (corren via after())
// ─────────────────────────────────────────────────────────────────────────────

async function processBounce(event: ResendEvent) {
  const supabase = getSupabaseAdmin();
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

  const { error } = await supabase
    .from("email_suppressions")
    .upsert(
      {
        email: recipient,
        reason: "bounce",
        source: "resend",
        external_id: event.data.email_id,
        details: event.data.bounce ?? null,
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
  const supabase = getSupabaseAdmin();
  const recipient = event.data.to[0]?.toLowerCase();
  if (!recipient) return;

  const { error } = await supabase
    .from("email_suppressions")
    .upsert(
      {
        email: recipient,
        reason: "complaint",
        source: "resend",
        external_id: event.data.email_id,
        details: event.data.complaint ?? null,
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
  // Por ahora solo log. En Sprint 3 esto persiste en email_events.
  console.info(
    `[webhooks/resend] Delivered: ${event.data.email_id} → ${event.data.to[0]}`,
  );
}

async function processOpenOrClick(event: ResendEvent) {
  // Reservado para Savia (Sprint 3). El tracking propio usa endpoints
  // /api/savia/open y /api/savia/click para tener control total.
  console.info(
    `[webhooks/resend] ${event.type}: ${event.data.email_id} → ${event.data.to[0]}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler principal
// ─────────────────────────────────────────────────────────────────────────────

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

  // Procesamiento diferido fuera del response window (patrón ack-early)
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
          // Solo log por ahora
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
