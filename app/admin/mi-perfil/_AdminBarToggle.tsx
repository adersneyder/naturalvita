"use client";

import { useTransition } from "react";
import { setAdminBarVisibility } from "@/app/(public)/_components/admin-bar-actions";

/**
 * Toggle de la admin bar del sitio público. La barra aparece por
 * defecto a usuarios admin activos; este botón permite ocultarla
 * (para capturas, demos) o volver a mostrarla. El estado vive en
 * cookie por 30 días.
 */
export default function AdminBarToggle({ hidden }: { hidden: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setAdminBarVisibility(!hidden);
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
          Barra del equipo en el sitio público
        </p>
        <p className="text-xs text-[var(--color-earth-700)] m-0 mt-0.5">
          {hidden
            ? "Está oculta. Cliente y equipo ven el sitio igual."
            : "Visible solo para el equipo. Permite saltar al panel sin perder navegación."}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex-shrink-0 disabled:opacity-50 ${
          hidden
            ? "border-[var(--color-leaf-700)] text-[var(--color-leaf-700)] hover:bg-[var(--color-leaf-100)]"
            : "border-[var(--color-earth-300)] text-[var(--color-earth-900)] hover:bg-[var(--color-earth-50)]"
        }`}
      >
        {pending ? "…" : hidden ? "Mostrar barra" : "Ocultar barra"}
      </button>
    </div>
  );
}
