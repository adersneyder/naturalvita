/**
 * Cliente HTTP de Klaviyo API v2024-10-15.
 *
 * Diseño defensivo:
 *   - Todas las funciones exportadas son async y NUNCA lanzan excepción al
 *     consumidor — tracking fallido no debe romper el flujo de compra.
 *   - Retry automático con backoff exponencial para errores 429 y 5xx.
 *   - Timeout de 8 segundos por request.
 *   - Logs estructurados con [klaviyo] prefix para filtrar en Vercel.
 *   - Si KLAVIYO_PRIVATE_API_KEY no está configurada, las funciones
 *     retornan {ok: false} silenciosamente (evita errores en dev sin .env).
 *
 * Referencia API: https://developers.klaviyo.com/en/reference
 */

const KLAVIYO_API_VERSION = "2024-10-15";
const BASE_URL = "https://a.klaviyo.com";
const TIMEOUT_MS = 8_000;
const MAX_RETRIES = 3;

function getPrivateKey(): string | null {
  return process.env.KLAVIYO_PRIVATE_API_KEY ?? null;
}

function getPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_KLAVIYO_COMPANY_ID ?? null;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempt = 1,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });

    // Retry en 429 (rate limit) y 5xx (server error)
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const delay = Math.min(1000 * 2 ** (attempt - 1), 8000); // 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, options, attempt + 1);
    }

    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Request autenticado a la API privada de Klaviyo.
 * Usa Bearer token con la Private API Key.
 */
async function privateRequest(
  method: "POST" | "GET" | "PATCH",
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status?: number; data?: unknown; error?: string }> {
  const key = getPrivateKey();
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[klaviyo] KLAVIYO_PRIVATE_API_KEY no configurada");
    }
    return { ok: false, error: "no_key" };
  }

  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Klaviyo-API-Key ${key}`,
    Accept: "application/vnd.api+json",
    "revision": KLAVIYO_API_VERSION,
  };
  if (body) headers["Content-Type"] = "application/vnd.api+json";

  try {
    const res = await fetchWithRetry(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 202 || res.status === 200 || res.status === 201) {
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = null; // algunos 202 no tienen body
      }
      return { ok: true, status: res.status, data };
    }

    const errText = await res.text().catch(() => "(no body)");
    console.error(
      `[klaviyo] ${method} ${path} → ${res.status}: ${errText.slice(0, 200)}`,
    );
    return { ok: false, status: res.status, error: errText.slice(0, 200) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[klaviyo] ${method} ${path} → excepción: ${msg}`);
    return { ok: false, error: msg };
  }
}

// ─── Profiles ───────────────────────────────────────────────────────────────

export type KlaviyoProfile = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  /** Propiedades custom del perfil */
  properties?: Record<string, unknown>;
};

/**
 * Crea o actualiza un perfil en Klaviyo.
 * Si el perfil con ese email ya existe, hace PATCH con los datos nuevos.
 * Operación idempotente y segura de llamar múltiples veces.
 */
export async function identifyProfile(
  profile: KlaviyoProfile,
): Promise<{ ok: boolean }> {
  const res = await privateRequest("POST", "/api/profile-import/", {
    data: {
      type: "profile",
      attributes: {
        email: profile.email.toLowerCase().trim(),
        first_name: profile.firstName ?? undefined,
        last_name: profile.lastName ?? undefined,
        phone_number: profile.phone ?? undefined,
        properties: profile.properties ?? {},
      },
    },
  });
  return { ok: res.ok };
}

// ─── Events ─────────────────────────────────────────────────────────────────

export type KlaviyoEvent = {
  /** Email del perfil al que se asocia el evento */
  email: string;
  /** Nombre canónico del evento (ej: "Placed Order") */
  eventName: string;
  /**
   * ID único del evento para idempotencia.
   * Klaviyo ignora eventos duplicados con el mismo unique_id en 24h.
   * Usar order_number o hash de datos únicos.
   */
  uniqueId: string;
  /** Timestamp del evento (ISO 8601). Por defecto: ahora. */
  happenedAt?: string;
  /** Valor monetario del evento en USD cents (Klaviyo usa USD internamente). */
  valueCop?: number;
  /** Propiedades adicionales del evento */
  properties?: Record<string, unknown>;
};

/**
 * Registra un evento en el timeline del perfil.
 * Klaviyo usa los eventos para disparar flows, segmentar, y reportar.
 */
export async function trackEvent(
  event: KlaviyoEvent,
): Promise<{ ok: boolean }> {
  const res = await privateRequest("POST", "/api/events/", {
    data: {
      type: "event",
      attributes: {
        profile: {
          data: {
            type: "profile",
            attributes: { email: event.email.toLowerCase().trim() },
          },
        },
        metric: {
          data: {
            type: "metric",
            attributes: { name: event.eventName },
          },
        },
        properties: event.properties ?? {},
        unique_id: event.uniqueId,
        time: event.happenedAt ?? new Date().toISOString(),
        value: event.valueCop ? event.valueCop / 100 : undefined,
      },
    },
  });
  return { ok: res.ok };
}

// ─── Lists ───────────────────────────────────────────────────────────────────

/**
 * Suscribe un perfil a una lista en Klaviyo con consent explícito.
 * Crea el perfil si no existe.
 *
 * @param email Email a suscribir
 * @param listId ID de la lista en Klaviyo (se obtiene desde la UI de Klaviyo)
 * @param source Texto libre de origen de la suscripción (aparece en historial)
 */
export async function subscribeToList(
  email: string,
  listId: string,
  source: string,
): Promise<{ ok: boolean }> {
  // 1. Asegurarse que el perfil existe
  await identifyProfile({ email });

  // 2. Suscribir con consent email marketing
  const res = await privateRequest(
    "POST",
    `/api/lists/${listId}/relationships/profiles/`,
    {
      data: [
        {
          type: "profile",
          attributes: {
            email: email.toLowerCase().trim(),
            subscriptions: {
              email: {
                marketing: {
                  consent: "SUBSCRIBED",
                  consented_at: new Date().toISOString(),
                },
              },
            },
          },
        },
      ],
    },
  );

  if (!res.ok) {
    // Fallback: intentar con el endpoint bulk-subscribe que es más permisivo
    const fallback = await privateRequest(
      "POST",
      "/api/profile-subscription-bulk-create-jobs/",
      {
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: {
            historical_import: false,
            list_id: listId,
            subscriptions: [
              {
                channels: {
                  email: ["MARKETING"],
                },
                email: email.toLowerCase().trim(),
                custom_source: source,
              },
            ],
          },
        },
      },
    );
    return { ok: fallback.ok };
  }

  return { ok: res.ok };
}

export { getPublicKey };
