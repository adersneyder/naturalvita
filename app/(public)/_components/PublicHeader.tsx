"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCartCount } from "@/lib/cart/use-cart";
import { useCartDrawer } from "@/lib/cart/use-cart-drawer";
import SearchBar from "./SearchBar";
import AccountLink from "./AccountLink";

const NAV_ITEMS = [
  { href: "/tienda", label: "Tienda" },
  { href: "/laboratorio", label: "Laboratorios" },
  { href: "/sobre-nosotros", label: "Sobre nosotros" },
] as const;

export default function PublicHeader() {
  const cartCount = useCartCount();
  const { open: openCart } = useCartDrawer();
  const pathname = usePathname();

  // Activo cuando coincide exacto O cuando la ruta actual está dentro
  // del segmento (ej. /tienda/categoria/x marca "Tienda" como activo,
  // /sobre-nosotros/equipo marca "Sobre nosotros").
  function isActive(href: string): boolean {
    if (pathname === href) return true;
    return pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[var(--color-earth-100)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
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

        {/* Navegación principal · oculta en mobile. El estado activo se
            indica con color iris (acento) + underline animado. Los
            inactivos quedan en color leaf-900 y cambian a iris en hover. */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative font-medium transition-colors py-1 ${
                  active
                    ? "text-[var(--color-iris-700)]"
                    : "text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)]"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-[var(--color-iris-700)] rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Acciones lado derecho */}
        <div className="flex items-center gap-2">
          <SearchBar variant="header" />
          <AccountLink />
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

      {/* Sub-navegación mobile · misma lógica de activo */}
      <nav className="md:hidden border-t border-[var(--color-earth-100)] px-4 py-2 flex gap-4 text-xs overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap font-medium transition-colors ${
                active
                  ? "text-[var(--color-iris-700)] underline underline-offset-4"
                  : "text-[var(--color-earth-700)] hover:text-[var(--color-iris-700)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
