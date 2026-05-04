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
  items: CartLineInput[];
  address_id: string;
  notes?: string;
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

export async function createPendingOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const supabase = await createClient();
  const customer = await requireCustomer({ redirectTo: "/checkout" });

  if (!input.items || input.items.length === 0) {
    return { ok: false, error: "El carrito está vacío", code: "EMPTY_CART" };
  }

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

  const productMap = new Map(products.map((p) => [p.id, p]));
  type LineComputed = {
    product_id: string;
    quantity: number;
    unit_price_cop: number;
    line_subtotal: number;
    line_tax: number;
    line_total: number;
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

    const lineTotal = p.price_cop * qty;

    let lineSubtotal: number;
    let lineTax: number;
    if (taxType === "included" && rate > 0) {
      lineSubtotal = Math.round(lineTotal / (1 + rate / 100));
      lineTax = lineTotal - lineSubtotal;
    } else {
      lineSubtotal = lineTotal;
      lineTax = 0;
    }

    subtotalSinIva += lineSubtotal;
    totalIva += lineTax;

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

  const subtotalConIva = subtotalSinIva + totalIva;
  const shipping = await calculateShipping(address.department, subtotalConIva);
  const totalCop = subtotalConIva + shipping.cost_cop;

  // Insertar orden con retry sobre order_number colisionado.
  // El order_number ahora usa sufijo random alfanumérico de 4 caracteres
  // (ej: NV-20260504-A7K3), eliminando race conditions del contador.
  let order: { id: string; order_number: string } | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = generateOrderNumber();

    const { data, error } = await supabase
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
        discount_cop: 0,
        total_cop: totalCop,
        status: "pending",
        payment_status: "pending",
        fulfillment_status: "unfulfilled",
        notes: input.notes ?? null,
      })
      .select("id, order_number")
      .single();

    if (data && !error) {
      order = data;
      break;
    }

    lastError = error;
    // Si el error es de unique constraint en order_number, reintentamos.
    // Para cualquier otro error, salimos del loop.
    if (error && error.code !== "23505") {
      break;
    }
    // Pequeño jitter para no chocar con la otra request rival (si existe)
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
  }

  if (!order) {
    console.error("[createPendingOrder] insert order error:", lastError);
    return { ok: false, error: "No pudimos crear la orden", code: "DB_ERROR" };
  }

  const orderItems = lines.map((l) => ({
    order_id: order!.id,
    product_id: l.product_id,
    product_name: l.product_name,
    product_sku: l.product_sku,
    product_image_url: l.image_url,
    quantity: l.quantity,
    unit_price_cop: l.unit_price_cop,
    subtotal_cop: l.line_total,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("[createPendingOrder] insert items error:", itemsError);
    await supabase.from("orders").delete().eq("id", order.id);
    return {
      ok: false,
      error: "No pudimos guardar los productos del pedido",
      code: "DB_ERROR",
    };
  }

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
 * Genera order_number con formato NV-YYYYMMDD-XXXX donde XXXX es un sufijo
 * alfanumérico aleatorio (consonantes mayúsculas + dígitos, sin caracteres
 * ambiguos como I, O, 0, 1).
 *
 * Espacio: 28 caracteres ^ 4 = 614,656 combinaciones por día. Probabilidad
 * de colisión por día con 100 órdenes diarias: ~0.0008%. Con 1000 órdenes
 * diarias: ~0.08%. La función `createPendingOrder` ya tiene retry para esos
 * casos extremos.
 *
 * Se prefirió sobre un secuencial por dos razones:
 *   1. Sin race conditions (el secuencial requería COUNT + INSERT que no
 *      es atómico → dos requests concurrentes generaban el mismo número).
 *   2. Sin pista del volumen real para ojos externos (un pedido número
 *      0042 le dice al cliente que probablemente apenas vendiste 42).
 */
function generateOrderNumber(): string {
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(today.getUTCDate()).padStart(2, "0");
  const datePart = `${yyyy}${mm}${dd}`;

  // Alfabeto sin caracteres ambiguos
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }

  return `NV-${datePart}-${suffix}`;
}
