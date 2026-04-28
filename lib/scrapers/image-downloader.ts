import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Headers que simulan un navegador Chrome real. Algunos laboratorios
 * (Naturfar, Healthy America) bloquean User-Agents genéricos.
 *
 * El Referer NO se incluye aquí porque debe ser dinámico: derivado del
 * propio dominio de la imagen, para evadir hotlink protection que solo
 * permite requests con Referer del mismo origin.
 */
const BASE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
  "Sec-Fetch-Dest": "image",
  "Sec-Fetch-Mode": "no-cors",
  "Sec-Fetch-Site": "same-origin",
};

const FETCH_TIMEOUT_MS = 10000; // 10s por imagen
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MIN_BYTES = 100;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
];

export type DownloadResult = {
  url: string | null;
  error: string | null;
};

/**
 * Descarga una imagen externa y la sube a Supabase Storage.
 *
 * Estructura de path: {laboratorySlug}/{productExternalId}-{index}.{ext}
 *
 * Reintenta hasta 3 veces con backoff exponencial (0ms, 500ms, 2000ms).
 * Cada intento tiene timeout individual de 10 segundos.
 *
 * Devuelve { url, error }:
 * - url no-null y error null: éxito
 * - url null y error con mensaje: falló todos los reintentos
 */
export async function downloadAndUploadImage(
  supabase: SupabaseClient,
  imageUrl: string,
  laboratorySlug: string,
  productExternalId: string,
  index: number,
): Promise<DownloadResult> {
  // Derivar Referer del origin de la imagen (https://laboratorio.com/) para
  // pasar hotlink protection. Si la URL es inválida, usar el laboratorySlug como hint.
  let referer = "";
  try {
    const u = new URL(imageUrl);
    referer = `${u.protocol}//${u.host}/`;
  } catch {
    referer = `https://${laboratorySlug}.co/`;
  }

  const headers: Record<string, string> = { ...BASE_HEADERS, Referer: referer };

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, attempt === 1 ? 500 : 2000));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(imageUrl, {
        headers,
        redirect: "follow",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        // 4xx no se reintentan (forbidden, not found, etc.); 5xx sí
        if (response.status >= 400 && response.status < 500) {
          return { url: null, error: lastError };
        }
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "image/jpeg";
      const baseType = contentType.split(";")[0].trim().toLowerCase();

      if (!ALLOWED_TYPES.includes(baseType)) {
        return { url: null, error: `Tipo no permitido: ${baseType}` };
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_BYTES) {
        return {
          url: null,
          error: `Imagen muy grande: ${Math.round(buffer.byteLength / 1024)} KB`,
        };
      }
      if (buffer.byteLength < MIN_BYTES) {
        lastError = `Imagen muy pequeña: ${buffer.byteLength} bytes`;
        continue;
      }

      const ext = baseType.includes("png")
        ? "png"
        : baseType.includes("webp")
          ? "webp"
          : baseType.includes("avif")
            ? "avif"
            : "jpg";

      const path = `${laboratorySlug}/${productExternalId}-${index}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, buffer, {
          contentType: baseType,
          upsert: true,
          cacheControl: "31536000",
        });

      if (uploadError) {
        lastError = `Upload: ${uploadError.message}`;
        continue;
      }

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return { url: data.publicUrl, error: null };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        lastError = error.name === "AbortError" ? `Timeout (>${FETCH_TIMEOUT_MS}ms)` : error.message;
      } else {
        lastError = "Error desconocido";
      }
    }
  }

  return { url: null, error: lastError ?? "Falló sin razón conocida" };
}
