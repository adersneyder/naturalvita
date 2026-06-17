import "server-only";
import { createTask } from "./api";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generadores de tareas: cada uno lee del modelo (Sembrado, BI) y
 * propone tareas para la bandeja con dedup automático por entidad.
 * Idempotentes: re-ejecutar no inunda.
 *
 * Retornan un resumen { created, deduplicated } para que el runner
 * (UI o cron) reporte qué pasó.
 */

export type GeneratorResult = { created: number; deduplicated: number };

const CHURN_FLOW_ID = "reactivation_60d";
const CART_FLOW_ID = "cart_abandonment_24h";

/**
 * Genera tareas para clientes en segmento RFM 'at_risk' proponiendo
 * enrolarlos en el flow de recuperación de Savia.
 */
export async function generateChurnTasks(): Promise<GeneratorResult> {
  const admin = createAdminClient();
  const { data: rfm } = await admin.rpc("customer_rfm");
  if (!rfm) return { created: 0, deduplicated: 0 };

  const atRisk = rfm.filter(
    (r) =>
      r.segment_code === "at_risk" &&
      r.customer_email &&
      r.lifetime_revenue_cop > 0,
  );

  let created = 0;
  let deduplicated = 0;
  for (const c of atRisk) {
    const res = await createTask({
      task_type: "savia.enroll_flow",
      source: "sembrado.churn",
      title: `Recuperar a ${c.customer_name ?? c.customer_email}`,
      description: `Cliente at_risk (R${c.r_score} F${c.f_score} M${c.m_score}). Ha gastado ${c.lifetime_revenue_cop.toLocaleString("es-CO")} COP en ${c.orders_count} pedidos. Última compra hace ${c.days_since_last_order} días.`,
      priority: c.m_score >= 4 ? "high" : "normal",
      proposed_action: {
        flow_id: CHURN_FLOW_ID,
        customer_emails: [c.customer_email],
      },
      entity_type: "customer",
      entity_id: c.customer_email.toLowerCase(),
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (res.ok && res.deduplicated) deduplicated++;
    else if (res.ok) created++;
  }
  return { created, deduplicated };
}

/**
 * Genera tareas para clientes identificados con add_to_cart sin
 * purchase posterior. Proponer enrolarlos en flow de recuperación de
 * carrito (con cupón dinámico opcional generado por el flow Savia).
 */
export async function generateCartAbandonmentTasks(): Promise<GeneratorResult> {
  const admin = createAdminClient();
  const { data: candidates } = await admin.rpc(
    "sembrado_cart_abandonment_candidates",
    { p_window_days: 7, p_cooldown_hours: 4 },
  );
  if (!candidates) return { created: 0, deduplicated: 0 };

  let created = 0;
  let deduplicated = 0;
  for (const c of candidates) {
    const sinceLast =
      Math.floor((Date.now() - new Date(c.last_add_at).getTime()) / 36e5);
    const res = await createTask({
      task_type: "savia.enroll_flow",
      source: "sembrado.cart_abandonment",
      title: `Recuperar carrito de ${c.customer_name ?? c.customer_email}`,
      description: `Añadió al carrito hace ${sinceLast}h y no compró. ${c.product_examples ? `Productos: ${c.product_examples}` : ""}`,
      priority: "high",
      proposed_action: {
        flow_id: CART_FLOW_ID,
        customer_emails: [c.customer_email],
      },
      entity_type: "customer",
      entity_id: c.customer_email.toLowerCase(),
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (res.ok && res.deduplicated) deduplicated++;
    else if (res.ok) created++;
  }
  return { created, deduplicated };
}

/**
 * Genera tareas de revisión por producto: alto interés (wishlist) +
 * baja conversión a compra. Señalización al equipo — el handler es
 * noop (pricing.review). El admin decide si bajar precio, mejorar
 * ficha o lo que aplique.
 */
export async function generateWishlistGapTasks(): Promise<GeneratorResult> {
  const admin = createAdminClient();
  const { data: rows } = await admin.rpc("tracking_wishlist_gap", {
    p_days: 60,
  });
  if (!rows) return { created: 0, deduplicated: 0 };

  // Score: muchos wishers + baja conversión. Solo señalizamos los que
  // tienen masa crítica (>=5 wishers únicos).
  const candidates = rows
    .filter((r) => r.unique_wishers >= 5)
    .filter((r) => (r.conversion_pct ?? 100) < 15)
    .sort((a, b) => b.unique_wishers - a.unique_wishers)
    .slice(0, 10);

  let created = 0;
  let deduplicated = 0;
  for (const r of candidates) {
    const res = await createTask({
      task_type: "pricing.review",
      source: "sembrado.wishlist_gap",
      title: `Revisar ${r.product_name}`,
      description: `${r.unique_wishers} personas lo añadieron a wishlist en 60d pero solo ${r.paid_orders} compraron (${r.conversion_pct?.toFixed(1) ?? "—"}%). Posible problema de precio, presentación o disponibilidad.`,
      priority: r.unique_wishers >= 15 ? "high" : "normal",
      proposed_action: {
        product_ids: r.product_id ? [r.product_id] : [],
        note: `${r.unique_wishers} wishers, ${r.paid_orders} pedidos`,
      },
      entity_type: "product",
      entity_id: r.product_slug,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (res.ok && res.deduplicated) deduplicated++;
    else if (res.ok) created++;
  }
  return { created, deduplicated };
}

/** Ejecuta los 3 generadores en serie y suma los conteos. */
export async function generateAllTasks(): Promise<{
  churn: GeneratorResult;
  cart: GeneratorResult;
  wishlist: GeneratorResult;
}> {
  const churn = await generateChurnTasks();
  const cart = await generateCartAbandonmentTasks();
  const wishlist = await generateWishlistGapTasks();
  return { churn, cart, wishlist };
}
