"use client";

import { useState, useTransition } from "react";
import { removeSuppression } from "../actions";

const REASON_LABELS: Record<string, { label: string; style: string }> = {
  bounce: { label: "Rebote", style: "bg-[#FCE9E5] text-[#B23A1F]" },
  complaint: { label: "Queja", style: "bg-[#FCE9E5] text-[#B23A1F]" },
  unsubscribe: {
    label: "Baja",
    style: "bg-[var(--color-earth-100)] text-[var(--color-earth-700)]",
  },
};

/**
 * Fila de un email suprimido con botón de remoción. Quitar pide doble
 * confirmación porque reactivar un bounce/complaint daña reputación.
 */
export default function SuppressionRow({
  email,
  reason,
  subReason,
  source,
  notes,
  suppressedAt,
}: {
  email: string;
  reason: string;
  subReason: string | null;
  source: string;
  notes: string | null;
  suppressedAt: string;
}) {
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onRemove() {
    const warn =
      reason === "bounce" || reason === "complaint"
        ? `⚠ ${email} está bloqueado por ${reason === "bounce" ? "REBOTE" : "QUEJA DE SPAM"}. Si vuelve a fallar, daña la reputación del dominio. ¿Quitar de todas formas?`
        : `¿Quitar ${email} de la lista? Volverá a recibir correos de marketing.`;
    if (!window.confirm(warn)) return;
    setError(null);
    startTransition(async () => {
      const res = await removeSuppression(email);
      if (!res.ok) setError(res.error);
      else setRemoved(true);
    });
  }

  if (removed) {
    return (
      <li className="px-4 py-3 text-[12px] text-[var(--color-earth-500)] italic">
        {email} — removido de la lista.
      </li>
    );
  }

  const reasonInfo = REASON_LABELS[reason] ?? {
    label: reason,
    style: "bg-[var(--color-earth-100)] text-[var(--color-earth-700)]",
  };

  return (
    <li className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] text-[var(--color-leaf-900)] font-medium truncate m-0">
          {email}
        </p>
        <p className="text-[11px] text-[var(--color-earth-500)] m-0 mt-0.5">
          {new Date(suppressedAt).toLocaleString("es-CO", { hour12: false })}
          {" · "}
          {source}
          {subReason ? ` · ${subReason}` : ""}
          {notes ? ` · ${notes}` : ""}
        </p>
        {error && <p className="text-[11px] text-[#B23A1F] m-0">{error}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium ${reasonInfo.style}`}
        >
          {reasonInfo.label}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          className="text-[11px] text-[var(--color-earth-500)] underline hover:text-[#B23A1F] disabled:opacity-50"
        >
          {pending ? "Quitando…" : "Quitar"}
        </button>
      </div>
    </li>
  );
}
