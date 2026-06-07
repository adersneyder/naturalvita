/**
 * lib/coupons/dynamic.ts
 *
 * Generador de cupones únicos para flows de Savia. Un cupón único:
 *   - Code aleatorio (`RECUPERA-XXXXXX`), imposible de adivinar/compartir.
 *   - `max_total_uses = 1`: solo el destinatario lo puede usar.
 *   - `expires_at` corto (default 48h): no se postpone, no se acumula.
 *   - `min_order_cop` para evitar abuso en pedidos triviales.
 *
 * Esta combinación es lo que protege el margen: no entrena al cliente a
 * abandonar para conseguir descuento porque el código no es público y
 * desaparece rápido.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type DynamicCouponInput = {
  /** Prefijo del code (ej. 'RECUPERA' o 'WELCOME'). Solo letras A-Z. */
  prefix: string;
  /** Porcentaje de descuento (5 = 5%). */
  discountPercent: number;
  /** Pedido mínimo en COP. */
  minOrderCop?: number;
  /** Vigencia en horas desde ahora. Default 48. */
  expiresInHours?: number;
  /** Tope absoluto del descuento en COP. */
  maxDiscountCop?: number;
  /** Descripción humana (para el panel de admin). */
  description?: string;
};

export type DynamicCouponResult =
  | { ok: true; code: string; couponId: string; expiresAt: string }
  | { ok: false; error: string };

/**
 * Crea un cupón de un solo uso. Devuelve el code listo para incrustar en un
 * correo. El cupón nace activo; si no se redime, simplemente expira.
 */
export async function createOneTimeCoupon(
  input: DynamicCouponInput,
): Promise<DynamicCouponResult> {
  const expiresInHours = input.expiresInHours ?? 48;
  const minOrderCop = input.minOrderCop ?? 30000;
  const maxDiscountCop = input.maxDiscountCop ?? 50000;

  // Sufijo aleatorio sin caracteres ambiguos (0/O, 1/I) — codes que la
  // gente puede copiar de un correo sin equivocarse.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const code = `${input.prefix.toUpperCase()}-${suffix}`;

  const expiresAt = new Date(
    Date.now() + expiresInHours * 60 * 60 * 1000,
  ).toISOString();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code,
      description:
        input.description ??
        `Cupon dinamico de recuperacion (Savia, ${input.discountPercent}% off)`,
      discount_type: "percent",
      discount_value: input.discountPercent,
      max_discount_cop: maxDiscountCop,
      min_order_cop: minOrderCop,
      max_total_uses: 1,
      max_uses_per_customer: 1,
      is_active: true,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select("id, code")
    .single();

  if (error || !data) {
    console.error("[coupons/dynamic] error creando cupon:", error?.message);
    return { ok: false, error: error?.message ?? "insert_failed" };
  }

  return {
    ok: true,
    code: data.code as string,
    couponId: data.id as string,
    expiresAt,
  };
}
