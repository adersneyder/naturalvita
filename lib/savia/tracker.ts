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
 *  - Exponer `identify(customerId)` para vincular el visitor anónimo a
 *    un customer_id al iniciar sesión. El backend reasigna eventos
 *    previos vía RPC `rewire_visitor_to_customer`.
 *  - Auto-enviar `page_view` al inicializar y en cada cambio de ruta.
 *  - First-touch UTM: la PRIMERA vez que vemos un visitor con utm_*,
 *    lo guardamos en localStorage para siempre. Cada evento envía
 *    ambos: el last-touch de la sesión y el first-touch persistente.
 *  - Buffer + batch: acumula hasta 10 eventos o 5 segundos, lo que
 *    ocurra primero. Envía con fetch keepalive. Al `pagehide` /
 *    `visibilitychange` hidden flushea con sendBeacon para no perder
 *    eventos cuando el usuario navega afuera.
 *
 * SIN librerías de tracking de terceros: cero scripts externos, cero
 * cookies, cero fingerprinting. visitor_id es un random hex de 64 bits.
 *
 * COMPATIBILIDAD: las firmas públicas `track()`, `trackPageView()` y
 * `clearVisitorId()` son las mismas que antes de Fase 0.5. El comportamiento
 * "envío inmediato" se preserva si el usuario llama `flush()` después de
 * `track()`, o automáticamente cuando el evento es de tipo `purchase` o
 * `identify` (eventos críticos que no toleran pérdida).
 */

import { readConsent } from "@/lib/cart/use-consent";
import type { TrackEventInput } from "./tracker-types";

const VISITOR_KEY = "nv:visitor:v1";
const SESSION_KEY = "nv:session:v1";
const SESSION_TTL_MS = 30 * 60 * 1000;
const UTM_KEY = "nv:utm:v1";
const UTM_FIRST_KEY = "nv:utm-first:v1";

// Eventos críticos que se envían INMEDIATAMENTE (no esperan al batch).
// Si el usuario cierra la pestaña justo después de comprar, perder el
// evento purchase es inaceptable; preferimos un POST extra a perder data.
const CRITICAL_EVENTS = new Set(["purchase", "identify"]);

// Buffer parameters.
const BATCH_MAX_SIZE = 10;
const BATCH_FLUSH_MS = 5000;

type StoredSession = {
  id: string;
  last_event_at: number;
};

type StoredUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  captured_at: number;
};

type StoredFirstUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  captured_at: number;
};

const buffer: TrackEventInput[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInstalled = false;

function randomId(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8) return existing;
  } catch {
    /* localStorage bloqueado — id efímero por carga */
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

/**
 * Captura UTM de la URL actual. Si encuentra alguno:
 *  - actualiza el last-touch en sessionStorage (se reinicia con sesión),
 *  - y si NO hay first-touch en localStorage, lo escribe.
 */
function captureUtm(): { last: StoredUtm | null; first: StoredFirstUtm | null } {
  if (typeof location === "undefined") {
    return { last: readStoredUtm(), first: readStoredFirstUtm() };
  }
  const params = new URLSearchParams(location.search);
  const found: Partial<StoredUtm> = {};
  let any = false;
  for (const f of ["source", "medium", "campaign", "term", "content"] as const) {
    const v = params.get(`utm_${f}`);
    if (v) {
      found[f] = v.slice(0, 128);
      any = true;
    }
  }
  if (any) {
    const last: StoredUtm = {
      ...(found as Omit<StoredUtm, "captured_at">),
      captured_at: Date.now(),
    };
    try {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(last));
    } catch {
      /* same */
    }
    // First-touch: solo si no había nada antes.
    try {
      if (!localStorage.getItem(UTM_FIRST_KEY)) {
        const first: StoredFirstUtm = {
          source: found.source,
          medium: found.medium,
          campaign: found.campaign,
          captured_at: Date.now(),
        };
        localStorage.setItem(UTM_FIRST_KEY, JSON.stringify(first));
      }
    } catch {
      /* same */
    }
    return { last, first: readStoredFirstUtm() };
  }
  return { last: readStoredUtm(), first: readStoredFirstUtm() };
}

function readStoredUtm(): StoredUtm | null {
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as StoredUtm) : null;
  } catch {
    return null;
  }
}

function readStoredFirstUtm(): StoredFirstUtm | null {
  try {
    const raw = localStorage.getItem(UTM_FIRST_KEY);
    return raw ? (JSON.parse(raw) as StoredFirstUtm) : null;
  } catch {
    return null;
  }
}

function decideConsentMode(): "anonymous" | "identified" {
  const consent = readConsent();
  return consent?.analytics === true ? "identified" : "anonymous";
}

