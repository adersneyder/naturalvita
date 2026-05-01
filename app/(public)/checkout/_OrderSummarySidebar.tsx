"use client";

import Image from "next/image";
import { useCart } from "@/lib/cart/use-cart";
import { formatCop } from "@/lib/format/currency";

/**
 * Resumen lateral del pedido en el checkout. Sticky en desktop.
 * Muestra los items con thumbnail pequeño + cantidad + precio, y los totales.
 *
 * Envío y total final se muestran "calculados al confirmar" porque el cálculo
 * por departamento + descuentos vive en Sesión C (Bold + shipping_rates).
 * Aquí solo confirmamos el subtotal de productos.
 */
export default function OrderSummarySidebar() {
  const { items, subtotal, quantity } = useCart();

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-2xl bg-[var(--color-earth-50)] p-5 border border-[var(--color-earth-100)]">
        <h2 className="font-serif text-lg text-[var(--color-leaf-900)] mb-4">
          Tu pedido
        </h2>

        <ul className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
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
              {formatCop(subtotal)}
            </dd>
          </div>
          <div className="flex justify-between text-[var(--color-earth-500)]">
            <dt>Envío</dt>
            <dd>Calculado al confirmar</dd>
          </div>
        </dl>

        <div className="mt-4 pt-4 border-t border-[var(--color-earth-100)] flex justify-between items-baseline">
          <span className="text-sm text-[var(--color-earth-700)]">
            Total estimado
          </span>
          <span className="font-serif text-2xl text-[var(--color-leaf-900)] tabular-nums">
            {formatCop(subtotal)}
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
