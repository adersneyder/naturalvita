"use client";

import { useState } from "react";

type AuditData = {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  request_ip: string | null;
  created_at: string;
};

// Color por familia de acción — visual rápida de "qué tipo de evento es".
const ACTION_FAMILIES: Array<{ prefix: string; style: string }> = [
  { prefix: "order.", style: "bg-[#E8F0FE] text-[#1A56DB]" },
  { prefix: "flow.", style: "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]" },
  { prefix: "suppression.", style: "bg-[#FAEEDA] text-[#854F0B]" },
  { prefix: "guide.", style: "bg-[#F3E8FF] text-[#6B21A8]" },
  { prefix: "product.", style: "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]" },
  { prefix: "price.", style: "bg-[#FCE9E5] text-[#B23A1F]" },
  { prefix: "user.", style: "bg-[var(--color-earth-100)] text-[var(--color-earth-700)]" },
];

function styleForAction(action: string): string {
  return (
    ACTION_FAMILIES.find((f) => action.startsWith(f.prefix))?.style ??
    "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]"
  );
}

export default function AuditRow({ row }: { row: AuditData }) {
  const [open, setOpen] = useState(false);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("es-CO", { hour12: false });

  const hasMetadata =
    row.metadata && Object.keys(row.metadata).length > 0;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-earth-50)]/40"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-[var(--color-leaf-900)] m-0 truncate">
            {row.summary}
          </p>
          <p className="text-[11px] text-[var(--color-earth-500)] m-0 mt-0.5">
            {row.actor_email ?? "sistema"}
            {row.actor_role ? ` · ${row.actor_role}` : ""}
            {" · "}
            {fmt(row.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium font-mono ${styleForAction(row.action)}`}
          >
            {row.action}
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
              <dt className="text-[10px] uppercase text-[var(--color-earth-500)]">Entidad</dt>
              <dd className="m-0">{row.entity_type}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] uppercase text-[var(--color-earth-500)]">ID</dt>
              <dd className="font-mono text-[11px] m-0 truncate">
                {row.entity_id ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-[var(--color-earth-500)]">IP</dt>
              <dd className="font-mono text-[11px] m-0">
                {row.request_ip ?? "—"}
              </dd>
            </div>
          </dl>

          {hasMetadata && (
            <details open>
              <summary className="cursor-pointer text-[var(--color-iris-700)] text-[11px]">
                Metadata
              </summary>
              <pre className="mt-1 p-2 bg-white rounded border border-[var(--color-earth-100)] overflow-x-auto text-[10px] leading-relaxed">
                {JSON.stringify(row.metadata, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </li>
  );
}
