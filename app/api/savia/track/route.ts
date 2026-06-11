import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, trackerRatelimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseUserAgent } from "@/lib/savia/user-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ingesta de eventos de "Sembrado" — el tracker propio.
 *
 * El cliente envía un payload por evento (no batching en MVP — la red
 * de un cliente normal absorbe perfectamente 20-30 POSTs en una sesión
 * de browsing). Si volumen llegara a doler, el cliente puede agrupar
 * y el endpoint detectar array vs objeto sin breaking change.
 *
 * Modelo de consent (ver lib/legal/use-consent.ts):
 *   header `x-nv-consent: anonymous` (o ausente) → no se guarda IP,
 *     ip_address queda null, customer_id queda null incluso si hay
 *     sesión, browser/os/device_type quedan null.
 *   header `x-nv-consent: identified` → se enriquece con IP, geo
 *     inferida (Vercel headers), parsing del UA y vinculación a la
 *     sesión de Supabase si la hay.
 */

const TrackSchema = z.object({
  visitor_id: z.string().min(8).max(64),
  session_id: z.string().min(8).max(64),
  event_type: z.string().min(1).max(64),
  event_props: z.record(z.string(), z.unknown()).optional(),
  page_path: z.string().min(1).max(2048),
  page_title: z.string().max(512).optional(),
  referrer: z.string().max(2048).optional(),
  utm: z
    .object({
      source: z.string().max(128).optional(),
      medium: z.string().max(128).optional(),
      campaign: z.string().max(128).optional(),
      term: z.string().max(128).optional(),
      content: z.string().max(128).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  // Rate-limit por visitor_id si lo tenemos, por IP como fallback. Esto
  // evita que un único atacante moliendo el endpoint desde 1 visitor_id
  // se vea limitado pero otros visitantes legítimos detrás del mismo NAT
  // sigan funcionando.
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = TrackSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const event = parsed.data;

  const rlKey = event.visitor_id || getClientIp(req);
  const { success } = await trackerRatelimit.limit(rlKey);
  if (!success) {
    // 204 silencioso: no queremos darle señal al atacante de que está
    // siendo limitado. La pérdida de un evento aquí es aceptable.
    return new NextResponse(null, { status: 204 });
  }

  const consentMode = req.headers.get("x-nv-consent");
  const isIdentified = consentMode === "identified";

  // Enriquecimiento solo cuando hay consent.
  let ip: string | null = null;
  let country: string | null = null;
  let region: string | null = null;
  let city: string | null = null;
  let device_type: string | null = null;
  let browser: string | null = null;
  let os: string | null = null;
  let customerId: string | null = null;

  if (isIdentified) {
    ip = getClientIp(req);
    // Headers de geo de Vercel — null si estamos fuera de Vercel.
    country = req.headers.get("x-vercel-ip-country");
    region = req.headers.get("x-vercel-ip-country-region");
    city = req.headers.get("x-vercel-ip-city");
    // Decode percent-encoded (Vercel envía la ciudad URL-encoded).
    if (city) {
      try {
        city = decodeURIComponent(city);
      } catch {
        // Si decode falla, dejamos el valor crudo.
      }
    }
    const ua = parseUserAgent(req.headers.get("user-agent"));
    device_type = ua.device_type;
    browser = ua.browser;
    os = ua.os;

    // customer_id solo si la sesión SSR está activa y consent=identified.
    try {
      const sb = await createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      customerId = user?.id ?? null;
    } catch {
      // Si el cookie de sesión está mal, seguimos sin customer_id.
    }
  }

  const admin = createAdminClient();
  await admin.from("tracking_events").insert({
    visitor_id: event.visitor_id,
    session_id: event.session_id,
    customer_id: customerId,
    event_type: event.event_type,
    event_props: (event.event_props ?? {}) as never,
    page_path: event.page_path,
    page_title: event.page_title ?? null,
    referrer: event.referrer ?? null,
    utm_source: event.utm?.source ?? null,
    utm_medium: event.utm?.medium ?? null,
    utm_campaign: event.utm?.campaign ?? null,
    utm_term: event.utm?.term ?? null,
    utm_content: event.utm?.content ?? null,
    identified: isIdentified,
    ip_address: ip,
    country,
    region,
    city,
    device_type,
    browser,
    os,
  });

  return new NextResponse(null, { status: 204 });
}
