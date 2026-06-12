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
 * Acepta DOS formatos por compatibilidad:
 *   1) Un evento suelto (legacy / fetch individual del SDK)
 *   2) { events: [...] }  (batch del SDK con buffer + sendBeacon)
 *
 * sendBeacon no permite headers custom — por eso `consent_mode` puede
 * venir en cada evento del body. El header `x-nv-consent` sigue siendo
 * aceptado como fallback para llamadas que ya estaban en producción
 * antes de Fase 0.5.
 *
 * Eventos especiales:
 *   - "identify": event_props.customer_id es un uuid. Si consent es
 *     identified, ejecuta rewire_visitor_to_customer y guarda el evento
 *     como cualquier otro (con customer_id vinculado).
 *
 * PROMESA al cliente: fire-and-forget. Cualquier error interno (schema
 * cache stale, Upstash caído, Supabase con incidente) NO se propaga al
 * navegador — el endpoint siempre responde 204 y loguea con detalle
 * para diagnóstico en Vercel logs. Perder un evento es preferible a
 * romper la consola del usuario con un 500.
 */

const SingleSchema = z.object({
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
  utm_first: z
    .object({
      source: z.string().max(128).optional(),
      medium: z.string().max(128).optional(),
      campaign: z.string().max(128).optional(),
    })
    .optional(),
  client_ts: z.string().max(64).optional(),
  consent_mode: z.enum(["anonymous", "identified"]).optional(),
});

const BatchSchema = z.object({
  events: z.array(SingleSchema).min(1).max(50),
});

type ParsedEvent = z.infer<typeof SingleSchema>;

export async function POST(req: Request) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return new NextResponse(null, { status: 204 });
    }

    let events: ParsedEvent[];
    if (payload && typeof payload === "object" && "events" in payload) {
      const parsed = BatchSchema.safeParse(payload);
      if (!parsed.success) {
        console.warn("[track] batch schema invalid", parsed.error.issues[0]);
        return new NextResponse(null, { status: 204 });
      }
      events = parsed.data.events;
    } else {
      const parsed = SingleSchema.safeParse(payload);
      if (!parsed.success) {
        console.warn("[track] single schema invalid", parsed.error.issues[0]);
        return new NextResponse(null, { status: 204 });
      }
      events = [parsed.data];
    }

    // Rate-limit. Si Upstash no está configurado o falla en runtime, lo
    // logueamos y dejamos pasar — no es razón para perder el evento.
    const rlKey = events[0]?.visitor_id || getClientIp(req);
    try {
      const { success } = await trackerRatelimit.limit(rlKey);
      if (!success) {
        return new NextResponse(null, { status: 204 });
      }
    } catch (rlErr) {
      console.warn("[track] ratelimit unavailable", rlErr);
    }

    const headerConsent = req.headers.get("x-nv-consent");
    const ip = getClientIp(req);
    const ua = parseUserAgent(req.headers.get("user-agent"));
    const headerCountry = req.headers.get("x-vercel-ip-country");
    const headerRegion = req.headers.get("x-vercel-ip-country-region");
    let headerCity = req.headers.get("x-vercel-ip-city");
    if (headerCity) {
      try {
        headerCity = decodeURIComponent(headerCity);
      } catch {
        /* keep raw */
      }
    }

    let sessionCustomerId: string | null | undefined = undefined;
    async function resolveSessionCustomerId() {
      if (sessionCustomerId !== undefined) return sessionCustomerId;
      try {
        const sb = await createClient();
        const {
          data: { user },
        } = await sb.auth.getUser();
        sessionCustomerId = user?.id ?? null;
      } catch (authErr) {
        console.warn("[track] auth.getUser failed", authErr);
        sessionCustomerId = null;
      }
      return sessionCustomerId;
    }

    const admin = createAdminClient();
    const rows = [];

    for (const e of events) {
      const consentMode = e.consent_mode ?? headerConsent ?? "anonymous";
      const isIdentified = consentMode === "identified";

      let customerId: string | null = null;
      if (isIdentified) {
        customerId = await resolveSessionCustomerId();
        if (
          e.event_type === "identify" &&
          typeof e.event_props?.customer_id === "string"
        ) {
          // Confianza: usamos el customer_id de la SESIÓN SSR, no el del
          // cliente (no falsificable). Si la RPC no existe aún (schema
          // cache), logueamos y seguimos.
          const targetCustomerId = customerId;
          if (targetCustomerId) {
            try {
              await admin.rpc("rewire_visitor_to_customer", {
                p_visitor_id: e.visitor_id,
                p_customer_id: targetCustomerId,
              });
            } catch (rpcErr) {
              console.warn("[track] rewire RPC failed", rpcErr);
            }
          }
        }
      }

      rows.push({
        visitor_id: e.visitor_id,
        session_id: e.session_id,
        customer_id: customerId,
        event_type: e.event_type,
        event_props: (e.event_props ?? {}) as never,
        page_path: e.page_path,
        page_title: e.page_title ?? null,
        referrer: e.referrer ?? null,
        utm_source: e.utm?.source ?? null,
        utm_medium: e.utm?.medium ?? null,
        utm_campaign: e.utm?.campaign ?? null,
        utm_term: e.utm?.term ?? null,
        utm_content: e.utm?.content ?? null,
        utm_first_source: e.utm_first?.source ?? null,
        utm_first_medium: e.utm_first?.medium ?? null,
        utm_first_campaign: e.utm_first?.campaign ?? null,
        identified: isIdentified,
        ip_address: isIdentified ? ip : null,
        country: isIdentified ? headerCountry : null,
        region: isIdentified ? headerRegion : null,
        city: isIdentified ? headerCity : null,
        device_type: isIdentified ? ua.device_type : null,
        browser: isIdentified ? ua.browser : null,
        os: isIdentified ? ua.os : null,
      });
    }

    // Insert en bloque. Cualquier error (cache stale, RLS, columna
    // desconocida) se loguea con detalle y devuelve 204 — el cliente no
    // ve error. Cuando se resuelva, los próximos eventos entran.
    const { error: insertErr } = await admin
      .from("tracking_events")
      .insert(rows);
    if (insertErr) {
      console.error("[track] insert failed", {
        message: insertErr.message,
        code: insertErr.code,
        details: insertErr.details,
        hint: insertErr.hint,
        rows: rows.length,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[track] unexpected failure", err);
    return new NextResponse(null, { status: 204 });
  }
}
