"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/use-cart";
import { openCartDrawer } from "@/lib/cart/use-cart-drawer";
import { showToast } from "@/lib/cart/use-toasts";

type Props = {
  product: {
    id: string;
    slug: string;
    name: string;
    presentation: string | null;
    price_cop: number;
    image_url: string | null;
    stock: number;
    track_stock: boolean;
  };
  /** Si true, muestra selector de cantidad. Si false, agrega 1. Default true. */
  showQuantitySelector?: boolean;
};

/**
 * Acciones de compra para la página de producto. Dos botones:
 *   - "Agregar al carrito" (secundario, outline púrpura): suma al carrito sin abrir drawer.
 *     Aparece toast de confirmación con acción "Ver carrito".
 *   - "Comprar ahora" (primario, púrpura sólido): suma al carrito Y abre drawer lateral.
 *
 * Si el producto está agotado, ambos botones se deshabilitan con mensaje.
 */
export default function AddToCartButtons({ product, showQuantitySelector = true }: Props) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);

  const isAvailable = !product.track_stock || product.stock > 0;
  const maxQty = product.track_stock ? Math.max(1, product.stock) : 99;

  function add(openDrawerAfter: boolean) {
    if (!isAvailable) return;
    addItem({
      product_id: product.id,
      slug: product.slug,
      name: product.name,
      presentation: product.presentation,
      price_cop: product.price_cop,
      image_url: product.image_url,
      stock_at_add: product.track_stock ? product.stock : 99,
      quantity: qty,
    });

    if (openDrawerAfter) {
      openCartDrawer();
    } else {
      showToast({
        variant: "success",
        title: `${product.name} agregado al carrito`,
        description: qty > 1 ? `${qty} unidades` : undefined,
        action: { label: "Ver carrito", onClick: openCartDrawer },
      });
    }
  }

  if (!isAvailable) {
    return (
      <div className="flex flex-col gap-2">
        <button
          disabled
          className="w-full px-6 py-3.5 bg-[var(--color-earth-100)] text-[var(--color-earth-500)] rounded-xl font-medium cursor-not-allowed"
        >
          Agotado
        </button>
        <p className="text-xs text-[var(--color-earth-700)] text-center">
          Este producto se encuentra temporalmente sin existencias.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {showQuantitySelector && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-earth-700)]">Cantidad</span>
          <div className="inline-flex items-center bg-white border border-[var(--color-earth-100)] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="w-9 h-10 text-[var(--color-leaf-700)] hover:bg-[var(--color-earth-50)] disabled:opacity-40 transition-colors"
              aria-label="Disminuir cantidad"
            >
              −
            </button>
            <span
              className="w-10 text-center font-medium tabular-nums select-none"
              aria-live="polite"
            >
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              className="w-9 h-10 text-[var(--color-leaf-700)] hover:bg-[var(--color-earth-50)] disabled:opacity-40 transition-colors"
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => add(false)}
          className="flex-1 px-6 py-3.5 bg-white border-2 border-[var(--color-iris-700)] text-[var(--color-iris-700)] rounded-xl font-medium hover:bg-[var(--color-iris-50)] transition-colors"
        >
          Agregar al carrito
        </button>
        <button
          type="button"
          onClick={() => add(true)}
          className="flex-1 px-6 py-3.5 bg-[var(--color-iris-700)] text-white rounded-xl font-medium hover:bg-[var(--color-iris-900)] transition-colors shadow-sm"
        >
          Comprar ahora
        </button>
      </div>
    </div>
  );
}
