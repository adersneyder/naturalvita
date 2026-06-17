"use client";

import { useState, useTransition } from "react";
import { runGeneratorAction } from "./actions";

const GENERATORS = [
  { value: "all", label: "Todos los generadores" },
  { value: "churn", label: "Churn (RFM at_risk)" },
  { value: "cart", label: "Carrito abandonado (7d)" },
  { value: "wishlist", label: "Wishlist sin compra (60d)" },
] as const;

type GeneratorKey = (typeof GENERATORS)[number]["value"];

/**
 * Disparador manual de los generadores de Sembrado. Útil mientras se
 * configura el cron diario — y como modo "refrescar bandeja ahora" si
 * el equipo quiere ver propuestas frescas antes del próximo tick.
 */
export default function GenerateChurnButton() {
  const [which, setWhich] = useState<GeneratorKey>("all");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function onClick() {
    setFeedback(null);
    startTransition(async () => {
      const res = await runGeneratorAction(which);
      setFeedback({
        ok: res.ok,
        msg: res.ok ? (res.message ?? "OK") : res.error,
      });
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          value={which}
          onChange={(e) => setWhich(e.target.value as GeneratorKey)}
          disabled={pending}
          className="px-2 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs bg-white focus:outline-none focus:border-[var(--color-iris-700)] disabled:opacity-50"
        >
          {GENERATORS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onClick}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-leaf-700)] text-[var(--color-leaf-700)] hover:bg-[var(--color-leaf-100)] disabled:opacity-50"
        >
          {pending ? "Generando…" : "Generar tareas"}
        </button>
      </div>
      {feedback && (
        <p
          className={`text-[10px] m-0 max-w-xs text-right ${
            feedback.ok ? "text-[var(--color-earth-500)]" : "text-[#B23A1F]"
          }`}
        >
          {feedback.msg}
        </p>
      )}
    </div>
  );
}
