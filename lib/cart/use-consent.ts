"use client";

import { useEffect, useState } from "react";

/**
 * Consentimiento de tratamiento de datos según ley 1581 de 2012 (Habeas Data
 * Colombia). Se almacena en localStorage para evitar la fricción de un
 * sistema de consentimiento server-side en Fase 1.
 *
 * Categorías:
 *   - essential: cookies estrictamente necesarias (sesión, carrito).
 *     Siempre habilitadas, no requieren consentimiento.
 *   - analytics: Microsoft Clarity (heatmaps + session replay) + futuras
 *     plataformas que registren comportamiento granular.
 *   - marketing: Klaviyo events, retargeting, futuro Meta Pixel.
 *
 * Vercel Analytics + Speed Insights se quedan en "essential" porque no
 * usan cookies de tracking ni recolectan PII; son agregados anónimos.
 */

export type ConsentState = {
  /** ISO timestamp en que se aceptó/configuró por última vez. */
  decidedAt: string;
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "nv:consent:v1";

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

export function writeConsent(state: Omit<ConsentState, "decidedAt">) {
  if (typeof window === "undefined") return;
  const payload: ConsentState = {
    ...state,
    decidedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  // Notificar a otros componentes en la misma pestaña
  window.dispatchEvent(new CustomEvent("nv:consent-changed"));
}

export function clearConsent() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("nv:consent-changed"));
}

/**
 * Hook reactivo: re-renderiza cuando cambia el consentimiento.
 * Se sincroniza entre componentes vía CustomEvent y entre pestañas vía
 * `storage` event nativo del navegador.
 */
export function useConsent(): {
  state: ConsentState | null;
  isLoaded: boolean;
} {
  const [state, setState] = useState<ConsentState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setState(readConsent());
    setIsLoaded(true);

    function refresh() {
      setState(readConsent());
    }

    window.addEventListener("nv:consent-changed", refresh);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) refresh();
    });

    return () => {
      window.removeEventListener("nv:consent-changed", refresh);
    };
  }, []);

  return { state, isLoaded };
}
