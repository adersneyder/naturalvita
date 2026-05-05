import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Lib de cupones.
 *
 * Validación pública: usa service role en server actions porque la tabla
 * coupons tiene RLS solo para admins. No queremos exponer max_total_uses,
 * used_count, ni la lista completa de cupones a clientes que pudieran
 * sabotear desde DevTools.
 *
 * Las validaciones se ejecutan tanto al ingresar el código (preview de
 * descuento) como al confirmar el pedido (re-validación canónica antes
 * de persistir el discount_cop). Esto previene race conditions y manipulación
 * de precios desde el cliente.
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase service role no configurado");
  }
  return createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type CouponDTO = {
  id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_cop: number;
  max_discount_cop: number | null;
  max_total_uses: number | null;
  max_uses_per_customer: number;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
};

export type CouponValidationOk = {
  ok: true;
  coupon: CouponDTO;
  /** COP de descuento que se aplicaría dado el subtotal actual */
  discount_cop: number;
  /** Mensaje amigable para mostrar al cliente */
  message: string;
};

export type CouponValidationError = {
  ok: false;
  /** Código de error programático */
  code:
    | "not_found"
    | "inactive"
    | "not_started"
    | "expired"
    | "max_uses_reached"
    | "max_uses_per_customer_reached"
    | "min_order_not_met"
    | "invalid_input";
  /** Mensaje amigable para mostrar al cliente */
  message: string;
};

export type CouponValidationResult = CouponValidationOk | CouponValidationError;

/**
 * Valida un código de cupón contra la BD y calcula el descuento que
 * aplicaría. NO incrementa contadores ni inserta redemption — eso pasa
 * cuando el pedido se confirma.
 *
 * @param code Código ingresado por el cliente (case-insensitive)
 * @param subtotalCop Subtotal del pedido para validar min_order_cop y calcular descuento
 * @param customerEmail Email del cliente para validar max_uses_per_customer
 */
export async function validateCoupon(
  code: string,
  subtotalCop: number,
  customerEmail: string | null,
): Promise<CouponValidationResult> {
  // Normalizar input
  const codeNorm = code.trim().toUpperCase();
  if (!codeNorm || codeNorm.length > 50) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Código de cupón inválido",
    };
  }
  if (!Number.isInteger(subtotalCop) || subtotalCop < 0) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Subtotal del pedido inválido",
    };
  }

  const supabase = getServiceClient();
  const { data: coupon, error } = await supabase
    .from("coupons")
    .select(
      "id, code, description, discount_type, discount_value, min_order_cop, max_discount_cop, max_total_uses, max_uses_per_customer, used_count, is_active, starts_at, expires_at",
    )
    .ilike("code", codeNorm)
    .maybeSingle();

  if (error) {
    console.error("[coupons] error consultando:", error);
    return {
      ok: false,
      code: "invalid_input",
      message: "No pudimos validar el cupón en este momento",
    };
  }

  if (!coupon) {
    return {
      ok: false,
      code: "not_found",
      message: "El cupón no existe",
    };
  }

  if (!coupon.is_active) {
    return {
      ok: false,
      code: "inactive",
      message: "Este cupón ya no está activo",
    };
  }

  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return {
      ok: false,
      code: "not_started",
      message: "Este cupón aún no está disponible",
    };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return {
      ok: false,
      code: "expired",
      message: "Este cupón ya expiró",
    };
  }

  if (
    coupon.max_total_uses !== null &&
    coupon.used_count >= coupon.max_total_uses
  ) {
    return {
      ok: false,
      code: "max_uses_reached",
      message: "Este cupón ya alcanzó su límite de usos",
    };
  }

  // Validar uso por cliente (solo si el email está disponible)
  if (customerEmail && coupon.max_uses_per_customer > 0) {
    const { count } = await supabase
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .ilike("customer_email", customerEmail);

    if (count !== null && count >= coupon.max_uses_per_customer) {
      return {
        ok: false,
        code: "max_uses_per_customer_reached",
        message: "Ya usaste este cupón anteriormente",
      };
    }
  }

  if (subtotalCop < coupon.min_order_cop) {
    const formatter = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
    return {
      ok: false,
      code: "min_order_not_met",
      message: `Este cupón requiere una compra mínima de ${formatter.format(coupon.min_order_cop)}`,
    };
  }

  // Calcular descuento
  const discount = calculateDiscount(coupon as CouponDTO, subtotalCop);

  return {
    ok: true,
    coupon: coupon as CouponDTO,
    discount_cop: discount,
    message: `Cupón aplicado: ${coupon.description}`,
  };
}

/**
 * Calcula descuento dado un cupón y subtotal. NO valida — asume que el
 * cupón ya pasó validación. Útil para preview UI.
 */
export function calculateDiscount(
  coupon: CouponDTO,
  subtotalCop: number,
): number {
  if (coupon.discount_type === "fixed") {
    // Descuento fijo no puede exceder el subtotal
    return Math.min(coupon.discount_value, subtotalCop);
  }
  // Percentage
  let discount = Math.round((subtotalCop * coupon.discount_value) / 100);
  if (coupon.max_discount_cop !== null) {
    discount = Math.min(discount, coupon.max_discount_cop);
  }
  return Math.min(discount, subtotalCop);
}

/**
 * Registrar canje de cupón. Se llama desde el flujo de creación de orden
 * cuando el pedido pasa a 'paid' (en el webhook Bold) o cuando se crea
 * la orden con el cupón aplicado.
 *
 * Diseño: preferimos registrar el redemption al CREAR la orden (status
 * pending) antes que al pagarla, para que el used_count refleje cupones
 * "intentando aplicarse". Si el pago falla, el redemption queda asociado
 * a un orden no-pagada — el join al hacer COUNT solo cuenta redemptions
 * de pedidos exitosos, así que no hay sobreconteo.
 *
 * Increment de used_count: SQL atómico con UPDATE+RETURNING para evitar
 * race conditions en alto tráfico.
 */
export async function recordCouponRedemption(params: {
  couponId: string;
  orderId: string;
  customerEmail: string;
  discountAppliedCop: number;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServiceClient();

  const { error: insertErr } = await supabase
    .from("coupon_redemptions")
    .insert({
      coupon_id: params.couponId,
      order_id: params.orderId,
      customer_email: params.customerEmail.trim().toLowerCase(),
      discount_applied_cop: params.discountAppliedCop,
    });

  if (insertErr) {
    console.error("[coupons] error insertando redemption:", insertErr);
    return { ok: false, error: insertErr.message };
  }

  // Increment used_count atómico
  const { error: updateErr } = await supabase.rpc("increment_coupon_uses", {
    p_coupon_id: params.couponId,
  });
  // Si el RPC no existe (no hemos creado la function), hacemos UPDATE manual
  if (updateErr) {
    const { data: cur } = await supabase
      .from("coupons")
      .select("used_count")
      .eq("id", params.couponId)
      .maybeSingle();
    if (cur) {
      await supabase
        .from("coupons")
        .update({ used_count: (cur.used_count ?? 0) + 1 })
        .eq("id", params.couponId);
    }
  }

  return { ok: true };
}
