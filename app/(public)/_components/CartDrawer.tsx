"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart/use-cart";
import { useCartDrawer } from "@/lib/cart/use-cart-drawer";
import { formatCop } from "@/lib/format/currency";

export default function CartDrawer() {
  const { isOpen, close } = useCartDrawer();
  const { items, subtotal, removeItem, updateQuantity } = useCart();

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        onClick={close}
        className="fixed inset-0 z-40 bg-black/40 animate-fade-in"
        aria-label="Cerrar carrito"
      />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl flex flex-col animate-slide-in-right"
        aria-label="Tu carrito de compras"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-earth-100)] flex items-center justify-between">
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] m-0">Tu carrito</h2>
          <button
            type="button"
            onClick={close}
            className="text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)] -mr-2 p-2 rounded-lg hover:bg-[var(--color-earth-50)]"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Lista de items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-earth-50)] flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 3h2l2.4 12.4a2 2 0 002 1.6h9.2a2 2 0 002-1.6L23 6H6"
                    stroke="var(--color-earth-500)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="9" cy="20" r="1.6" fill="var(--color-earth-500)" />
                  <circle cx="18" cy="20" r="1.6" fill="var(--color-earth-500)" />
                </svg>
              </div>
              <p className="font-serif text-lg text-[var(--color-leaf-900)] m-0 mb-1">
                Tu carrito está vacío
              </p>
              <p className="text-sm text-[var(--color-earth-700)] m-0">
                Explora el catálogo y agrega productos para empezar.
              </p>
              <Link
                href="/tienda"
                onClick={close}
                className="mt-5 inline-flex px-5 py-2.5 bg-[var(--color-iris-700)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-iris-900)]"
              >
                Ir a la tienda
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-earth-100)]">
              {items.map((item) => (
                <li key={item.product_id} className="p-4 flex gap-3">
                  <Link
                    href={`/producto/${item.slug}`}
                    onClick={close}
                    className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-earth-50)] flex items-center justify-center"
                  >
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-[var(--color-earth-500)] text-xs">sin foto</span>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/producto/${item.slug}`}
                      onClick={close}
                      className="text-sm font-medium text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)] line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    {item.presentation && (
                      <p className="text-xs text-[var(--color-earth-700)] m-0 mt-0.5">
                        {item.presentation}
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center bg-[var(--color-earth-50)] rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="w-7 h-7 text-[var(--color-leaf-700)] hover:bg-[var(--color-earth-100)] transition-colors text-sm"
                          aria-label="Disminuir"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-sm font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock_at_add}
                          className="w-7 h-7 text-[var(--color-leaf-700)] hover:bg-[var(--color-earth-100)] disabled:opacity-40 transition-colors text-sm"
                          aria-label="Aumentar"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-medium text-[var(--color-leaf-900)] tabular-nums">
                        {formatCop(item.price_cop * item.quantity)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.product_id)}
                    className="shrink-0 -mr-1 -mt-1 p-1 text-[var(--color-earth-500)] hover:text-red-600 self-start"
                    aria-label="Eliminar del carrito"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer con total y CTA */}
        {items.length > 0 && (
          <div className="border-t border-[var(--color-earth-100)] p-5 bg-[var(--color-earth-50)]">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm text-[var(--color-earth-700)]">Subtotal</span>
              <span className="font-serif text-2xl text-[var(--color-leaf-900)] tabular-nums">
                {formatCop(subtotal)}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-earth-700)] mb-3 m-0">
              Envío e impuestos calculados al finalizar la compra.
            </p>
            <button
              type="button"
              disabled
              title="El proceso de pago estará disponible próximamente"
              className="w-full px-5 py-3 bg-[var(--color-earth-100)] text-[var(--color-earth-500)] rounded-xl font-medium cursor-not-allowed"
            >
              Proceder al pago
            </button>
            <p className="text-[11px] text-[var(--color-earth-500)] text-center mt-2 m-0">
              Próximamente
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
