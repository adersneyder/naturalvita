import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export type ProductReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  customer_name: string | null;
  admin_reply: string | null;
};

export type ReviewStats = {
  review_count: number;
  average_rating: number;
  count_5: number;
  count_4: number;
  count_3: number;
  count_2: number;
  count_1: number;
};

export type SubmitReviewInput = {
  productId: string;
  orderId: string;
  rating: number;
  title?: string;
  body?: string;
};

/**
 * Obtiene reseñas aprobadas de un producto, más recientes primero.
 * Incluye nombre del cliente (JOIN a customers).
 */
export async function getProductReviews(
  productId: string,
  limit = 20,
): Promise<ProductReview[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_reviews")
    .select(
      `id, rating, title, body, created_at, admin_reply,
       customer:customers!customer_id(full_name)`,
    )
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[reviews] getProductReviews:", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    created_at: r.created_at,
    customer_name:
      (r.customer as unknown as { full_name: string | null } | null)?.full_name ?? null,
    admin_reply: r.admin_reply,
  }));
}

/**
 * Obtiene estadísticas de reviews de un producto desde la vista.
 * Returns null si el producto no tiene reviews.
 */
export async function getProductReviewStats(
  productId: string,
): Promise<ReviewStats | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_review_stats")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    review_count: data.review_count ?? 0,
    average_rating: parseFloat(String(data.average_rating ?? 0)),
    count_5: data.count_5 ?? 0,
    count_4: data.count_4 ?? 0,
    count_3: data.count_3 ?? 0,
    count_2: data.count_2 ?? 0,
    count_1: data.count_1 ?? 0,
  };
}

/**
 * Verifica si el cliente autenticado puede dejar reseña de este producto.
 * Condición: tiene al menos un pedido con ese producto en fulfillment_status='delivered'.
 * Retorna { canReview, orderId, alreadyReviewed }.
 */
export async function checkReviewEligibility(productId: string): Promise<{
  canReview: boolean;
  orderId: string | null;
  alreadyReviewed: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { canReview: false, orderId: null, alreadyReviewed: false };

  // Verificar si ya reseñó
  const { data: existing } = await supabase
    .from("product_reviews")
    .select("id")
    .eq("customer_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) return { canReview: false, orderId: null, alreadyReviewed: true };

  // Buscar pedido entregado que contenga el producto
  const { data: orderItem } = await supabase
    .from("order_items")
    .select(
      `id, order_id,
       order:orders!order_id(id, fulfillment_status, customer_id)`,
    )
    .eq("product_id", productId)
    .limit(50);

  const delivered = (orderItem ?? []).find((item) => {
    const order = item.order as unknown as {
      id: string;
      fulfillment_status: string;
      customer_id: string;
    } | null;
    return (
      order &&
      order.customer_id === user.id &&
      order.fulfillment_status === "delivered"
    );
  });

  if (!delivered) return { canReview: false, orderId: null, alreadyReviewed: false };

  return {
    canReview: true,
    orderId: (delivered.order as unknown as { id: string }).id,
    alreadyReviewed: false,
  };
}

/**
 * Enviar una reseña nueva. Solo para clientes autenticados con compra entregada.
 * La validación de elegibilidad se hace server-side.
 */
export async function submitReview(
  input: SubmitReviewInput,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión activa" };

  // Re-validar elegibilidad server-side (no confiar en el cliente)
  const { canReview, alreadyReviewed } = await checkReviewEligibility(
    input.productId,
  );

  if (alreadyReviewed) return { ok: false, error: "Ya reseñaste este producto" };
  if (!canReview)
    return {
      ok: false,
      error:
        "Solo puedes reseñar productos de pedidos entregados",
    };

  if (input.rating < 1 || input.rating > 5)
    return { ok: false, error: "Calificación inválida" };

  const { error } = await supabase.from("product_reviews").insert({
    product_id: input.productId,
    customer_id: user.id,
    order_id: input.orderId,
    rating: input.rating,
    title: input.title?.trim() || null,
    body: input.body?.trim() || null,
    status: "approved", // auto-aprobado: cliente verificado con entrega
  });

  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "Ya reseñaste este producto" };
    console.error("[reviews] submitReview:", error);
    return { ok: false, error: "No pudimos guardar tu reseña" };
  }

  return { ok: true };
}

/**
 * Obtiene las reseñas que el cliente ha escrito (para /mi-cuenta).
 */
export async function getCustomerReviews(): Promise<
  Array<{
    id: string;
    product_id: string;
    product_name: string;
    product_slug: string;
    rating: number;
    title: string | null;
    body: string | null;
    created_at: string;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("product_reviews")
    .select(
      `id, product_id, rating, title, body, created_at,
       product:products!product_id(name, slug)`,
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => {
    const p = r.product as unknown as { name: string; slug: string } | null;
    return {
      id: r.id,
      product_id: r.product_id,
      product_name: p?.name ?? "Producto",
      product_slug: p?.slug ?? "",
      rating: r.rating,
      title: r.title,
      body: r.body,
      created_at: r.created_at,
    };
  });
}
