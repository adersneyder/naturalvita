"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { identify, trackPageView } from "@/lib/savia/tracker";

const IDENTIFY_DEDUP_KEY = "nv:identified:v1";

/**
 * Inicializador del tracker "Sembrado" — se monta una vez en el layout
 * público y reporta page_view en cada cambio de ruta. App Router no
 * dispara `popstate` con la información completa; por eso reaccionamos
 * a usePathname + useSearchParams en vez de window events.
 *
 * También dispara `identify(customerId)` cuando recibe un customer_id
 * del server layout (sesión activa) — UNA sola vez por sesión de
 * navegador para no inundar al backend con eventos identify en cada
 * page_view. La dedup vive en sessionStorage: si el cliente cambia de
 * cuenta sin cerrar la pestaña, se vuelve a disparar (clave incluye el id).
 *
 * No bloquea render: todo es side-effect en useEffect. Si el navegador
 * tiene localStorage deshabilitado o la red caída, el SDK falla
 * silenciosamente y el render sigue intacto.
 */
export default function SemilloTracker({
  customerId,
}: {
  customerId: string | null;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const lastIdentifiedRef = useRef<string | null>(null);

  // Identify se hace una vez por carga + cambio de cuenta. La dedup en
  // sessionStorage cubre el caso de navegación entre páginas (el effect
  // re-corre pero ya se identificó). El ref cubre el caso de re-render
  // dentro de la misma página antes de leer sessionStorage.
  useEffect(() => {
    if (!customerId) return;
    if (lastIdentifiedRef.current === customerId) return;
    try {
      const already = sessionStorage.getItem(IDENTIFY_DEDUP_KEY);
      if (already === customerId) {
        lastIdentifiedRef.current = customerId;
        return;
      }
      sessionStorage.setItem(IDENTIFY_DEDUP_KEY, customerId);
    } catch {
      /* storage bloqueado — seguimos */
    }
    lastIdentifiedRef.current = customerId;
    identify(customerId);
  }, [customerId]);

  useEffect(() => {
    trackPageView();
    // Re-disparamos en cambios de pathname y search: contamos como vistas
    // distintas /catalogo?cat=cabello y /catalogo?cat=hidratacion.
  }, [pathname, search]);

  return null;
}
