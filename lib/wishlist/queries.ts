import { createClient } from "@/lib/supabase/server";

export type WishlistItem = {
  id: string;
  product_id: string;
  created_at: string;
  product: {
    name: string;
    slug: string;
    price_cop: number;
    status: string;
    image_url: string | null;
  };
};

/**
 * Obtiene todos los items de la wishlist del cliente autenticado.
 * Incluye datos del producto para renderizar la tarjeta.
 */
export async function getWishlistItems(): Promise<WishlistItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("wishlist_items")
    .select(
      `id, product_id, created_at,
       product:products!product_id(
         name, slug, price_cop, status,
         images:product_images!product_id(url, is_primary, sort_order)
       )`,
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[wishlist] getWishlistItems:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const p = row.product as unknown as {
      name: string;
      slug: string;
      price_cop: number;
      status: string;
      images: Array<{ url: string; is_primary: boolean; sort_order: number }>;
    };
    const sorted = (p.images ?? []).sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
    return {
      id: row.id,
      product_id: row.product_id,
      created_at: row.created_at,
      product: {
        name: p.name,
        slug: p.slug,
        price_cop: p.price_cop,
        status: p.status,
        image_url: sorted[0]?.url ?? null,
      },
    };
  });
}

/**
 * Obtiene los IDs de productos en wishlist del usuario actual.
 * Usado en la ficha de producto para mostrar el corazón lleno/vacío.
 */
export async function getWishlistProductIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from("wishlist_items")
    .select("product_id")
    .eq("customer_id", user.id);

  return new Set((data ?? []).map((r) => r.product_id));
}

/**
 * Agrega o quita un producto de la wishlist (toggle).
 * Si ya está → lo quita. Si no → lo agrega.
 * Retorna el nuevo estado: true = agregado, false = quitado.
 */
export async function toggleWishlistItem(
  productId: string,
): Promise<{ ok: boolean; inWishlist: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, inWishlist: false, error: "no_session" };
  }

  // ¿Ya existe?
  const { data: existing } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("customer_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    // Quitar
    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false, inWishlist: true, error: error.message };
    return { ok: true, inWishlist: false };
  } else {
    // Agregar
    const { error } = await supabase
      .from("wishlist_items")
      .insert({ customer_id: user.id, product_id: productId });
    if (error) return { ok: false, inWishlist: false, error: error.message };
    return { ok: true, inWishlist: true };
  }
}
