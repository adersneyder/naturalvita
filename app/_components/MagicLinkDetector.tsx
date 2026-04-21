"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DetectorState =
  | { status: "idle" }
  | { status: "processing" }
  | { status: "error"; message: string };

/**
 * Detector GLOBAL de magic links. Se incluye en el root layout para cubrir
 * todas las rutas. Detecta tokens en el hash (#access_token=...) que vienen
 * de magic links generados desde el Supabase Dashboard o flujos implicitos,
 * establece la sesion, y redirige a /admin.
 *
 * No hace nada en rutas normales (si no hay hash con token, retorna null).
 */
export default function MagicLinkDetector() {
  const [state, setState] = useState<DetectorState>({ status: "idle" });

  useEffect(() => {
    // Solo ejecutar en cliente
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token=")) return;

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const errorCode = params.get("error");
    const errorDescription = params.get("error_description");

    // Si el hash trae un error en lugar de token
    if (errorCode) {
      setState({
        status: "error",
        message: errorDescription ?? errorCode,
      });
      return;
    }

    if (!accessToken || !refreshToken) return;

    setState({ status: "processing" });

    const supabase = createClient();

    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error }) => {
        if (error) {
          console.error("Error estableciendo sesión:", error);
          setState({ status: "error", message: error.message });
          return;
        }

        // Limpiar el hash antes de redirigir
        window.history.replaceState(null, "", window.location.pathname);

        // Reload completo para que middleware lea la cookie recién seteada
        window.location.href = "/admin";
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Error desconocido";
        setState({ status: "error", message });
      });
  }, []);

  if (state.status === "idle") return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--color-earth-50)] flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        {state.status === "processing" && (
          <>
            <div className="inline-block w-8 h-8 rounded-full border-2 border-[var(--color-leaf-700)] border-t-transparent animate-spin mb-4" />
            <p className="font-serif text-lg text-[var(--color-leaf-900)] mb-2">
              Iniciando sesión…
            </p>
            <p className="text-sm text-[var(--color-earth-700)]">
              Validando tu acceso al panel
            </p>
          </>
        )}
        {state.status === "error" && (
          <>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4 text-2xl">
              ⚠
            </div>
            <p className="font-serif text-lg text-[var(--color-leaf-900)] mb-2">
              No se pudo iniciar sesión
            </p>
            <p className="text-sm text-[var(--color-earth-700)] mb-4">
              {state.message}
            </p>
            <a
              href="/admin/login"
              className="inline-block text-sm text-[var(--color-leaf-700)] underline"
            >
              Volver al login
            </a>
          </>
        )}
      </div>
    </div>
  );
}

