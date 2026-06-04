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
 * El selector de cantidad combina dos UIs: botones − / + a los lados y un
 * <input type="number"> editable en el centro. El input permite teclear
 * cantidades grandes directamente (ej. 12 en vez de tocar + once veces).
 *
 * Si el producto está agotado, ambos botones se deshabilitan con mensaje.
 */
export default function AddToCartButtons({ product, showQuantitySelector = true }: Props) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  // Buffer del input mientras el usuario escribe. Permite estados temporales
  // vacíos sin que el qty real cambie. Se reconcilia con qty en onBlur.
  const [qtyInput, setQtyInput] = useState("1");

  const isAvailable = !product.track_stock || product.stock > 0;
  const maxQty = product.track_stock ? Math.max(1, product.stock) : 99;

  function clamp(n: number) {
    if (!Number.isFinite(n) || n < 1) return 1;
    if (n > maxQty) return maxQty;
    return Math.floor(n);
  }

  function setQtyBoth(n: number) {
    const clamped = clamp(n);
    setQty(clamped);
    setQtyInput(String(clamped));
  }

  function onInputChange(value: string) {
    // Permite el campo vacío como estado transitorio mientras se teclea.
    // Si quedan solo dígitos, sincroniza qty al instante (clampeado).
    setQtyInput(value);
    if (value === "") return;
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) setQty(clamp(n));
  }

  function onInputBlur() {
    // Al perder foco, normaliza: si quedó vacío o inválido, vuelve a qty actual.
    const n = Number.parseInt(qtyInput, 10);
    if (!Number.isFinite(n) || qtyInput === "") {
      setQtyInput(String(qty));
    } else {
      setQtyBoth(n);
    }
  }

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
              onClick={() => setQtyBoth(qty - 1)}
              disabled={qty <= 1}
              className="w-9 h-10 text-[var(--color-leaf-700)] hover:bg-[var(--color-earth-50)] disabled:opacity-40 transition-colors"
              aria-label="Disminuir cantidad"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxQty}
              value={qtyInput}
              onChange={(e) => onInputChange(e.target.value)}
              onBlur={onInputBlur}
              onFocus={(e) => e.target.select()}
              className="nv-qty-input w-12 h-10 text-center font-medium tabular-nums bg-transparent text-[var(--color-leaf-900)] focus:outline-none focus:bg-[var(--color-earth-50)]"
              aria-label="Cantidad"
            />
            <button
              type="button"
              onClick={() => setQtyBoth(qty + 1)}
              disabled={qty >= maxQty}
              className="w-9 h-10 text-[var(--color-leaf-700)] hover:bg-[var(--color-earth-50)] disabled:opacity-40 transition-colors"
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>
          {/* Oculta los spin buttons nativos de <input type="number"> en
              Chrome/Safari/Firefox para no duplicar la UI con nuestros − +. */}
          <style>{`
            .nv-qty-input::-webkit-outer-spin-button,
            .nv-qty-input::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            .nv-qty-input { -moz-appearance: textfield; }
          `}</style>
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
