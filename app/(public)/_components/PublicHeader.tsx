"use client";

import Link from "next/link";
import { useCartCount } from "@/lib/cart/use-cart";
import { useCartDrawer } from "@/lib/cart/use-cart-drawer";
import SearchBar from "./SearchBar";
import AccountLink from "./AccountLink";

export default function PublicHeader() {
  const cartCount = useCartCount();
  const { open: openCart } = useCartDrawer();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[var(--color-earth-100)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0"
          aria-label="NaturalVita inicio"
        >
          <span className="w-8 h-8 rounded-full bg-[var(--color-leaf-700)] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2c-2 4-6 6-6 11a6 6 0 0012 0c0-5-4-7-6-11z"
                fill="white"
                opacity="0.95"
              />
              <path
                d="M12 8c-1 2-3 3-3 6"
                stroke="var(--color-leaf-700)"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          </span>
          <span className="font-serif text-xl text-[var(--color-leaf-900)] hidden sm:inline tracking-tight">
            NaturalVita
          </span>
        </Link>

        {/* Navegación principal · oculta en mobile */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/tienda"
            className="text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)] font-medium"
          >
            Tienda
          </Link>
          <Link
            href="/buscar"
            className="text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)] font-medium"
          >
            Buscar
          </Link>
          <Link
            href="/legal/envios"
            className="text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)] font-medium"
          >
            Envíos
          </Link>
        </nav>

        {/* Acciones lado derecho */}
        <div className="flex items-center gap-2">
          {/* Búsqueda · expandible en header con submit a /buscar */}
          <SearchBar variant="header" />

          {/* Cuenta · cambia entre /iniciar-sesion y /mi-cuenta según auth */}
          <AccountLink />

          {/* Carrito */}
          <button
            type="button"
            onClick={openCart}
            className="relative p-2 rounded-lg text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)]"
            aria-label={`Abrir carrito${cartCount > 0 ? `, ${cartCount} productos` : ""}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 3h2l2.4 12.4a2 2 0 002 1.6h9.2a2 2 0 002-1.6L23 6H6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="20" r="1.6" fill="currentColor" />
              <circle cx="18" cy="20" r="1.6" fill="currentColor" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-iris-700)] text-white text-[10px] font-medium flex items-center justify-center tabular-nums">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sub-navegación mobile · solo en pantallas pequeñas */}
      <nav className="md:hidden border-t border-[var(--color-earth-100)] px-4 py-2 flex gap-4 text-xs overflow-x-auto">
        <Link href="/tienda" className="text-[var(--color-leaf-900)] font-medium whitespace-nowrap">
          Tienda
        </Link>
        <Link
          href="/buscar"
          className="text-[var(--color-earth-700)] whitespace-nowrap"
        >
          Buscar
        </Link>
        <Link
          href="/legal/envios"
          className="text-[var(--color-earth-700)] whitespace-nowrap"
        >
          Envíos
        </Link>
      </nav>
    </header>
  );
}
