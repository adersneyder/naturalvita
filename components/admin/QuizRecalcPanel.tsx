"use client";

// components/admin/QuizRecalcPanel.tsx
// Panel en el admin para forzar la reclasificación del quiz y ver el estado.
// Botón "Recalcular ahora" + estado de la última corrida + nº de pendientes.

import { useState, useTransition } from "react";
import { triggerQuizRecalcAction, getQuizSyncStatusAction } from "@/lib/quiz/admin-actions";

interface SyncStatus {
  dirtyCount: number;
  lastRun: {
    trigger_source: string;
    dirty_count: number;
    processed: number;
    failed: number;
    status: string;
    started_at: string;
    finished_at: string | null;
  } | null;
}

export default function QuizRecalcPanel({ initial }: { initial: SyncStatus }) {
  const [status, setStatus] = useState<SyncStatus>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(() => {
      void (async () => {
        const res = await getQuizSyncStatusAction();
        if (res.ok) setStatus({ dirtyCount: res.dirtyCount, lastRun: res.lastRun });
      })();
    });
  };

  const recalc = () => {
    setMsg(null);
    startTransition(() => {
      void (async () => {
        const res = await triggerQuizRecalcAction();
        if (!res.ok) {
          setMsg(`Error: ${res.error}`);
          return;
        }
        setMsg(
          res.nothingToDo
            ? "No hay productos pendientes de reclasificar."
            : "Reclasificación iniciada. Puede tardar unos minutos; actualiza el estado.",
        );
        setTimeout(refresh, 3000);
      })();
    });
  };

  return (
    <div className="nv-qrp">
      <div className="nv-qrp__head">
        <div>
          <h3 className="nv-qrp__title">Recomendaciones del quiz</h3>
          <p className="nv-qrp__sub">
            {status.dirtyCount === 0
              ? "Todo sincronizado. No hay productos pendientes."
              : `${status.dirtyCount} producto(s) pendiente(s) de reclasificar.`}
          </p>
        </div>
        <button className="nv-qrp__btn" onClick={recalc} disabled={pending}>
          {pending ? "Procesando…" : "Recalcular ahora"}
        </button>
      </div>

      {msg && <p className="nv-qrp__msg">{msg}</p>}

      {status.lastRun && (
        <div className="nv-qrp__last">
          <span className="nv-qrp__last-lbl">Última corrida</span>
          <span className="nv-qrp__last-val">
            {status.lastRun.status} · {status.lastRun.processed} procesados
            {status.lastRun.failed > 0 ? `, ${status.lastRun.failed} fallidos` : ""} ·{" "}
            {status.lastRun.trigger_source} ·{" "}
            {new Date(status.lastRun.started_at).toLocaleString("es-CO")}
          </span>
        </div>
      )}

      <style>{`
.nv-qrp { background:#fff; border:1px solid #E8DFD0; border-radius:14px; padding:18px 20px; }
.nv-qrp__head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.nv-qrp__title { font-family:Georgia,serif; font-weight:400; font-size:17px; color:#2A2722; margin:0 0 4px; }
.nv-qrp__sub { font-size:13px; color:#8B8881; margin:0; }
.nv-qrp__btn { background:#4A2E9A; color:#fff; border:none; border-radius:10px; padding:9px 16px; font-size:13.5px; font-weight:600; cursor:pointer; transition:background .15s; white-space:nowrap; }
.nv-qrp__btn:hover:not(:disabled) { background:#3B248A; }
.nv-qrp__btn:disabled { opacity:.6; cursor:default; }
.nv-qrp__msg { font-size:13px; color:#1E5E34; margin:12px 0 0; }
.nv-qrp__last { margin-top:14px; padding-top:14px; border-top:1px solid #F0ECE3; display:flex; flex-direction:column; gap:3px; }
.nv-qrp__last-lbl { font-size:10.5px; text-transform:uppercase; letter-spacing:.8px; color:#A8A39B; font-weight:600; }
.nv-qrp__last-val { font-size:12.5px; color:#5C5048; }
      `}</style>
    </div>
  );
}
