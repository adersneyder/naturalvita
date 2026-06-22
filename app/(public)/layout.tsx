import type { ReactNode } from "react";
import { Suspense } from "react";
import PublicHeader from "./_components/PublicHeader";
import PublicFooter from "./_components/PublicFooter";
import CartDrawer from "./_components/CartDrawer";
import Toaster from "./_components/Toaster";
import HabeasDataBanner from "./_components/HabeasDataBanner";
import AdminBar from "./_components/AdminBar";
import ScrollToTopButton from "./_components/ScrollToTopButton";
import ChatWidget from "./_components/ChatWidget";
import SemilloTracker from "@/app/_components/SemilloTracker";
import {
  OrganizationSchema,
  WebSiteSchema,
} from "@/components/schema/OrganizationSchema";
import { createClient } from "@/lib/supabase/server";

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
export default async function PublicLayout({ children }: { children: ReactNode }) {
  // Leemos la sesión SSR para pasarle al tracker el customer_id si existe.
  // Si el cliente está logueado, el SDK dispara identify() y el backend
  // reasigna sus eventos anónimos previos a su customer_id. Solo se usa
  // como hint — si Supabase falla seguimos sin identify y el tracking
  // funciona en modo anónimo.
  let customerId: string | null = null;
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    customerId = user?.id ?? null;
  } catch {
    /* sesión no disponible — modo anónimo */
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <OrganizationSchema />
      <WebSiteSchema />
      {/* AdminBar es server component: renderiza null para visitantes
          que no están en admin_users activo. Cero leak para clientes. */}
      <AdminBar />
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <CartDrawer />
      <Toaster />
      <HabeasDataBanner />
      <ScrollToTopButton />
      <ChatWidget />
      {/* Tracker "Sembrado" — usa useSearchParams, requiere Suspense en App Router. */}
      <Suspense fallback={null}>
        <SemilloTracker customerId={customerId} />
      </Suspense>
    </div>
  );
}
