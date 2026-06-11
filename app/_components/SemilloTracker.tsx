"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackPageView } from "@/lib/savia/tracker";

/**
 * Inicializador del tracker "Sembrado" — se monta una vez en el layout
 * público y reporta page_view en cada cambio de ruta (App Router no
 * dispara `popstate` con la información completa, por eso reaccionamos
 * a usePathname + useSearchParams en vez de window events).
 *
 * No bloquea render: todo es side-effect en useEffect. Si el navegador
 * tiene localStorage deshabilitado o la red caída, el SDK falla
 * silenciosamente y el render del producto sigue intacto.
 */
export default function SemilloTracker() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    trackPageView();
    // Disparamos en cada cambio de pathname o querystring. Re-disparamos
    // ante cambios de search también porque queremos contar como "vistas"
    // distintas /catalogo?cat=cabello y /catalogo?cat=hidratacion.
  }, [pathname, search]);

  return null;
}
