"use client";

import { useState, useTransition } from "react";
import { toggleFlow } from "../actions";

/**
 * Switch de activación de un flow. Optimista con rollback si la action
 * falla. Desactivar pide confirmación (es acción con impacto en revenue).
 */
export default function FlowToggle({
  flowId,
  active,
}: {
  flowId: string;
  active: boolean;
}) {
  const [isActive, setIsActive] = useState(active);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onToggle() {
    const target = !isActive;
    if (!target) {
      const sure = window.confirm(
        `¿Desactivar el flow "${flowId}"? Dejará de enrolar nuevos destinatarios.`,
      );
      if (!sure) return;
    }
    setError(null);
    setIsActive(target); // optimista
    startTransition(async () => {
      const res = await toggleFlow(flowId, target);
      if (!res.ok) {
        setIsActive(!target); // rollback
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[11px] text-[#B23A1F]">{error}</span>}
      <span
        className={`text-[10px] uppercase tracking-wide font-medium ${
          isActive
            ? "text-[var(--color-leaf-700)]"
            : "text-[var(--color-earth-500)]"
        }`}
      >
        {isActive ? "Activo" : "Inactivo"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        disabled={pending}
        onClick={onToggle}
        className={`relative w-10 h-5.5 rounded-full transition-colors disabled:opacity-50 ${
          isActive ? "bg-[var(--color-leaf-700)]" : "bg-[var(--color-earth-200)]"
        }`}
        style={{ height: "22px" }}
      >
        <span
          className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
            isActive ? "translate-x-[20px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
