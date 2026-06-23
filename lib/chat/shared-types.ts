/**
 * Tipos compartidos del chat entre server (tools, agent) y cliente
 * (ChatWidget). NO lleva "server-only" porque el widget lo importa.
 */

/** Datos mínimos para renderizar una tarjeta de producto en el chat. */
export type ProductCardData = {
  slug: string;
  name: string;
  presentation: string | null;
  price_cop: number;
  image_url: string | null;
};

/**
 * Elige la imagen primaria de un producto. Orden: is_primary primero,
 * luego sort_order ascendente. Devuelve null si no hay imágenes.
 */
export function pickPrimaryImage(
  images:
    | Array<{ url: string; is_primary: boolean; sort_order: number }>
    | null
    | undefined,
): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
  return sorted[0]?.url ?? null;
}
