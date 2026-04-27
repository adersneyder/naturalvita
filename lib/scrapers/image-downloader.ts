import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Headers que simulan un navegador Chrome real. Algunos laboratorios
 * (Naturfar, Healthy America) bloquean User-Agents genéricos.
 */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
  "Sec-Fetch-Dest": "image",
  "Sec-Fetch-Mode": "no-cors",
  "Sec-Fetch-Site": "cross-site",
  Referer: "https://www.google.com/",
};

/**
 * Descarga una imagen externa y la sube a Supabase Storage.
 * Devuelve la URL pública o null si falló.
 *
 * Reintenta hasta 3 veces con backoff exponencial si la primera petición falla.
 *
 * Estructura de path: {laboratorySlug}/{productExternalId}-{index}.{ext}
 */
export async function downloadAndUploadImage(
  supabase: SupabaseClient,
  imageUrl: string,
  laboratorySlug: string,
  productExternalId: string,
  index: number,
): Promise<string | null> {
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Backoff: 0ms, 500ms, 2000ms
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, attempt === 1 ? 500 : 2000));
      }

      const response = await fetch(imageUrl, {
        headers: BROWSER_HEADERS,
        redirect: "follow",
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "image/jpeg";
      const baseType = contentType.split(";")[0].trim().toLowerCase();
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/avif",
      ];

      if (!allowedTypes.includes(baseType)) {
        lastError = `Tipo no permitido: ${baseType}`;
        // No reintentar si el tipo es incorrecto
        return null;
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 10 * 1024 * 1024) {
        lastError = `Imagen muy grande: ${buffer.byteLength} bytes`;
        return null;
      }
      if (buffer.byteLength < 100) {
        lastError = `Imagen muy pequeña, probablemente vacía`;
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
          cacheControl: "31536000", // 1 año
        });

      if (uploadError) {
        console.error(`Upload error ${path}:`, uploadError.message);
        lastError = uploadError.message;
        continue;
      }

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Error desconocido";
    }
  }

  console.error(`Falló imagen ${imageUrl} después de 3 intentos: ${lastError}`);
  return null;
}
