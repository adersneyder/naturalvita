/**
 * lib/savia/cart-detection.ts
 *
 * Detector de carritos abandonados para Savia.
 *
 * Dos fuentes:
 *   - LOGUEADOS: tabla `carts` (customer_id no nulo) joineado a `customers`
 *     para tomar email y respeto de `accepts_marketing`. Abandonado =
 *     ultimo update entre 1h y 7d atras, sigue con items, customer acepta
 *     marketing, no tiene una orden 'paid' posterior al cart.updated_at.
 *   - ANONIMOS: tabla `orders` con `payment_status='pending'`, `status='pending'`
 *     y `customer_email` valido. Abandonada = creada entre 1h y 7d atras, sin
 *     otra orden 'paid' del mismo email creada despues.
 *
 * El detector NO encola: devuelve candidatos. El cron route llama a
 * `enrollInFlow('cart-abandoned', ...)` con idempotency_key estable por
 * (cart_id|pending_order_id), asi que dispararlo varias veces es seguro
 * (los duplicados se descartan en la cola).
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type CartAbandonedItem = {
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  quantity: number;
  priceCop: number;
};

export type CartAbandonedCandidate = {
  /** Fuente que originó la detección. */
  source: "logged_in" | "anonymous_checkout";
  /** Identificador estable usado para idempotency_key del enrolamiento. */
  refId: string;
  email: string;
  customerName: string | null;
  items: CartAbandonedItem[];
};

const MIN_AGE_SECONDS = 60 * 60; // 1h
const MAX_AGE_DAYS = 7;

export async function detectAbandonedCarts(
  limit = 100,
): Promise<CartAbandonedCandidate[]> {
  const supabase = createAdminClient();
  const now = Date.now();
  const minIso = new Date(now - MIN_AGE_SECONDS * 1000).toISOString();
  const maxIso = new Date(
    now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const candidates: CartAbandonedCandidate[] = [];

  // --- LOGUEADOS ---
  const { data: carts } = await supabase
    .from("carts")
    .select(
      `id, updated_at, customer_id,
       customer:customers!customer_id(email, full_name, accepts_marketing),
       items:cart_items!cart_id(
         product_id, quantity, price_cop_at_add,
         product:products!product_id(name, slug,
           images:product_images!product_id(url, is_primary, sort_order))
       )`,
    )
    .not("customer_id", "is", null)
    .lt("updated_at", minIso)
    .gt("updated_at", maxIso)
    .limit(limit);

  for (const cart of carts ?? []) {
    const customer = cart.customer as {
      email: string | null;
      full_name: string | null;
      accepts_marketing: boolean | null;
    } | null;
    if (!customer?.email || !customer.accepts_marketing) continue;

    const items = ((cart.items ?? []) as Array<{
      product_id: string;
      quantity: number;
      price_cop_at_add: number;
      product: {
        name: string | null;
        slug: string | null;
        images: Array<{
          url: string;
          is_primary: boolean;
          sort_order: number | null;
        }> | null;
      } | null;
    }>)
      .filter((it) => it.product?.name && it.product?.slug)
      .map((it) => {
        const imgs = it.product!.images ?? [];
        const primary =
          imgs.find((i) => i.is_primary) ??
          [...imgs].sort(
            (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999),
          )[0];
        return {
          productId: it.product_id,
          productName: it.product!.name!,
          productSlug: it.product!.slug!,
          productImageUrl: primary?.url ?? null,
          quantity: it.quantity,
          priceCop: it.price_cop_at_add,
        };
      });
    if (items.length === 0) continue;

    // Excluir si el cliente ya compró DESPUÉS del último cambio del carrito.
    const { data: laterPaid } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_email", customer.email.toLowerCase())
      .eq("payment_status", "paid")
      .gt("created_at", cart.updated_at as string)
      .limit(1);
    if (laterPaid && laterPaid.length > 0) continue;

    candidates.push({
      source: "logged_in",
      refId: `cart:${cart.id}`,
      email: customer.email.toLowerCase(),
      customerName: customer.full_name,
      items,
    });
  }

  // --- ANONIMOS (checkout sin pagar) ---
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `id, created_at, customer_email, customer_name,
       items:order_items!order_id(
         product_id, product_name, quantity, unit_price_cop,
         product:products!product_id(slug,
           images:product_images!product_id(url, is_primary, sort_order))
       )`,
    )
    .eq("payment_status", "pending")
    .eq("status", "pending")
    .lt("created_at", minIso)
    .gt("created_at", maxIso)
    .not("customer_email", "is", null)
    .limit(limit);

  for (const o of orders ?? []) {
    if (!o.customer_email) continue;
    const email = (o.customer_email as string).toLowerCase();

    // ¿Existe otra orden del mismo email pagada DESPUÉS de esta pending?
    const { data: laterPaid } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_email", email)
      .eq("payment_status", "paid")
      .gt("created_at", o.created_at as string)
      .limit(1);
    if (laterPaid && laterPaid.length > 0) continue;

    const items = ((o.items ?? []) as Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price_cop: number;
      product: {
        slug: string | null;
        images: Array<{
          url: string;
          is_primary: boolean;
          sort_order: number | null;
        }> | null;
      } | null;
    }>)
      .filter((it) => it.product?.slug)
      .map((it) => {
        const imgs = it.product!.images ?? [];
        const primary =
          imgs.find((i) => i.is_primary) ??
          [...imgs].sort(
            (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999),
          )[0];
        return {
          productId: it.product_id,
          productName: it.product_name,
          productSlug: it.product!.slug!,
          productImageUrl: primary?.url ?? null,
          quantity: it.quantity,
          priceCop: it.unit_price_cop,
        };
      });
    if (items.length === 0) continue;

    candidates.push({
      source: "anonymous_checkout",
      refId: `order:${o.id}`,
      email,
      customerName: (o.customer_name as string | null) ?? null,
      items,
    });
  }

  return candidates;
}

/**
 * Predicate de tiempo de envío para los pasos de cart-abandoned:
 * ¿el carrito sigue abandonado? Devuelve `true` si el dispatcher debe
 * SKIPEAR este job (el usuario ya compró tras el enrolamiento).
 */
export async function shouldSkipCartAbandoned(payload: {
  email?: string;
  enrolledAt?: string;
}): Promise<boolean> {
  if (!payload.email || !payload.enrolledAt) return false;
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("customer_email", payload.email.toLowerCase())
    .eq("payment_status", "paid")
    .gte("created_at", payload.enrolledAt)
    .limit(1);

  return Boolean(data && data.length > 0);
}
