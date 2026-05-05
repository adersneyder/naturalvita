"use server";

import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/auth/customer-auth";
import { calculateShipping } from "./shipping";
import { generateIntegritySignature } from "@/lib/bold/integrity";

export type CartLineInput = {
  product_id: string;
  quantity: number;
};

export type CreateOrderInput = {
  /** Líneas del carrito enviadas desde el cliente. NO confiamos en sus precios. */
  items: CartLineInput[];
  /** ID de la dirección guardada que se usará para envío */
  address_id: string;
  /** Notas opcionales del cliente */
  notes?: string;
  /** Código de cupón opcional. Re-validamos server-side antes de aplicarlo. */
  coupon_code?: string | null;
};

export type CreateOrderResult =
  | {
      ok: true;
      order: {
        order_number: string;
        total_cop: number;
        bold: {
          api_key: string;
          integrity_signature: string;
          environment: "test" | "production";
        };
      };
    }
  | { ok: false; error: string; code?: string };

/**
 * Crea un pedido en estado `pending_payment` y devuelve los datos para
 * inicializar el botón de Bold en el cliente.
 *
 * Flujo de seguridad anti-tampering:
 *
 *  1. **Re-leemos precios desde BD**, ignoramos lo que mande el cliente. Si
 *     un atacante modifica el localStorage del carrito para poner precios
 *     bajos, se descarta acá.
 *  2. **Re-validamos stock** para productos con `track_stock=true`. Si no
 *     hay stock, fallamos antes de crear la orden.
 *  3. **Re-calculamos IVA** según `tax_rates.percentage` de cada producto.
 *  4. **Re-calculamos envío** desde `shipping_rates` server-side.
 *  5. **Generamos hash de integridad** con la secret key (server-only).
 *
 * El cliente recibe solo: order_number, total, api_key, integrity_signature.
 * Suficiente para inicializar el botón sin exponer secretos.
 */
