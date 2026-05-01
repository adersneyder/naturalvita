import type { ReactNode } from "react";
import PublicHeader from "./_components/PublicHeader";
import PublicFooter from "./_components/PublicFooter";
import CartDrawer from "./_components/CartDrawer";
import Toaster from "./_components/Toaster";

/**
 * Layout del catálogo público. Monta:
 * - Header con logo, nav, búsqueda e icono de carrito
 * - Drawer lateral del carrito (controlado por estado global)
 * - Toaster para notificaciones (agregado al carrito, etc)
 * - Footer con info legal
 *
 * Las páginas hijas controlan su propio container y padding.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <CartDrawer />
      <Toaster />
    </div>
  );
}
