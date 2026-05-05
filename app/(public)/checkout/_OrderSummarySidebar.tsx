"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart/use-cart";
import { formatCop } from "@/lib/format/currency";
import CouponInput from "./_CouponInput";

type Props = {
  /** Departamento de la dirección seleccionada. null = no calcular envío. */
  shippingDepartment: string | null;
  /** Notifica al padre el quote calculado para que pueda usarlo al confirmar. */
  onQuoteChange?: (quote: ShippingQuote | null) => void;
  /** Notifica cambios de cupón al padre */
  onCouponChange?: (code: string | null, discountCop: number) => void;
};

type ShippingQuote = {
  cost_cop: number;
  base_cost_cop: number;
  free_above_cop: number | null;
  is_free: boolean;
  amount_to_free: number | null;
};

/**
 * Sidebar del checkout con cálculo en vivo.
 *
 * Cuando el usuario selecciona una dirección, este componente hace fetch a
 * /api/checkout/shipping con el departamento + subtotal con IVA, y muestra
 * el envío real. El total se actualiza automáticamente.
 *
 * Si el cliente está cerca del umbral de envío gratis, mostramos un mensaje
 * "Te faltan $X para envío gratis" — patrón que aumenta el ticket promedio.
 */
export default function OrderSummarySidebar({
  shippingDepartment,
  onQuoteChange,
  onCouponChange,
}: Props) {
  const { items, subtotal, quantity } = useCart();

  // El subtotal del carrito ya es el precio bruto que el cliente paga
  // (price_cop ya incluye IVA cuando aplica, según tax_type del producto).
  // Aquí no desglosamos IVA porque para hacerlo correctamente necesitaríamos
  // enviar el tax_type de cada producto al carrito; hoy el carrito en
  // localStorage solo guarda price_cop bruto. El desglose preciso (con IVA
  // de 19%/5%/0% según producto) se calcula server-side al crear la orden y
  // aparece en el email de confirmación y en la factura.
  const subtotalBruto = subtotal;

  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

  useEffect(() => {
    if (!shippingDepartment) {
      setQuote(null);
      onQuoteChange?.(null);
      return;
    }
    setLoadingShipping(true);
    const controller = new AbortController();
    fetch(
      `/api/checkout/shipping?department=${encodeURIComponent(shippingDepartment)}&subtotal=${subtotalBruto}`,
      { signal: controller.signal },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ShippingQuote | null) => {
        setQuote(data);
        onQuoteChange?.(data);
        setLoadingShipping(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("[shipping fetch]", err);
        setLoadingShipping(false);
      });
    return () => controller.abort();
  }, [shippingDepartment, subtotalBruto, onQuoteChange]);

  const [couponState, setCouponState] = useState<{
    code: string;
    discount_cop: number;
  } | null>(null);

  const handleCouponChange = (code: string | null, discountCop: number) => {
    if (code && discountCop > 0) {
      setCouponState({ code, discount_cop: discountCop });
    } else {
      setCouponState(null);
    }
    onCouponChange?.(code, discountCop);
  };

  const discountCop = couponState?.discount_cop ?? 0;
  const total = Math.max(
    0,
    subtotalBruto + (quote?.cost_cop ?? 0) - discountCop,
  );

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-2xl bg-[var(--color-earth-50)] p-5 border border-[var(--color-earth-100)]">
        <h2 className="font-serif text-lg text-[var(--color-leaf-900)] mb-4">
          Tu pedido
        </h2>

        <ul className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.product_id} className="flex gap-3">
              <div className="shrink-0 w-14 h-14 rounded-lg bg-white relative overflow-hidden">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    sizes="56px"
                    className="object-contain p-1"
                    unoptimized
                  />
                ) : null}
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[var(--color-leaf-900)] text-white text-[10px] font-medium flex items-center justify-center tabular-nums">
                  {item.quantity}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--color-leaf-900)] line-clamp-2 leading-snug">
                  {item.name}
                </p>
                {item.presentation && (
                  <p className="text-[10px] text-[var(--color-earth-500)] mt-0.5">
                    {item.presentation}
                  </p>
                )}
                <p className="text-xs text-[var(--color-leaf-900)] tabular-nums mt-1">
                  {formatCop(item.price_cop * item.quantity)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 text-sm pt-4 border-t border-[var(--color-earth-100)]">
          <div className="flex justify-between text-[var(--color-earth-700)]">
            <dt>
              Subtotal{" "}
              <span className="text-[var(--color-earth-500)]">
                ({quantity} {quantity === 1 ? "producto" : "productos"})
              </span>
            </dt>
            <dd className="text-[var(--color-leaf-900)] tabular-nums">
              {formatCop(subtotalBruto)}
            </dd>
          </div>
          <div className="flex justify-between text-[var(--color-earth-700)]">
            <dt>Envío</dt>
            <dd className="tabular-nums">
              {loadingShipping ? (
                <span className="text-[var(--color-earth-500)]">Calculando…</span>
              ) : !quote ? (
                <span className="text-[var(--color-earth-500)]">
                  Selecciona dirección
                </span>
              ) : quote.is_free ? (
                <span className="text-[var(--color-leaf-700)] font-medium">
                  Gratis
                </span>
              ) : (
                <span className="text-[var(--color-leaf-900)]">
                  {formatCop(quote.cost_cop)}
                </span>
              )}
            </dd>
          </div>
        </dl>

        {/* Mensaje de "te faltan $X para envío gratis" */}
        {quote &&
          !quote.is_free &&
          quote.amount_to_free != null &&
          quote.amount_to_free > 0 && (
            <p className="mt-3 text-xs text-[var(--color-iris-700)] bg-[var(--color-iris-100)]/40 rounded-lg px-3 py-2">
              ✨ Agrega {formatCop(quote.amount_to_free)} más a tu carrito y el
              envío te sale gratis.
            </p>
          )}

        {/* Input de cupón */}
        <div className="mt-4 pt-4 border-t border-[var(--color-earth-100)]">
          <CouponInput
            subtotalCop={subtotalBruto}
            onApply={(code, discount) => handleCouponChange(code, discount)}
            onRemove={() => handleCouponChange(null, 0)}
          />
        </div>

        {/* Línea de descuento si hay cupón */}
        {discountCop > 0 && couponState && (
          <div className="mt-3 flex justify-between text-sm text-[var(--color-leaf-700)]">
            <dt className="flex items-center gap-1.5">
              <span>Descuento</span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--color-leaf-100)] text-[var(--color-leaf-900)]">
                {couponState.code}
              </span>
            </dt>
            <dd className="tabular-nums font-medium">
              −{formatCop(discountCop)}
            </dd>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-[var(--color-earth-100)] flex justify-between items-baseline">
          <span className="text-sm text-[var(--color-earth-700)]">Total</span>
          <span className="font-serif text-2xl text-[var(--color-leaf-900)] tabular-nums">
            {formatCop(total)}
          </span>
        </div>

        <p className="text-[10px] text-center text-[var(--color-earth-500)] mt-4 leading-relaxed">
          Pagos seguros con Bold · Tarjetas, PSE, Nequi y QR
          <br />
          Despacho a todo Colombia
        </p>
      </div>
    </aside>
  );
}