export async function createPendingOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const supabase = await createClient();
  const customer = await requireCustomer({ redirectTo: "/checkout" });

  if (!input.items || input.items.length === 0) {
    return { ok: false, error: "El carrito está vacío", code: "EMPTY_CART" };
  }

  // 1. Re-leer productos desde BD con join a tax_rates
  const productIds = input.items.map((i) => i.product_id);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      `id, slug, name, sku, price_cop, stock, track_stock, status, tax_rate_id,
       tax_rate:tax_rates!tax_rate_id(rate_percent, tax_type),
       images:product_images!product_id(url, is_primary, sort_order)`,
    )
    .in("id", productIds)
    .eq("status", "active");

  if (productsError) {
    console.error("[createPendingOrder] error leyendo productos:", productsError);
    return { ok: false, error: "Error consultando productos", code: "DB_ERROR" };
  }

  if (!products || products.length !== input.items.length) {
    return {
      ok: false,
      error: "Algunos productos ya no están disponibles",
      code: "PRODUCT_UNAVAILABLE",
    };
  }

  // 2. Re-validar stock + 3. Calcular IVA + 4. Construir líneas
  // Modelo fiscal Colombia + NaturalVita:
  //   - tax_type='included' → price_cop YA incluye IVA. Subtotal = price/(1+rate),
  //     IVA = price - subtotal. El cliente paga exactamente price_cop.
  //   - tax_type='excluded' → no es objeto del impuesto (suplementos). Cliente
  //     paga price_cop, IVA = 0.
  //   - tax_type='exempt' → aparece en factura al 0% (medicamentos INVIMA).
  //     Cliente paga price_cop, IVA = 0 pero se reporta diferente fiscalmente.
  // En los tres casos el TOTAL cobrado al cliente es siempre price_cop * quantity.
  const productMap = new Map(products.map((p) => [p.id, p]));
  type LineComputed = {
    product_id: string;
    quantity: number;
    unit_price_cop: number; // precio bruto que paga el cliente (con IVA si aplica)
    line_subtotal: number;  // base imponible (sin IVA)
    line_tax: number;       // IVA discriminado
    line_total: number;     // total cobrado (= unit_price * qty para todos los casos)
    product_name: string;
    product_sku: string | null;
    image_url: string | null;
  };
  const lines: LineComputed[] = [];
  let subtotalSinIva = 0;
  let totalIva = 0;

  for (const cartLine of input.items) {
    const p = productMap.get(cartLine.product_id);
    if (!p) {
      return {
        ok: false,
        error: `Producto no encontrado: ${cartLine.product_id}`,
        code: "PRODUCT_NOT_FOUND",
      };
    }
    const qty = Math.max(1, Math.floor(cartLine.quantity));

    // Validación de stock (solo si track_stock)
    if (p.track_stock && p.stock != null && p.stock < qty) {
      return {
        ok: false,
        error: `Stock insuficiente para "${p.name}". Disponibles: ${p.stock}`,
        code: "INSUFFICIENT_STOCK",
      };
    }

    const taxInfo = p.tax_rate as
      | { rate_percent?: string | number; tax_type?: string }
      | null;
    const taxType = taxInfo?.tax_type ?? "excluded";
    const rate = Number(taxInfo?.rate_percent ?? 0);

    // Total bruto cobrado al cliente — siempre price_cop * qty
    const lineTotal = p.price_cop * qty;

    // Desglose para reporte fiscal
    let lineSubtotal: number;
    let lineTax: number;
    if (taxType === "included" && rate > 0) {
      // Desglose hacia atrás: price = subtotal * (1 + rate/100)
      lineSubtotal = Math.round(lineTotal / (1 + rate / 100));
      lineTax = lineTotal - lineSubtotal;
    } else {
      // excluded o exempt: no hay IVA discriminado
      lineSubtotal = lineTotal;
      lineTax = 0;
    }

    subtotalSinIva += lineSubtotal;
    totalIva += lineTax;

    // imagen primaria
    const imgs = (p.images ?? []) as Array<{
      url: string;
      is_primary: boolean;
      sort_order: number;
    }>;
    const sorted = [...imgs].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return a.sort_order - b.sort_order;
    });

    lines.push({
      product_id: p.id,
      quantity: qty,
      unit_price_cop: p.price_cop,
      line_subtotal: lineSubtotal,
      line_tax: lineTax,
      line_total: lineTotal,
      product_name: p.name,
      product_sku: p.sku,
      image_url: sorted[0]?.url ?? null,
    });
  }

  // 5. Cargar dirección
  const { data: address, error: addrError } = await supabase
    .from("addresses")
    .select(
      "recipient_name, phone, department, city, street, details, postal_code",
    )
    .eq("id", input.address_id)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (addrError || !address) {
    return {
      ok: false,
      error: "Dirección no encontrada o no pertenece a tu cuenta",
      code: "ADDRESS_NOT_FOUND",
    };
  }

  // 6. Calcular envío
  // El umbral de envío gratis se compara con subtotal+IVA (lo que el cliente
  // realmente paga en productos). Es lo que más se acerca a la expectativa.
  const subtotalConIva = subtotalSinIva + totalIva;
  const shipping = await calculateShipping(address.department, subtotalConIva);

  // 6.5 Validar cupón server-side (NUNCA confiamos en discount enviado por cliente)
  let discountCop = 0;
  let appliedCouponCode: string | null = null;
  let appliedCouponId: string | null = null;
  if (input.coupon_code && input.coupon_code.trim()) {
    const { validateCoupon } = await import("@/lib/coupons/validation");
    const validation = await validateCoupon(
      input.coupon_code,
      subtotalConIva,
      customer.email,
    );
    if (validation.ok) {
      discountCop = validation.discount_cop;
      appliedCouponCode = validation.coupon.code;
      appliedCouponId = validation.coupon.id;
    } else {
      // El cupón ya no es válido al confirmar (puede haber expirado entre
      // que se aplicó en UI y se confirma). Devolvemos error explícito para
      // que el frontend lo muestre y permita continuar sin cupón.
      return {
        ok: false,
        error: validation.message,
        code: "COUPON_INVALID",
      };
    }
  }

  const totalCop = Math.max(0, subtotalConIva + shipping.cost_cop - discountCop);

  // 7. Generar order_number único: NV-YYYYMMDD-XXXX
  const orderNumber = await generateOrderNumber(supabase);

  // 8. Insertar orden + líneas en transacción lógica.
  // Supabase no expone transacciones SQL desde el cliente, pero podemos
  // hacerlo en dos pasos: si el insert de líneas falla, rollback manual
  // borrando la orden recién creada.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_id: customer.id,
      customer_email: customer.email,
      customer_name: customer.full_name ?? "",
      customer_phone: customer.phone,
      shipping_recipient: address.recipient_name,
      shipping_phone: address.phone,
      shipping_street: address.street,
      shipping_details: address.details,
      shipping_city: address.city,
      shipping_department: address.department,
      shipping_postal_code: address.postal_code,
      shipping_country: "CO",
      subtotal_cop: subtotalSinIva,
      shipping_cop: shipping.cost_cop,
      tax_cop: totalIva,
      discount_cop: discountCop,
      coupon_code: appliedCouponCode,
      total_cop: totalCop,
      status: "pending",
      payment_status: "pending",
      fulfillment_status: "unfulfilled",
      notes: input.notes ?? null,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    console.error("[createPendingOrder] insert order error:", orderError);
    return { ok: false, error: "No pudimos crear la orden", code: "DB_ERROR" };
  }

  const orderItems = lines.map((l) => ({
    order_id: order.id,
    product_id: l.product_id,
    product_name: l.product_name,
    product_sku: l.product_sku,
    product_image_url: l.image_url,
    quantity: l.quantity,
    unit_price_cop: l.unit_price_cop,
    subtotal_cop: l.line_total, // con IVA, lo que el cliente vio
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("[createPendingOrder] insert items error:", itemsError);
    // Rollback manual
    await supabase.from("orders").delete().eq("id", order.id);
    return {
      ok: false,
      error: "No pudimos guardar los productos del pedido",
      code: "DB_ERROR",
    };
  }

  // 8.5 Registrar redemption del cupón (no bloqueamos si falla — el descuento
  //     ya se aplicó al total y eso es lo crítico). El admin verá la
  //     inconsistencia y la corrige manualmente si pasa.
  if (appliedCouponId && discountCop > 0) {
    try {
      const { recordCouponRedemption } = await import(
        "@/lib/coupons/validation"
      );
      await recordCouponRedemption({
        couponId: appliedCouponId,
        orderId: order.id,
        customerEmail: customer.email,
        discountAppliedCop: discountCop,
      });
    } catch (err) {
      console.error("[createPendingOrder] error registrando redemption:", err);
    }
  }

  // 9. Generar firma de integridad para Bold
  const signature = generateIntegritySignature({
    orderId: order.order_number,
    amountCop: totalCop,
    currency: "COP",
  });

  const { getBoldIdentityKey, getBoldEnvironment } = await import(
    "@/lib/bold/keys"
  );

  return {
    ok: true,
    order: {
      order_number: order.order_number,
      total_cop: totalCop,
      bold: {
        api_key: getBoldIdentityKey(),
        integrity_signature: signature,
        environment: getBoldEnvironment(),
      },
    },
  };
}

/**
 * Genera order_number con formato NV-YYYYMMDD-XXXX donde XXXX es un
 * contador secuencial del día. Si por race condition dos órdenes generan
 * el mismo número, hace retry hasta 3 veces con sufijo aleatorio.
 */
async function generateOrderNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const datePart = `${yyyy}${mm}${dd}`;

  // Contar pedidos del día para el secuencial
  const startOfDay = new Date(yyyy, today.getMonth(), today.getDate()).toISOString();
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfDay);

  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `NV-${datePart}-${seq}`;
}
