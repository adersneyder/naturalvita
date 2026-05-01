"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart/use-cart";
import { formatCop } from "@/lib/format/currency";

export default function CartPageContent() {
  const { items, subtotal, quantity, removeItem, updateQuantity, clear } =
    useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <p className="text-[var(--color-earth-700)] text-base">
          Tu carrito está vacío.
        </p>
        <p className="text-sm text-[var(--color-earth-500)] mt-2">
          Explora la tienda y agrega los productos que te interesan.
        </p>
        <Link
          href="/tienda"
          className="inline-block mt-6 px-5 py-3 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)]"
        >
          Ir a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8">
      {/* Lista de items */}
      <div>
        <ul className="divide-y divide-[var(--color-earth-100)]">
          {items.map((item) => (
            <li key={item.product_id} className="py-4 flex gap-4">
              <Link
                href={`/producto/${item.slug}`}
                className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-[var(--color-earth-50)] overflow-hidden relative"
              >
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    sizes="96px"
                    className="object-contain p-2"
                    unoptimized
                  />
                ) : null}
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/producto/${item.slug}`}
                      className="font-serif text-base text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)] line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    {item.presentation && (
                      <p className="text-xs text-[var(--color-earth-700)] mt-0.5">
                        {item.presentation}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.product_id)}
                    className="p-1 rounded text-[var(--color-earth-500)] hover:text-red-700 hover:bg-red-50 shrink-0"
                    aria-label={`Eliminar ${item.name} del carrito`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-end justify-between mt-3">
                  <QuantityStepper
                    value={item.quantity}
                    max={item.stock_at_add}
                    onChange={(v) => updateQuantity(item.product_id, v)}
                  />
                  <p className="text-base font-medium text-[var(--color-leaf-900)] tabular-nums">
                    {formatCop(item.price_cop * item.quantity)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/tienda"
            className="text-sm text-[var(--color-iris-700)] hover:underline"
          >
            ← Seguir comprando
          </Link>
          <button
            type="button"
            onClick={clear}
            className="text-xs text-[var(--color-earth-500)] hover:text-red-700 underline underline-offset-4"
          >
            Vaciar carrito
          </button>
        </div>
      </div>

      {/* Resumen */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl bg-[var(--color-earth-50)] p-5 border border-[var(--color-earth-100)]">
          <h2 className="font-serif text-lg text-[var(--color-leaf-900)] mb-4">
            Resumen
          </h2>

          <dl className="space-y-2 text-sm">
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
              <dd>Calculado en checkout</dd>
            </div>
          </dl>

          <div className="mt-4 pt-4 border-t border-[var(--color-earth-100)] flex justify-between items-baseline">
            <span className="text-sm text-[var(--color-earth-700)]">Total estimado</span>
            <span className="font-serif text-2xl text-[var(--color-leaf-900)] tabular-nums">
              {formatCop(subtotal)}
            </span>
          </div>

          <Link
            href="/checkout"
            className="mt-5 block w-full text-center px-4 py-3 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)]"
          >
            Continuar al pago
          </Link>

          <p className="text-[10px] text-center text-[var(--color-earth-500)] mt-3 leading-relaxed">
            Pagos seguros con Bold. Tarjetas, PSE, Nequi y QR.
            <br />
            Despacho a todo Colombia.
          </p>
        </div>
      </aside>
    </div>
  );
}

function QuantityStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-[var(--color-earth-100)] bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className="w-8 h-8 flex items-center justify-center text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)] rounded-l-lg disabled:opacity-40"
        aria-label="Disminuir cantidad"
      >
        <Minus size={14} />
      </button>
      <span className="w-10 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-8 h-8 flex items-center justify-center text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)] rounded-r-lg disabled:opacity-40"
        aria-label="Aumentar cantidad"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
