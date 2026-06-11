import type { ReactNode } from "react";
import { Suspense } from "react";
import PublicHeader from "./_components/PublicHeader";
import PublicFooter from "./_components/PublicFooter";
import CartDrawer from "./_components/CartDrawer";
import Toaster from "./_components/Toaster";
import HabeasDataBanner from "./_components/HabeasDataBanner";
import SemilloTracker from "@/app/_components/SemilloTracker";
import {
  OrganizationSchema,
  WebSiteSchema,
} from "@/components/schema/OrganizationSchema";

/**
 * Layout del catálogo público. Monta:
 * - Schemas Organization + WebSite GLOBALES (knowledge panel de marca:
 *   Google necesita verlos en TODAS las páginas, no solo en home)
 * - Header con logo, nav, búsqueda, cuenta e icono de carrito
 * - Drawer lateral del carrito (controlado por estado global)
 * - Toaster para notificaciones (agregado al carrito, etc)
 * - Banner Habeas Data (ley 1581/2012) en primera visita
 * - Footer con info legal NIT + dirección + redes
 *
 * Las páginas hijas controlan su propio container y padding.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <OrganizationSchema />
      <WebSiteSchema />
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <CartDrawer />
      <Toaster />
      <HabeasDataBanner />
      {/* Tracker "Sembrado" — usa useSearchParams, requiere Suspense en App Router. */}
      <Suspense fallback={null}>
        <SemilloTracker />
      </Suspense>
    </div>
  );
}
