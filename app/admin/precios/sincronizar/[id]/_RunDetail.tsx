"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { RunPayload } from "@/lib/price-sync/types";
import { applyPriceSync, cancelPriceSync, runMatching } from "../actions";

type RunMeta = {
  id: string;
  laboratoryId: string;
  laboratoryName: string;
  sourceFilename: string | null;
  sourceFormat: string;
  status: "parsed" | "matched" | "applied" | "cancelled";
  linesParsed: number;
  linesMatched: number;
  linesApplied: number;
  createdAt: string;
  appliedAt: string | null;
};

function formatCop(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `$${value.toLocaleString("es-CO")}`;
}

function pctDelta(current: number | null, next: number): string | null {
  if (!current || current <= 0) return null;
  const delta = ((next - current) / current) * 100;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

function marginPct(price: number | null, cost: number | null): string | null {
  if (!price || !cost || price <= 0) return null;
  return `${(((price - cost) / price) * 100).toFixed(1)}%`;
}

export default function RunDetail({
  run,
  payload,
  canApply,
}: {
  run: RunMeta;
  payload: RunPayload;
  canApply: boolean;
}) {
  const [decisions, setDecisions] = useState<Record<string, string>>(() => {
    // Pre-seed con las decisiones que ya vinieron en payload (matches "auto").
    const initial: Record<string, string> = {};
    for (const line of payload.lines) {
      if (line.decision) initial[String(line.index)] = line.decision;
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    let auto = 0;
    let suggest = 0;
    let none = 0;
    let selected = 0;
    for (const line of payload.lines) {
      if (line.confidence === "auto") auto++;
      else if (line.confidence === "suggest") suggest++;
      else none++;
      const dec = decisions[String(line.index)];
      if (dec && dec !== "skip") selected++;
    }
    return { auto, suggest, none, selected };
  }, [payload.lines, decisions]);

  function setDecision(lineIndex: number, value: string) {
    setDecisions((prev) => {
      const next = { ...prev };
      if (!value) delete next[String(lineIndex)];
      else next[String(lineIndex)] = value;
      return next;
    });
  }

  function onRunMatching() {
    setError(null);
    startTransition(async () => {
      const res = await runMatching(run.id);
      if (!res.ok) setError(res.error);
      else location.reload();
    });
  }

  function onApply() {
    setError(null);
    startTransition(async () => {
      const res = await applyPriceSync({ runId: run.id, decisions });
      if (!res.ok) setError(res.error);
      else location.reload();
    });
  }

  function onCancel() {
    if (!confirm("¿Cancelar esta corrida sin aplicar nada?")) return;
    setError(null);
    startTransition(async () => {
      const res = await cancelPriceSync(run.id);
      if (!res.ok) setError(res.error);
      else location.reload();
    });
  }

  return (
    <>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/precios/sincronizar"
            className="text-xs text-[var(--color-iris-700)] hover:underline"
          >
            ← Historial
          </Link>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0 mt-2">
            {run.laboratoryName}
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
            {run.sourceFilename ?? "archivo"} ·{" "}
            <span className="font-mono">{run.sourceFormat}</span> ·{" "}
            {run.linesParsed} líneas parseadas
          </p>
        </div>
        <StatusBadge status={run.status} />
      </header>

      {error && (
        <p className="text-[#B23A1F] text-xs m-0 mb-3 p-2 bg-[#FCE9E5] rounded-lg">
          {error}
        </p>
      )}

      {/* Step 2: el matching aún no se ha hecho */}
      {run.status === "parsed" && (
        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 max-w-xl">
          <p className="text-sm text-[var(--color-leaf-900)] m-0">
            Archivo procesado. Ahora vamos a buscar el match de cada línea
            contra tu catálogo de <strong>{run.laboratoryName}</strong>.
          </p>
          <p className="text-xs text-[var(--color-earth-700)] mt-2 m-0">
            El matching es local y rápido. Después podrás revisar y aprobar
            cada cambio antes de aplicar.
          </p>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onRunMatching}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
            >
              {pending ? "Buscando coincidencias…" : "Buscar coincidencias"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(47,98,56,0.15)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)] disabled:opacity-50"
            >
              Cancelar corrida
            </button>
          </div>
        </div>
      )}

      {/* Step 3: matched — preview con decisiones */}
      {run.status === "matched" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <Stat label="Match automático" value={counts.auto} tint="leaf" />
            <Stat label="Sugerencias" value={counts.suggest} tint="amber" />
            <Stat label="Sin match" value={counts.none} tint="muted" />
            <Stat label="A aplicar" value={counts.selected} tint="iris" />
          </div>

          <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden mb-4">
            <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
              {payload.lines.map((line) => {
                const decision = decisions[String(line.index)] ?? "";
                return (
                  <li key={line.index} className="px-4 py-3">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_120px] gap-3 items-start">
                      <div className="min-w-0">
                        <p className="text-[13px] text-[var(--color-leaf-900)] font-medium m-0 truncate">
                          {line.supplier_name}
                        </p>
                        <p className="text-[11px] text-[var(--color-earth-500)] m-0 mt-0.5">
                          {line.supplier_sku
                            ? `${line.supplier_sku} · `
                            : ""}
                          {formatCop(line.price_cop)}
                        </p>
                      </div>

                      <div>
                        <select
                          value={decision}
                          onChange={(e) =>
                            setDecision(line.index, e.target.value)
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs bg-white focus:outline-none focus:border-[var(--color-iris-700)]"
                        >
                          <option value="">— No aplicar —</option>
                          <option value="skip">Saltar (no cambiar)</option>
                          {line.candidates.map((c) => {
                            const delta = pctDelta(c.current_cost_cop, line.price_cop);
                            return (
                              <option key={c.product_id} value={c.product_id}>
                                {`[${Math.round(c.score * 100)}%] ${c.product_name}`}
                                {c.current_cost_cop !== null
                                  ? ` · costo ${formatCop(c.current_cost_cop)}${delta ? ` (${delta})` : ""}`
                                  : " · sin costo"}
                              </option>
                            );
                          })}
                        </select>

                        {decision && decision !== "skip" && (
                          <DecisionMeta
                            decision={decision}
                            line={line}
                          />
                        )}
                      </div>

                      <ConfidenceBadge confidence={line.confidence} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            {canApply ? (
              <button
                type="button"
                onClick={onApply}
                disabled={pending || counts.selected === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
              >
                {pending
                  ? "Aplicando…"
                  : `Aplicar ${counts.selected} cambio${counts.selected === 1 ? "" : "s"}`}
              </button>
            ) : (
              <p className="text-xs text-[var(--color-earth-700)] m-0">
                Tu rol no puede aplicar cambios — solicítale a un owner o
                admin que aplique esta corrida.
              </p>
            )}
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(47,98,56,0.15)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)] disabled:opacity-50"
            >
              Cancelar corrida
            </button>
          </div>
        </>
      )}

      {/* Step 4: aplicada — resumen */}
      {run.status === "applied" && (
        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5">
          <p className="text-sm text-[var(--color-leaf-900)] m-0">
            Corrida aplicada el{" "}
            {run.appliedAt
              ? new Date(run.appliedAt).toLocaleString("es-CO", { hour12: false })
              : "—"}
            . Se actualizaron <strong>{run.linesApplied}</strong> productos.
          </p>
          <p className="text-xs text-[var(--color-earth-700)] mt-2 m-0">
            Quedó registrado en{" "}
            <Link
              href="/admin/auditoria?action=price.sync"
              className="text-[var(--color-iris-700)] hover:underline"
            >
              auditoría
            </Link>
            .
          </p>
        </div>
      )}

      {run.status === "cancelled" && (
        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5">
          <p className="text-sm text-[var(--color-earth-700)] m-0">
            Esta corrida fue cancelada sin aplicar cambios.
          </p>
        </div>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: RunMeta["status"] }) {
  const map: Record<RunMeta["status"], { label: string; style: string }> = {
    parsed: { label: "Paso 1/3", style: "bg-[#E8F0FE] text-[#1A56DB]" },
    matched: { label: "Paso 2/3", style: "bg-[#FAEEDA] text-[#854F0B]" },
    applied: {
      label: "Aplicada",
      style: "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]",
    },
    cancelled: {
      label: "Cancelada",
      style: "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]",
    },
  };
  const s = map[status];
  return (
    <span
      className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium ${s.style}`}
    >
      {s.label}
    </span>
  );
}

function Stat({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint: "leaf" | "amber" | "muted" | "iris";
}) {
  const styles: Record<typeof tint, string> = {
    leaf: "bg-[var(--color-leaf-100)] text-[var(--color-leaf-900)]",
    amber: "bg-[#FAEEDA] text-[#854F0B]",
    muted: "bg-[var(--color-earth-100)] text-[var(--color-earth-700)]",
    iris: "bg-[#E8F0FE] text-[#1A56DB]",
  };
  return (
    <div className={`rounded-lg px-3 py-2 ${styles[tint]}`}>
      <p className="text-[10px] uppercase tracking-wider m-0 opacity-75">
        {label}
      </p>
      <p className="text-xl font-medium m-0 tabular-nums">{value}</p>
    </div>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: "auto" | "suggest" | "none";
}) {
  const map = {
    auto: { label: "AUTO", style: "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]" },
    suggest: { label: "REVISAR", style: "bg-[#FAEEDA] text-[#854F0B]" },
    none: { label: "SIN MATCH", style: "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]" },
  };
  const c = map[confidence];
  return (
    <span
      className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium self-start ${c.style}`}
    >
      {c.label}
    </span>
  );
}

function DecisionMeta({
  decision,
  line,
}: {
  decision: string;
  line: RunPayload["lines"][number];
}) {
  const candidate = line.candidates.find((c) => c.product_id === decision);
  if (!candidate) return null;
  const newCost = line.price_cop;
  const newMargin = marginPct(candidate.current_price_cop, newCost);
  const oldMargin = marginPct(candidate.current_price_cop, candidate.current_cost_cop);
  return (
    <p className="text-[10px] text-[var(--color-earth-500)] mt-1 m-0">
      Costo: {formatCop(candidate.current_cost_cop)} → {formatCop(newCost)}
      {oldMargin && newMargin ? ` · Margen: ${oldMargin} → ${newMargin}` : ""}
    </p>
  );
}
