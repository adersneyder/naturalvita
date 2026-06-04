"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/use-cart";
import { openCartDrawer } from "@/lib/cart/use-cart-drawer";
import { showToast } from "@/lib/cart/use-toasts";
import type { ChangeEvent, FocusEvent, MouseEvent } from "react";

type QuickAddProduct = {
  id: string;
  slug: string;
  name: string;
  presentation: string | null;
  price_cop: number;
  image_url: string | null;
  /** Si el card ya sabe que está agotado, no muestra el control. */
  is_out_of_stock?: boolean;
};

type Props = {
  product: QuickAddProduct;
};

/**
 * Control inline "agregar al carrito" con selector de cantidad. Usable
 * dentro de cards de producto que ya son <Link> a la ficha.
 *
 * Layout: [− N +] [Añadir 🛒]
 *   - Botones − / + ajustan en 1
 *   - El número es <input type="number"> editable (teclea 12, etc.)
 *   - Botón "Añadir" suma N unidades, muestra toast con acción "Ver carrito"
 *     y no abre el drawer (deja al usuario seguir navegando).
 *
 * Detiene la propagación de todos los clicks y de mousedown/touchstart
 * para que ni el navegado del <Link> envolvente ni el Link sub-tarjetas
 * se disparen accidentalmente.
 *
 * Stock: se pasa stock_at_add=99 porque desde el home no resolvemos
 * disponibilidad fina; el server-action de checkout valida stock real
 * antes de cobrar.
 */
export default function QuickAddButton({ product }: Props) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [qtyInput, setQtyInput] = useState("1");

  if (product.is_out_of_stock) return null;

  function clamp(n: number) {
    if (!Number.isFinite(n) || n < 1) return 1;
    if (n > 99) return 99;
    return Math.floor(n);
  }
  function setQtyBoth(n: number) {
    const c = clamp(n);
    setQty(c);
    setQtyInput(String(c));
  }
  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQtyInput(v);
    if (v === "") return;
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n)) setQty(clamp(n));
  }
  function onInputBlur() {
    const n = Number.parseInt(qtyInput, 10);
    if (!Number.isFinite(n) || qtyInput === "") setQtyInput(String(qty));
    else setQtyBoth(n);
  }

  /** Stop bubbling para que el <Link> envolvente no navegue al producto. */
  function stop(e: MouseEvent | FocusEvent) {
    e.stopPropagation();
    if ("preventDefault" in e) e.preventDefault();
  }

  function handleAdd(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      product_id: product.id,
      slug: product.slug,
      name: product.name,
      presentation: product.presentation,
      price_cop: product.price_cop,
      image_url: product.image_url,
      stock_at_add: 99,
      quantity: qty,
    });

    showToast({
      variant: "success",
      title: `${product.name} agregado al carrito`,
      description: qty > 1 ? `${qty} unidades` : undefined,
      action: { label: "Ver carrito", onClick: openCartDrawer },
    });
  }

  return (
    <div
      className="nv-quick-add"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="nv-quick-add__qty">
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setQtyBoth(qty - 1);
          }}
          disabled={qty <= 1}
          className="nv-quick-add__step"
          aria-label="Disminuir cantidad"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          value={qtyInput}
          onChange={onInputChange}
          onBlur={onInputBlur}
          onClick={stop}
          onFocus={(e) => {
            e.stopPropagation();
            e.target.select();
          }}
          className="nv-quick-add__input"
          aria-label="Cantidad"
        />
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setQtyBoth(qty + 1);
          }}
          disabled={qty >= 99}
          className="nv-quick-add__step"
          aria-label="Aumentar cantidad"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="nv-quick-add__add"
        aria-label={`Agregar ${product.name} al carrito`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 3h2l2.4 12.4a2 2 0 002 1.6h9.2a2 2 0 002-1.6L23 6H6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Añadir</span>
      </button>

      <style>{`
        .nv-quick-add {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .nv-quick-add__qty {
          display: inline-flex;
          align-items: center;
          background: #FFFFFF;
          border: 1px solid #ECE4D4;
          border-radius: 8px;
          overflow: hidden;
          height: 32px;
        }
        .nv-quick-add__step {
          width: 26px; height: 100%;
          background: transparent;
          border: none;
          color: var(--color-leaf-700, #1E7D2E);
          font-size: 16px;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          transition: background .15s ease;
        }
        .nv-quick-add__step:hover:not(:disabled) {
          background: #F5F1E8;
        }
        .nv-quick-add__step:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .nv-quick-add__input {
          width: 32px; height: 100%;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          background: transparent;
          color: #2A2722;
          border: none;
          border-left: 1px solid #ECE4D4;
          border-right: 1px solid #ECE4D4;
          -moz-appearance: textfield;
        }
        .nv-quick-add__input::-webkit-outer-spin-button,
        .nv-quick-add__input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .nv-quick-add__input:focus { outline: none; background: #F5F1E8; }
        .nv-quick-add__add {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 12px;
          background: var(--color-leaf-700, #1E7D2E);
          color: #FFFFFF;
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.2px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(30,125,46,.18), 0 4px 10px rgba(30,125,46,.18);
          transition: background .18s ease, transform .15s ease, box-shadow .18s ease;
        }
        .nv-quick-add__add:hover {
          background: var(--color-leaf-900, #145824);
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(30,125,46,.22), 0 8px 18px rgba(30,125,46,.28);
        }
        .nv-quick-add__add:active { transform: scale(0.97); }
        .nv-quick-add__add:focus-visible {
          outline: 2px solid var(--color-iris-700, #4A2E9A);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
