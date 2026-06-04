"use client";

import { useCart } from "@/lib/cart/use-cart";
import { openCartDrawer } from "@/lib/cart/use-cart-drawer";
import { showToast } from "@/lib/cart/use-toasts";
import type { MouseEvent } from "react";

type QuickAddProduct = {
  id: string;
  slug: string;
  name: string;
  presentation: string | null;
  price_cop: number;
  image_url: string | null;
  /** Si el card ya sabe que está agotado, no muestra el botón. */
  is_out_of_stock?: boolean;
};

type Props = {
  product: QuickAddProduct;
  /** "card" para uso en ProductCard (overlay flotante), "compact" para mini-tarjetas del hero. */
  variant?: "card" | "compact";
  /** Texto accesible alternativo (se muestra como aria-label). */
  ariaLabel?: string;
};

/**
 * Botón "Añadir al carrito" usable dentro de cards de producto que ya
 * son <Link> a la ficha. Detiene la propagación del click para que la
 * navegación del Link envolvente no se dispare.
 *
 * Suma 1 unidad al carrito y muestra un toast con acción "Ver carrito".
 * No abre el drawer automáticamente (el usuario sigue navegando el home).
 *
 * Variantes:
 *   - "card" (default): pill verde con ícono +, se posiciona absoluto
 *     en la esquina inferior derecha del media del ProductCard.
 *   - "compact": botón más pequeño para las mini-tarjetas del hero
 *     (ocupa toda la altura del card al lado derecho).
 *
 * No requiere stock numérico — pasamos stock_at_add=99 porque desde el
 * home no resolvemos disponibilidad fina (el checkout server-action sí
 * valida stock real antes de cobrar).
 */
export default function QuickAddButton({
  product,
  variant = "card",
  ariaLabel,
}: Props) {
  const { addItem } = useCart();

  if (product.is_out_of_stock) return null;

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    // Evita que el <Link> que envuelve al card capture el click.
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
      quantity: 1,
    });

    showToast({
      variant: "success",
      title: `${product.name} agregado al carrito`,
      action: { label: "Ver carrito", onClick: openCartDrawer },
    });
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel ?? `Agregar ${product.name} al carrito`}
        className="nv-quick-add nv-quick-add--compact"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 3h2l2.4 12.4a2 2 0 002 1.6h9.2a2 2 0 002-1.6L23 6H6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 9v6M9 12h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <style>{`
          .nv-quick-add--compact {
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 999px;
            background: var(--color-leaf-700, #1E7D2E);
            color: #FFFFFF;
            border: none;
            cursor: pointer;
            box-shadow: 0 1px 2px rgba(30,125,46,.18), 0 4px 10px rgba(30,125,46,.22);
            transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
          }
          .nv-quick-add--compact:hover {
            background: var(--color-leaf-900, #145824);
            transform: scale(1.08);
            box-shadow: 0 2px 4px rgba(30,125,46,.22), 0 8px 18px rgba(30,125,46,.34);
          }
          .nv-quick-add--compact:active { transform: scale(0.96); }
          .nv-quick-add--compact:focus-visible {
            outline: 2px solid var(--color-iris-700, #4A2E9A);
            outline-offset: 2px;
          }
        `}</style>
      </button>
    );
  }

  // variant === "card": overlay flotante para ProductCard.
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel ?? `Agregar ${product.name} al carrito`}
      className="nv-quick-add nv-quick-add--card"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 3h2l2.4 12.4a2 2 0 002 1.6h9.2a2 2 0 002-1.6L23 6H6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 9v6M9 12h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span>Añadir</span>
      <style>{`
        .nv-quick-add--card {
          position: absolute;
          bottom: 12px;
          right: 12px;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--color-leaf-700, #1E7D2E);
          color: #FFFFFF;
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.2px;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(30,125,46,.18), 0 8px 20px rgba(30,125,46,.28);
          opacity: 0;
          transform: translateY(6px);
          transition: transform .22s ease, opacity .22s ease, background .18s ease, box-shadow .18s ease;
        }
        .group:hover .nv-quick-add--card,
        .nv-quick-add--card:focus-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (hover: none) {
          /* En táctil siempre visible (no hay hover). */
          .nv-quick-add--card { opacity: 1; transform: none; }
        }
        .nv-quick-add--card:hover {
          background: var(--color-leaf-900, #145824);
          box-shadow: 0 2px 4px rgba(30,125,46,.22), 0 12px 26px rgba(30,125,46,.38);
        }
        .nv-quick-add--card:active { transform: scale(0.97); }
        .nv-quick-add--card:focus-visible {
          outline: 2px solid var(--color-iris-700, #4A2E9A);
          outline-offset: 2px;
        }
      `}</style>
    </button>
  );
}
