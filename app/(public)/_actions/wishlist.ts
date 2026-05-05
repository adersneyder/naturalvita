"use server";

import { toggleWishlistItem } from "@/lib/wishlist/queries";
import { revalidatePath } from "next/cache";

/**
 * Server action para agregar/quitar producto de la wishlist.
 * Se llama desde el botón corazón en la ficha de producto y en tarjetas.
 *
 * Retorna el nuevo estado para que el cliente pueda actualizar el UI
 * optimistamente.
 */
export async function toggleWishlistAction(
  productId: string,
): Promise<{ ok: boolean; inWishlist: boolean; error?: string }> {
  const result = await toggleWishlistItem(productId);

  if (result.ok) {
    // Revalidar la página de favoritos del cliente
    revalidatePath("/mi-cuenta");
  }

  return result;
}
