"use client";

import Link from "next/link";
import Image from "next/image";
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
        {/* Logo de marca: imagen oficial del manual (la misma flor que
            aparece arriba en la metáfora raíz/flor de EverlifeOrigin).
            El PNG ya contiene la marca completa "NaturalVita" + ícono. */}
        <Link
          href="/"
          className="shrink-0 inline-flex items-center"
          aria-label="NaturalVita · Inicio"
        >
          <Image
            src="/home/naturalvita-logo.webp"
            alt="NaturalVita"
            width={816}
            height={502}
            priority
            className="h-11 w-auto"
          />
        </Link>

        {/* Navegación principal · oculta en mobile.
            Lógica de los 3 links: catálogo (Tienda) + los dos hubs de
            confianza que respaldan el catálogo (Laboratorios aliados y
            Sobre nosotros / Everlife). La búsqueda vive en el SearchBar
            visible al lado, no es un link aparte. Envíos/devoluciones
            viven en el footer, no aquí. */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/tienda"
            className="text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)] font-medium"
          >
            Tienda
          </Link>
          <Link
            href="/laboratorio"
            className="text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)] font-medium"
          >
            Laboratorios
          </Link>
          <Link
            href="/sobre-nosotros"
            className="text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)] font-medium"
          >
            Sobre nosotros
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
          href="/laboratorio"
          className="text-[var(--color-earth-700)] whitespace-nowrap"
        >
          Laboratorios
        </Link>
        <Link
          href="/sobre-nosotros"
          className="text-[var(--color-earth-700)] whitespace-nowrap"
        >
          Sobre nosotros
        </Link>
      </nav>
    </header>
  );
}
