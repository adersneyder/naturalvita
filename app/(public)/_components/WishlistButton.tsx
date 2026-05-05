"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlistAction } from "../_actions/wishlist";

type Props = {
  productId: string;
  initialInWishlist: boolean;
  /** Tamaño del icono en px */
  size?: number;
  className?: string;
};

/**
 * Botón de corazón para agregar/quitar de favoritos.
 *
 * Comportamiento:
 *   - Si el usuario NO está autenticado: redirige a /iniciar-sesion con
 *     return URL para que vuelva al producto después de autenticarse.
 *   - Si está autenticado: toggle optimista (UI actualiza inmediatamente,
 *     server action confirma en background).
 *   - Si el server action falla: revierte el estado optimista.
 */
export default function WishlistButton({
  productId,
  initialInWishlist,
  size = 22,
  className = "",
}: Props) {
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    // Optimistic update
    const prevState = inWishlist;
    setInWishlist(!prevState);

    startTransition(async () => {
      const result = await toggleWishlistAction(productId);
      if (!result.ok) {
        if (result.error === "no_session") {
          // No hay sesión — revertimos y redirigimos a login
          setInWishlist(prevState);
          router.push(
            `/iniciar-sesion?next=${encodeURIComponent(
              window.location.pathname,
            )}`,
          );
          return;
        }
        // Otro error — revertir
        setInWishlist(prevState);
        console.error("[wishlist] toggle falló:", result.error);
      }
    });
  }

  return (
    <button
      type="button"
      aria-label={inWishlist ? "Quitar de favoritos" : "Agregar a favoritos"}
      aria-pressed={inWishlist}
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center justify-center transition-all duration-150
        ${isPending ? "opacity-50" : "hover:scale-110"}
        ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={inWishlist ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          inWishlist
            ? "text-red-500"
            : "text-[var(--color-earth-500)] hover:text-red-400"
        }
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
