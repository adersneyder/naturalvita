/**
 * app/api/savia/cart-detect/route.ts
 *
 * Cron de Savia que detecta carritos abandonados y los enrola en el flow
 * 'cart-abandoned'. Se invoca cada 30 minutos por pg_cron
 * (savia_trigger_cart_detect).
 *
 * Auth: Bearer SAVIA_DISPATCH_TOKEN (el mismo del dispatcher; un solo
 * secreto que rota junto, menos superficie operacional).
 *
 * Idempotencia: el enrolador usa `idempotency_key = cart-abandoned:{step}:{refId}`,
 * así que aunque un mismo carrito sea candidato varias corridas seguidas,
 * solo se encola una vez. Si el carrito sigue siendo candidato en el
 * próximo tick (porque cumplía la ventana 1h-7d), simplemente no se hace
 * nada nuevo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { enrollInFlow } from "@/lib/savia/enroll";
import { detectAbandonedCarts } from "@/lib/savia/cart-detection";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FLOW = "cart-abandoned";

/**
 * Genera un token de "unsubscribe" seguro para correos a un email cuando
 * todavía no hay newsletter_subscriber (caso anónimo del checkout). Si el
 * suscriptor ya existe, reusamos su token real. Esto asegura que el link
 * de baja siempre funcione, sin crear un suscriptor sin consentimiento.
 */
async function resolveUnsubscribeToken(email: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("newsletter_subscribers")
    .select("unsubscribe_token")
    .eq("email", email)
    .maybeSingle();
  if (data?.unsubscribe_token) return data.unsubscribe_token as string;
  // Token efímero que igual se valida server-side en /api/savia/unsubscribe:
  // si no existe en BD, igual añadimos el email a email_suppressions por
  // best-effort. La página GET muestra el mensaje genérico.
  return "anon-" + Buffer.from(email).toString("base64url");
}

export async function POST(request: NextRequest) {
  const token = process.env.SAVIA_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const candidates = await detectAbandonedCarts(100);

  let enrolled = 0;
  let skipped = 0;
  let suppressed = 0;
  let alreadyEnrolled = 0;

  for (const c of candidates) {
    const unsubscribeToken = await resolveUnsubscribeToken(c.email);
    const result = await enrollInFlow(
      FLOW,
      {
        email: c.email,
        unsubscribeToken,
        customerName: c.customerName,
      },
      {
        // Render dinámico (#4): el dispatcher al enviar usará los items del
        // carrito tal como estaban al momento de detectar. Si el catálogo
        // cambió, el correo refleja el estado del carrito detectado.
        items: c.items,
        source: c.source,
        refId: c.refId,
      },
      { enrollmentRef: c.refId },
    );

    if (!result.ok) {
      if (result.reason === "suppressed") suppressed++;
      else skipped++;
      continue;
    }
    if (result.enrolled === 0) alreadyEnrolled++;
    else enrolled++;
  }

  return NextResponse.json({
    status: "ok",
    candidates: candidates.length,
    enrolled,
    alreadyEnrolled,
    suppressed,
    skipped,
  });
}