function ensureListeners() {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;

  // pagehide es más confiable que beforeunload para móvil + Safari.
  // visibilitychange "hidden" cubre el caso de cambio de pestaña.
  // En cualquiera de los dos flusheamos con sendBeacon — fetch
  // keepalive a veces se cancela en navegadores reales aunque la
  // especificación diga otra cosa.
  const flushOnExit = () => {
    flushBuffer({ useBeacon: true });
  };
  window.addEventListener("pagehide", flushOnExit);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushOnExit();
  });
}

/**
 * Envía lo que haya en el buffer. Si useBeacon=true, intenta sendBeacon
 * (apropiado para unload, no acepta headers custom — por eso consent_mode
 * va en el body de cada evento, no en header).
 *
 * Si el envío con beacon falla (no soportado), cae a fetch keepalive.
 */
function flushBuffer({ useBeacon = false }: { useBeacon?: boolean } = {}) {
  if (buffer.length === 0) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const events = buffer.splice(0, buffer.length);
  const url = "/api/savia/track";
  const body = JSON.stringify({ events });

  if (useBeacon && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    } catch {
      /* fall through to fetch */
    }
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Eventos perdidos en la red son aceptables — preferimos no romper
    // al usuario. Los críticos (purchase, identify) ya se enviaron uno
    // por uno con su propio fetch para máxima resistencia.
  });
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushBuffer();
  }, BATCH_FLUSH_MS);
}

function enqueue(event: TrackEventInput, isCritical: boolean) {
  ensureListeners();
  buffer.push(event);
  if (isCritical || buffer.length >= BATCH_MAX_SIZE) {
    flushBuffer();
  } else {
    scheduleFlush();
  }
}

/**
 * Punto de entrada principal del SDK. Llamar desde código de la app para
 * registrar eventos no-automáticos (purchase, add_to_cart, etc.).
 *
 * Compatibilidad: misma firma que antes de Fase 0.5. Lo que cambia es
 * que los eventos no críticos se acumulan en buffer en vez de enviarse
 * uno por uno — el ahorro de POSTs reduce ruido sin sacrificar latencia
 * de los eventos importantes.
 */
export function track(
  eventType: string,
  props: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;

  const visitor_id = getOrCreateVisitorId();
  const session_id = getOrCreateSessionId();
  bumpSession();

  const { last, first } = captureUtm();

  const event: TrackEventInput = {
    visitor_id,
    session_id,
    event_type: eventType,
    event_props: props,
    page_path: location.pathname + location.search,
    page_title: document.title,
    referrer: document.referrer || undefined,
    utm: last
      ? {
          source: last.source,
          medium: last.medium,
          campaign: last.campaign,
          term: last.term,
          content: last.content,
        }
      : undefined,
    utm_first: first
      ? {
          source: first.source,
          medium: first.medium,
          campaign: first.campaign,
        }
      : undefined,
    client_ts: new Date().toISOString(),
    consent_mode: decideConsentMode(),
  };

  enqueue(event, CRITICAL_EVENTS.has(eventType));
}

/** Alias semántico — llama track("page_view"). */
export function trackPageView(): void {
  track("page_view");
}

/**
 * Vincula el visitor anónimo a un customer_id. Idempotente.
 *
 * Solo tiene efecto si el consent es "identified" — sin él no podemos
 * mantener customer_id en el backend, así que el rewire no aplica.
 *
 * Llamar después del login exitoso. El backend ejecutará la RPC
 * `rewire_visitor_to_customer` que reasigna TODOS los eventos previos
 * de este visitor_id al customer_id (incluidos los anónimos que ahora
 * sí pueden enriquecerse porque el cliente dio consent al loguearse).
 */
export function identify(customerId: string): void {
  if (typeof window === "undefined") return;
  if (!customerId) return;
  // Sin consent el backend ignora el rewire — pero igual emitimos el
  // evento para que quede registrado en logs del cliente; el backend
  // simplemente no actualizará BD.
  track("identify", { customer_id: customerId });
}

/**
 * Fuerza el envío del buffer ahora. Útil antes de navegar a un endpoint
 * que va a cambiar el estado relevante (logout, lock de pantalla).
 */
export function flush(): void {
  flushBuffer();
}

/**
 * Borra el visitor_id del navegador. Lo usa el botón "Olvidar mis datos"
 * en /mi-cuenta/privacidad y al revocar el consentimiento. También limpia
 * el first-touch UTM — su propósito es atribuir al MISMO visitor en el
 * tiempo, así que si el id muere también muere su historial de atribución.
 */
export function clearVisitorId(): void {
  try {
    localStorage.removeItem(VISITOR_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(UTM_FIRST_KEY);
    sessionStorage.removeItem(UTM_KEY);
  } catch {
    /* nothing to do */
  }
}
