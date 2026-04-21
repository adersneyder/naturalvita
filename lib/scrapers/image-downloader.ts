import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Descarga una imagen externa y la sube a Supabase Storage.
 * Devuelve la URL pública de la imagen subida o null si falló.
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
  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/*",
        "User-Agent": "Mozilla/5.0 (NaturalVita Sync Bot)",
      },
    });

    if (!response.ok) {
      console.warn(`Imagen no accesible: ${imageUrl} (HTTP ${response.status})`);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowedTypes.includes(contentType.split(";")[0].trim())) {
      console.warn(`Tipo de imagen no permitido: ${contentType}`);
      return null;
    }

    const buffer = await response.arrayBuffer();

    // Validar tamaño: max 10MB
    if (buffer.byteLength > 10 * 1024 * 1024) {
      console.warn(`Imagen muy grande: ${imageUrl} (${buffer.byteLength} bytes)`);
      return null;
    }

    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("avif")
          ? "avif"
          : "jpg";

    const path = `${laboratorySlug}/${productExternalId}-${index}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, buffer, {
        contentType,
        upsert: true,
        cacheControl: "31536000", // 1 año
      });

    if (uploadError) {
      console.error(`Error subiendo imagen ${path}:`, uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error("Error procesando imagen:", error);
    return null;
  }
}
