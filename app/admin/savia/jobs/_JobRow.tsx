"use client";

import { useState, useTransition } from "react";
import { retryJob } from "../actions";

type JobData = {
  id: string;
  to_email: string;
  subject: string;
  template: string;
  status: string;
  attempts: number;
  message_id: string | null;
  flow_id: string | null;
  scheduled_at: string;
  last_error: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type JobEvent = { event_type: string; created_at: string };

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]",
  queued: "bg-[#FAEEDA] text-[#854F0B]",
  sending: "bg-[#E8F0FE] text-[#1A56DB]",
  failed: "bg-[#FCE9E5] text-[#B23A1F]",
  skipped: "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]",
};

/**
 * Fila expandible de un job: resumen en una línea, detalle (payload,
 * eventos, error) al hacer click. Jobs failed tienen botón de reintento.
 */
export default function JobRow({
  job,
  events,
}: {
  job: JobData;
  events: JobEvent[];
}) {
  const [open, setOpen] = useState(false);
  const [retried, setRetried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onRetry() {
    setError(null);
    startTransition(async () => {
      const res = await retryJob(job.id);
      if (!res.ok) setError(res.error);
      else setRetried(true);
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("es-CO", { hour12: false });

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-earth-50)]/40"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-[var(--color-leaf-900)] font-medium truncate m-0">
            {job.to_email}
            <span className="text-[var(--color-earth-500)] font-normal">
              {" · "}
              {job.subject}
            </span>
          </p>
          <p className="text-[11px] text-[var(--color-earth-500)] font-mono m-0 mt-0.5">
            {job.template}
            {job.flow_id ? ` · ${job.flow_id}` : ""} · prog.{" "}
            {fmt(job.scheduled_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[retried ? "queued" : job.status] ?? ""}`}
          >
            {retried ? "queued" : job.status}
          </span>
          <span className="text-[var(--color-earth-400)] text-xs" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 bg-[var(--color-earth-50)]/40 text-[12px] space-y-3">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <div>
              <dt className="text-[10px] uppercase text-[var(--color-earth-500)]">Job ID</dt>
              <dd className="font-mono text-[11px] m-0">{job.id.slice(0, 8)}…</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-[var(--color-earth-500)]">Message ID</dt>
              <dd className="font-mono text-[11px] m-0">
                {job.message_id ? `${job.message_id.slice(0, 12)}…` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-[var(--color-earth-500)]">Intentos</dt>
              <dd className="tabular-nums m-0">{job.attempts}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-[var(--color-earth-500)]">Creado</dt>
              <dd className="m-0">{fmt(job.created_at)}</dd>
            </div>
          </dl>

          {job.last_error && (
            <p className="text-[#B23A1F] m-0">
              <strong>Error:</strong> {job.last_error}
            </p>
          )}

          {events.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-[var(--color-earth-500)] mb-1 m-0">
                Eventos
              </p>
              <ol className="space-y-0.5 m-0">
                {events.map((e, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="font-medium text-[var(--color-leaf-900)]">
                      {e.event_type}
                    </span>
                    <span className="text-[var(--color-earth-500)]">
                      {fmt(e.created_at)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <details>
            <summary className="cursor-pointer text-[var(--color-iris-700)] text-[11px]">
              Ver payload
            </summary>
            <pre className="mt-1 p-2 bg-white rounded border border-[var(--color-earth-100)] overflow-x-auto text-[10px] leading-relaxed">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </details>

          {job.status === "failed" && !retried && (
            <button
              type="button"
              onClick={onRetry}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg bg-[var(--color-iris-700)] text-white text-xs font-medium hover:bg-[var(--color-iris-600)] disabled:opacity-50"
            >
              {pending ? "Reencolando…" : "Reintentar envío"}
            </button>
          )}
          {error && <p className="text-[#B23A1F] m-0">{error}</p>}
        </div>
      )}
    </li>
  );
}
