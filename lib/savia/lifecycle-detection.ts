/**
 * lib/savia/lifecycle-detection.ts
 *
 * Detector de momentos del ciclo de vida post-compra para Savia:
 *   - Recompra (repurchase-30d): ultimo pedido pagado hace 30-37 dias.
 *   - Reactivacion (reactivation-60d): ultimo pedido pagado hace 60-74 dias.
 *
 * La ventana (no un dia exacto) deja que un cron diario capture a cada
 * cliente; la idempotencia por order_id evita reenviar al mismo cliente
 * por el mismo pedido disparador aunque caiga varios dias en la ventana.
 *
 * El candidato trae los productos de su ultimo pedido para que el correo
 * de recompra muestre "lo que ya conoces". El SQL (savia_lifecycle_candidates)
 * ya respeta accepts_marketing y email_suppressions.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type LifecycleKind = "repurchase" | "reactivation";

export type LifecycleProduct = {
  name: string;
  slug: string;
  imageUrl: string | null;
};

export type LifecycleCandidate = {
  kind: LifecycleKind;
  /** Ref estable para idempotencia: el pedido disparador. */
  refId: string;
  email: string;
  customerName: string | null;
  products: LifecycleProduct[];
};

const WINDOWS: Record<LifecycleKind, { min: number; max: number }> = {
  repurchase: { min: 30, max: 37 },
  reactivation: { min: 60, max: 74 },
};

async function fetchOrderProducts(
  orderId: string,
): Promise<LifecycleProduct[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("order_items")
    .select(
      `product_name, product_id,
       product:products!product_id(slug,
         images:product_images!product_id(url, is_primary, sort_order))`,
    )
    .eq("order_id", orderId);

  const out: LifecycleProduct[] = [];
  for (const it of data ?? []) {
    const product = it.product as {
      slug: string | null;
      images: Array<{
        url: string;
        is_primary: boolean;
        sort_order: number | null;
      }> | null;
    } | null;
    if (!product?.slug) continue;
    const imgs = product.images ?? [];
    const primary =
      imgs.find((i) => i.is_primary) ??
      [...imgs].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))[0];
    out.push({
      name: it.product_name as string,
      slug: product.slug,
      imageUrl: primary?.url ?? null,
    });
  }
  return out;
}

export async function detectLifecycleCandidates(
  kind: LifecycleKind,
): Promise<LifecycleCandidate[]> {
  const supabase = createAdminClient();
  const w = WINDOWS[kind];

  const { data, error } = await supabase.rpc("savia_lifecycle_candidates", {
    p_min_days: w.min,
    p_max_days: w.max,
  });
  if (error || !data) {
    if (error) console.error("[lifecycle-detection] RPC error:", error.message);
    return [];
  }

  const candidates: LifecycleCandidate[] = [];
  for (const row of data) {
    const email = (row.email as string)?.toLowerCase();
    if (!email) continue;
    const products = await fetchOrderProducts(row.last_order_id as string);
    candidates.push({
      kind,
      refId: `order:${row.last_order_id}`,
      email,
      customerName: (row.full_name as string | null) ?? null,
      products,
    });
  }
  return candidates;
}

/**
 * Predicate de tiempo de envio compartido por los flows post-compra:
 * salta el envio si el cliente ya volvio a comprar desde que se enrolo.
 * Devuelve true => el dispatcher marca el job como 'skipped'.
 */
export async function shouldSkipIfPurchasedSince(payload: {
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
