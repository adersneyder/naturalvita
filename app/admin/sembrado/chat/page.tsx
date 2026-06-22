import Link from "next/link";
import { requireCapability } from "@/lib/admin-capabilities";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;

const DEFAULT_DAYS = 30;

function fmtDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}

// Etiquetas legibles de los intents de escalación.
const REASON_LABELS: Record<string, string> = {
  escalated_pedido: "Problema con pedido",
  escalated_queja: "Queja",
  escalated_medico: "Consulta médica",
  escalated_general: "General",
  escalated_otro: "Otro",
  sin_clasificar: "Sin clasificar",
};

/**
 * Pulso · Chat. Métricas del Asistente NV: volumen, tasa de resolución
 * por IA vs escalación, tiempos de respuesta (SLA), costo del modelo y
 * atribución a compra. La fuente de mejora continua: las razones de
 * escalación muestran qué no resuelve el agente.
 */
export default async function PulsoChatPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireCapability("bi.read");
  const params = await searchParams;
  const days = Math.max(
    1,
    Math.min(365, parseInt(params.days ?? "", 10) || DEFAULT_DAYS),
  );

  const admin = createAdminClient();
  const [{ data: overviewRows }, { data: series }, { data: reasons }] =
    await Promise.all([
      admin.rpc("chat_metrics_overview", { p_days: days }),
      admin.rpc("chat_daily_series", { p_days: days }),
      admin.rpc("chat_escalation_reasons", { p_days: days }),
    ]);

  const o = (overviewRows ?? [])[0];
  const asOf = o?.as_of ?? null;

  const total = o?.total_conversations ?? 0;
  const aiResolved = o?.ai_resolved ?? 0;
  const escalated = o?.escalated ?? 0;
  const aiResolutionRate = total > 0 ? (aiResolved / total) * 100 : 0;
  const escalationRate = total > 0 ? (escalated / total) * 100 : 0;
  const conversionRate =
    total > 0 ? ((o?.led_to_purchase ?? 0) / total) * 100 : 0;

  const dailyMax = Math.max(
    1,
    ...((series ?? []) as Array<{ conversations: number }>).map(
      (s) => s.conversations,
    ),
  );

  return (
    <>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Chat · Asistente NV
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            Rendimiento del agente conversacional · últimos {days} días
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/admin/sembrado/chat${d !== DEFAULT_DAYS ? `?days=${d}` : ""}`}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                days === d
                  ? "bg-[var(--color-leaf-100)] border-[var(--color-leaf-700)]/30 text-[var(--color-leaf-900)] font-medium"
                  : "bg-white border-[rgba(47,98,56,0.12)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
              }`}
            >
              {d}d
            </Link>
          ))}
          <Link
            href="/admin/conversaciones"
            className="text-xs text-[var(--color-iris-700)] hover:underline ml-1"
          >
            Inbox →
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <Stat label="Conversaciones" value={total.toLocaleString("es-CO")} />
        <Stat
          label="Resueltas por IA"
          value={`${aiResolutionRate.toFixed(0)}%`}
          hint={`${aiResolved} de ${total}`}
        />
        <Stat
          label="Escaladas a humano"
          value={`${escalationRate.toFixed(0)}%`}
          hint={`${escalated} conversaciones`}
          tone={escalationRate > 40 ? "warn" : "normal"}
        />
        <Stat
          label="Costo del modelo"
          value={`$${(o?.total_cost_usd ?? 0).toFixed(2)}`}
          hint="USD en el periodo"
        />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <Stat
          label="1ra respuesta IA"
          value={fmtDuration(o?.avg_ai_first_response_sec ?? null)}
          hint="Promedio"
        />
        <Stat
          label="1ra respuesta humana"
          value={fmtDuration(o?.avg_human_first_response_sec ?? null)}
          hint="Tras escalar (SLA)"
        />
        <Stat
          label="Resolución total"
          value={fmtDuration(o?.avg_resolution_sec ?? null)}
          hint="Inicio a cierre"
        />
        <Stat
          label="Llevó a compra"
          value={`${conversionRate.toFixed(1)}%`}
          hint={`${o?.led_to_purchase ?? 0} en 24h`}
          tone="good"
        />
      </section>

      {/* Serie diaria */}
      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 mb-4">
        <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0 mb-3">
          Conversaciones por día
        </h2>
        {!series || series.length === 0 ? (
          <p className="text-xs text-[var(--color-earth-500)] m-0">
            Aún no hay conversaciones en esta ventana.
          </p>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {(series as Array<{
              day: string;
              conversations: number;
              escalated: number;
            }>).map((s) => {
              const h = (s.conversations / dailyMax) * 100;
              const escH =
                s.conversations > 0
                  ? (s.escalated / s.conversations) * h
                  : 0;
              return (
                <div
                  key={s.day}
                  className="flex-1 flex flex-col justify-end items-center gap-1 group relative"
                  title={`${s.day}: ${s.conversations} conversaciones, ${s.escalated} escaladas`}
                >
                  <div className="w-full bg-[var(--color-earth-100)] rounded-t overflow-hidden flex flex-col justify-end h-full">
                    <div
                      className="bg-[#B23A1F] w-full"
                      style={{ height: `${escH}%` }}
                    />
                    <div
                      className="bg-[var(--color-leaf-700)] w-full"
                      style={{ height: `${h - escH}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-[var(--color-earth-500)] mt-2 m-0">
          <span className="inline-block w-2 h-2 rounded-sm bg-[var(--color-leaf-700)] mr-1" />
          Resueltas por IA
          <span className="inline-block w-2 h-2 rounded-sm bg-[#B23A1F] ml-3 mr-1" />
          Escaladas
        </p>
      </section>

      {/* Razones de escalación */}
      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 mb-3">
        <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0 mb-1">
          Por qué se escala
        </h2>
        <p className="text-xs text-[var(--color-earth-700)] m-0 mb-3">
          Lo que el agente no resuelve solo. Fuente de mejora: temas
          frecuentes pueden volverse nuevas herramientas o FAQs.
        </p>
        {!reasons || reasons.length === 0 ? (
          <p className="text-xs text-[var(--color-earth-500)] m-0">
            Sin escalaciones en esta ventana.
          </p>
        ) : (
          <ul className="space-y-1.5 m-0 p-0 list-none">
            {(reasons as Array<{ reason: string; count: number }>).map((r) => (
              <li
                key={r.reason}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-[var(--color-earth-900)]">
                  {REASON_LABELS[r.reason] ?? r.reason}
                </span>
                <span className="tabular-nums text-[var(--color-earth-700)]">
                  {r.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[10px] text-[var(--color-earth-500)] m-0">
        Cálculo:{" "}
        {asOf
          ? new Date(asOf).toLocaleString("es-CO", { hour12: false })
          : "—"}{" "}
        · <code>chat_metrics_overview({days})</code>. &quot;Llevó a
        compra&quot; cuenta conversaciones cuyo visitante compró dentro de
        24h. El costo del modelo es real (tokens facturados por Anthropic).
      </p>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "normal",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "normal" | "good" | "warn";
}) {
  const valueColor =
    tone === "good"
      ? "text-[var(--color-leaf-700)]"
      : tone === "warn"
        ? "text-[#B23A1F]"
        : "text-[var(--color-leaf-900)]";
  return (
    <div className="bg-white p-3 rounded-[10px] border border-[rgba(47,98,56,0.1)]">
      <p className="text-[11px] text-[var(--color-earth-700)] m-0 mb-1">
        {label}
      </p>
      <p
        className={`font-serif text-xl font-medium m-0 leading-none ${valueColor}`}
      >
        {value}
      </p>
      {hint && (
        <p className="text-[10px] text-[var(--color-earth-500)] mt-1 m-0">
          {hint}
        </p>
      )}
    </div>
  );
}
