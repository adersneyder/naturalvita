"use client";

import { useState, useTransition } from "react";
import { approveTaskAction, rejectTaskAction } from "./actions";
import type {
  TaskPriority,
  TaskRow,
  TaskSource,
  TaskType,
} from "@/lib/tasks/types";

const STATUS_STYLES: Record<string, { label: string; tone: string }> = {
  pending: { label: "Pendiente", tone: "bg-[#FAEEDA] text-[#854F0B]" },
  approved: { label: "Aprobada", tone: "bg-[#E8F0FE] text-[#1A56DB]" },
  executed: {
    label: "Ejecutada",
    tone: "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]",
  },
  rejected: {
    label: "Rechazada",
    tone: "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]",
  },
  failed: { label: "Falló", tone: "bg-[#FCE9E5] text-[#B23A1F]" },
  expired: {
    label: "Expirada",
    tone: "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]",
  },
};

export default function TaskCard({
  task,
  canDecide,
  typeLabels,
  sourceLabels,
  priorityStyles,
}: {
  task: TaskRow;
  canDecide: boolean;
  typeLabels: Record<TaskType, string>;
  sourceLabels: Record<TaskSource, string>;
  priorityStyles: Record<TaskPriority, { label: string; tone: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const prio = priorityStyles[task.priority as TaskPriority];
  const stat = STATUS_STYLES[task.status] ?? STATUS_STYLES.pending;

  const isPending = task.status === "pending";

  function onApprove() {
    if (!confirm(`¿Aprobar y ejecutar la tarea "${task.title}"?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await approveTaskAction({ taskId: task.id, note: note || undefined });
      if (!res.ok) setError(res.error);
    });
  }

  function onReject() {
    if (!note.trim()) {
      setError("Escribe brevemente el motivo del rechazo");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await rejectTaskAction({ taskId: task.id, note });
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-earth-50)]/40"
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium ${prio.tone}`}
          >
            {prio.label}
          </span>
          <span
            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium ${stat.tone}`}
          >
            {stat.label}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[var(--color-leaf-900)] m-0 font-medium truncate">
            {task.title}
          </p>
          <p className="text-[10px] text-[var(--color-earth-500)] m-0 mt-0.5 truncate">
            {typeLabels[task.task_type as TaskType] ?? task.task_type} ·{" "}
            {sourceLabels[task.source as TaskSource] ?? task.source} ·{" "}
            {new Date(task.created_at).toLocaleString("es-CO", { hour12: false })}
          </p>
        </div>
        <span className="text-[var(--color-earth-400)] text-xs flex-shrink-0" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 bg-[var(--color-earth-50)]/40 text-xs space-y-3 border-t border-[rgba(47,98,56,0.06)]">
          {task.description && (
            <p className="text-[var(--color-earth-900)] m-0 pt-3 leading-relaxed">
              {task.description}
            </p>
          )}

          <details>
            <summary className="cursor-pointer text-[var(--color-iris-700)] text-[11px]">
              Acción propuesta
            </summary>
            <pre className="mt-1 p-2 bg-white rounded border border-[var(--color-earth-100)] overflow-x-auto text-[10px] leading-relaxed">
              {JSON.stringify(task.proposed_action, null, 2)}
            </pre>
          </details>

          {task.execution_result !== null && (
            <details open>
              <summary className="cursor-pointer text-[var(--color-leaf-700)] text-[11px]">
                Resultado de ejecución
              </summary>
              <pre className="mt-1 p-2 bg-white rounded border border-[var(--color-earth-100)] overflow-x-auto text-[10px] leading-relaxed">
                {JSON.stringify(task.execution_result, null, 2)}
              </pre>
            </details>
          )}

          {task.execution_error && (
            <p className="text-[#B23A1F] m-0">
              <strong>Error:</strong> {task.execution_error}
            </p>
          )}

          {task.decision_note && (
            <p className="text-[var(--color-earth-500)] m-0">
              <strong>Nota:</strong> {task.decision_note}
            </p>
          )}

          {isPending && canDecide && (
            <div className="space-y-2 pt-2">
              {showRejectInput && (
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Motivo del rechazo…"
                  className="w-full px-2 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs focus:outline-none focus:border-[var(--color-iris-700)]"
                />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
                >
                  {pending ? "…" : "Aprobar y ejecutar"}
                </button>
                {showRejectInput ? (
                  <button
                    type="button"
                    onClick={onReject}
                    disabled={pending}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#B23A1F] text-[#B23A1F] hover:bg-[#FCE9E5] disabled:opacity-50"
                  >
                    {pending ? "…" : "Confirmar rechazo"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-earth-300)] text-[var(--color-earth-900)] hover:bg-[var(--color-earth-50)]"
                  >
                    Rechazar
                  </button>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-[#B23A1F] m-0 text-[11px]">{error}</p>}
        </div>
      )}
    </div>
  );
}
