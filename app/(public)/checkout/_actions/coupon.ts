"use server";

import { validateCoupon } from "@/lib/coupons/validation";
import { requireCustomer } from "@/lib/auth/customer-auth";

export type CouponPreviewResult =
  | {
      ok: true;
      code: string;
      description: string;
      discount_cop: number;
      message: string;
    }
  | { ok: false; message: string };

/**
 * Server action para previsualizar descuento de un cupón en el checkout
 * antes de confirmar el pedido. Devuelve el descuento calculado para
 * mostrarlo en el resumen.
 *
 * Importante: este preview NO persiste nada. La aplicación canónica del
 * cupón pasa en `createPendingOrder()` que re-valida desde cero usando
 * el subtotal real server-side. Si el cliente manipula este preview no
 * gana nada porque al confirmar se descarta su input.
 */
export async function previewCouponAction(
  code: string,
  subtotalConIvaCop: number,
): Promise<CouponPreviewResult> {
  // Solo clientes autenticados pueden aplicar cupones (estamos dentro
  // del flujo de checkout que ya requiere sesión)
  const customer = await requireCustomer({ redirectTo: "/checkout" });

  if (!Number.isFinite(subtotalConIvaCop) || subtotalConIvaCop < 0) {
    return { ok: false, message: "Subtotal inválido" };
  }

  const result = await validateCoupon(code, subtotalConIvaCop, customer.email);

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return {
    ok: true,
    code: result.coupon.code,
    description: result.coupon.description,
    discount_cop: result.discount_cop,
    message: result.message,
  };
}
