"use client";

import { useEffect, useState } from "react";

/**
 * Botón flotante "volver arriba". Aparece tras scrollear > 400px,
 * con fade-in. Click hace scroll suave a 0,0.
 *
 * Posicionado inferior-derecha. En móvil deja espacio para no
 * tapar el chat agent cuando se monte (z-30 < z-40 del chat).
 *
 * Color iris (acento de la marca) con hover más oscuro. Cumple
 * accesibilidad: focus visible, aria-label, tamaño táctil 44x44.
 */
export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Volver al inicio de la página"
      className={`fixed bottom-6 right-6 z-30 w-11 h-11 rounded-full bg-[var(--color-iris-700)] text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:bg-[var(--color-iris-900)] hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-iris-700)] focus-visible:ring-offset-2 ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none"
      }`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 19V5M5 12l7-7 7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
