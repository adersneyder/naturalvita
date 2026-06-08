"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth/customer-auth";
import { createClient } from "@/lib/supabase/server";
import { releaseCouponRedemptionByOrder } from "@/lib/coupons/validation";

export type CancelOrderResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Cancela un pedido propio que aún está PENDIENTE de pago.
 *
 * Permitido solo si:
 *   - El pedido pertenece al cliente autenticado.
 *   - payment_status = 'pending' Y status = 'pending'.
 *
 * Pedidos pagados/enviados NO se pueden cancelar desde aquí (requieren
 * reembolso vía panel/admin). Un pedido pendiente nunca descontó stock, así
 * que solo liberamos la redención de cupón (si la hubo) y marcamos cancelado.
 *
 * Esto elimina la fricción de quedar con pedidos NV- "fantasma" si el cliente
 * abandona la pasarela: puede limpiarlos él mismo.
 */
export async function cancelMyPendingOrder(
  orderNumber: string,
): Promise<CancelOrderResult> {
  const customer = await requireCustomer({
    redirectTo: `/mi-cuenta/pedido/${orderNumber}`,
  });
  const supabase = await createClient();

  // Cargar el pedido y verificar pertenencia + estado cancelable.
  const { data: order } = await supabase
    .from("orders")
    .select("id, customer_id, status, payment_status")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (!order || order.customer_id !== customer.id) {
    return { ok: false, error: "Pedido no encontrado." };
  }

  if (order.payment_status === "paid") {
    return {
      ok: false,
      error:
        "Este pedido ya fue pagado. Escríbenos para gestionar el reembolso.",
    };
  }

  if (order.status !== "pending" || order.payment_status !== "pending") {
    return {
      ok: false,
      error: "Este pedido ya no se puede cancelar.",
    };
  }

  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("customer_id", customer.id); // defensa adicional sobre RLS

  if (updateErr) {
    console.error("[cancelMyPendingOrder]", updateErr.message);
    return { ok: false, error: "No pudimos cancelar el pedido. Intenta de nuevo." };
  }

  // Liberar cupón (si aplicaba) para que used_count refleje compras vivas.
  try {
    await releaseCouponRedemptionByOrder(order.id);
  } catch (err) {
    console.error("[cancelMyPendingOrder] release coupon:", err);
  }

  revalidatePath(`/mi-cuenta/pedido/${orderNumber}`);
  revalidatePath("/mi-cuenta");
  return { ok: true };
}
