"use client";

/**
 * SDK del navegador de "Sembrado" — el tracker propio de NaturalVita.
 *
 * Responsabilidades:
 *  - Mantener `visitor_id` (persistente entre sesiones) y `session_id`
 *    (se renueva cada 30 min de inactividad) en localStorage.
 *  - Decidir el modo de consent leyendo el state del módulo
 *    `lib/cart/use-consent.ts`:
 *      sin decisión → anónimo (no hay datos personales)
 *      analytics=false → anónimo
 *      analytics=true → identificado
 *  - Exponer `track(eventType, props)` para eventos custom.
 *  - Auto-enviar `page_view` al inicializar y en cada cambio de ruta.
 *  - Captura UTM desde la URL en el primer page_view de la sesión y los
 *    mantiene para los eventos siguientes (último-touch dentro de la
 *    sesión, ese es el modelo que casi todas las herramientas usan).
 *
 * SIN librerías de tracking de terceros: cero scripts externos, cero
 * cookies, cero fingerprinting. visitor_id es un random hex de 64 bits
 * — suficiente para ser único entre los visitantes del sitio sin ser
 * un identificador "personal" reconocible.
 */

import { readConsent } from "@/lib/cart/use-consent";
import type { TrackEventInput } from "./tracker-types";

const VISITOR_KEY = "nv:visitor:v1";
const SESSION_KEY = "nv:session:v1";
const SESSION_TTL_MS = 30 * 60 * 1000;
const UTM_KEY = "nv:utm:v1";

type StoredSession = {
  id: string;
  last_event_at: number;
};

type StoredUtm = NonNullable<TrackEventInput["utm"]> & {
  captured_at: number;
};

function randomId(): string {
  // 8 bytes = 16 hex chars. Suficiente: con 10k visitantes hay 1 colisión
  // cada ~2^32 generaciones, no es problema.
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8) return existing;
  } catch {
    // localStorage bloqueado (Safari ITP, modo incógnito) — generamos
    // un id efímero por carga de página. La sesión seguirá funcionando.
  }
  const id = randomId();
  try {
    localStorage.setItem(VISITOR_KEY, id);
  } catch {
    /* same */
  }
  return id;
}

function getOrCreateSessionId(): string {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredSession;
      if (parsed.id && now - parsed.last_event_at < SESSION_TTL_MS) {
        parsed.last_event_at = now;
        localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
        return parsed.id;
      }
    }
  } catch {
    /* fall through */
  }
  const fresh: StoredSession = { id: randomId(), last_event_at: now };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
  } catch {
    /* same */
  }
  return fresh.id;
}

function bumpSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as StoredSession;
    parsed.last_event_at = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
  } catch {
    /* nothing to do */
  }
}

function captureUtm(): StoredUtm | null {
  if (typeof location === "undefined") return null;
  const params = new URLSearchParams(location.search);
  const fields: Array<keyof Omit<StoredUtm, "captured_at">> = [
    "source",
    "medium",
    "campaign",
    "term",
    "content",
  ];
  const utm: Partial<StoredUtm> = {};
  let found = false;
  for (const f of fields) {
    const v = params.get(`utm_${f}`);
    if (v) {
      utm[f] = v.slice(0, 128);
      found = true;
    }
  }
  if (!found) return null;
  const stored: StoredUtm = { ...(utm as Omit<StoredUtm, "captured_at">), captured_at: Date.now() };
  try {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(stored));
  } catch {
    /* same */
  }
  return stored;
}

function readStoredUtm(): StoredUtm | null {
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUtm;
  } catch {
    return null;
  }
}

function decideConsentMode(): "anonymous" | "identified" {
  const consent = readConsent();
  return consent?.analytics === true ? "identified" : "anonymous";
}

/**
 * Envía un evento al endpoint. Usa `sendBeacon` cuando el documento se
 * está descargando (cambio de página, cierre de pestaña) para evitar
 * perder eventos por el `fetch` abortado. Fallback a `fetch` keepalive.
 */
function dispatch(payload: TrackEventInput) {
  const url = "/api/savia/track";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-nv-consent": payload.consent_mode,
  };
  const body = JSON.stringify(payload);

  // En transiciones de ruta de Next.js no se descarga el documento, así
  // que basta con fetch keepalive — sendBeacon en cambio no permite
  // headers custom (no podríamos enviar x-nv-consent).
  fetch(url, {
    method: "POST",
    headers,
    body,
    keepalive: true,
  }).catch(() => {
    // Silenciamos errores: un evento perdido es preferible a un error
    // visible al usuario. Si hay un problema sistémico se verá en los
    // logs del endpoint.
  });
}

/**
 * Punto de entrada principal del SDK. Llamar desde código de la app para
 * registrar eventos no-automáticos (purchase, add_to_cart, etc.).
 */
export function track(
  eventType: string,
  props: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;

  const visitor_id = getOrCreateVisitorId();
  const session_id = getOrCreateSessionId();
  bumpSession();

  // UTM: primero intentamos capturar desde la URL actual (por si llegó
  // con utm_*), si no había en la URL miramos el sessionStorage.
  const utm = captureUtm() ?? readStoredUtm();

  dispatch({
    visitor_id,
    session_id,
    event_type: eventType,
    event_props: props,
    page_path: location.pathname + location.search,
    page_title: document.title,
    referrer: document.referrer || undefined,
    utm: utm
      ? {
          source: utm.source,
          medium: utm.medium,
          campaign: utm.campaign,
          term: utm.term,
          content: utm.content,
        }
      : undefined,
    consent_mode: decideConsentMode(),
  });
}

/** Alias semántico — llama track("page_view"). */
export function trackPageView(): void {
  track("page_view");
}

/**
 * Borra el visitor_id del navegador. Lo usa el botón "Olvidar mis datos"
 * en /mi-cuenta/privacidad y al revocar el consentimiento.
 */
export function clearVisitorId(): void {
  try {
    localStorage.removeItem(VISITOR_KEY);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(UTM_KEY);
  } catch {
    /* nothing to do */
  }
}
