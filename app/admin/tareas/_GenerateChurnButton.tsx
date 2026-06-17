"use client";

import { useState, useTransition } from "react";
import { generateChurnTasksAction } from "./actions";

/**
 * Botón temporal de generación manual de tareas de churn. Eventualmente
 * será un cron diario que las cree automáticamente; mientras tanto, el
 * equipo lo dispara cuando quiere refrescar la bandeja.
 */
export default function GenerateChurnButton() {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    setFeedback(null);
    startTransition(async () => {
      const res = await generateChurnTasksAction();
      setFeedback(res.ok ? (res.message ?? "OK") : res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-leaf-700)] text-[var(--color-leaf-700)] hover:bg-[var(--color-leaf-100)] disabled:opacity-50"
      >
        {pending ? "Generando…" : "Generar tareas de churn"}
      </button>
      {feedback && (
        <p className="text-[10px] text-[var(--color-earth-500)] m-0 max-w-xs text-right">
          {feedback}
        </p>
      )}
    </div>
  );
}
