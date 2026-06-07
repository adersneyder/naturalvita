import { getAdminUser } from "@/lib/admin-auth";
import {
  getOverviewKpis,
  getQueueHealth,
  getFlowsPerformance,
  getRecentCronRuns,
} from "@/lib/admin/savia-stats";
import { formatCop } from "@/lib/format/currency";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ period?: string }>;

export default async function AdminSaviaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await getAdminUser();
  const { period } = await searchParams;
  const periodDays = period === "30" ? 30 : period === "1" ? 1 : 7;

  const [kpis, queue, flows, crons] = await Promise.all([
    getOverviewKpis(periodDays),
    getQueueHealth(),
    getFlowsPerformance(Math.max(periodDays, 30)), // revenue siempre con 30d mínimo
    getRecentCronRuns(8),
  ]);

  // Reglas de alerta de salud de envío (ver §7 del README).
  const bounceAlert = kpis.bounceRate > 2;
  const complaintAlert = kpis.complaintRate > 0.1;
  const cronStuck = queue.stuckSending;
  const hasAlerts = bounceAlert || complaintAlert || cronStuck;

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Savia
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            Motor de automatización de marketing · últimos {periodDays}{" "}
            {periodDays === 1 ? "día" : "días"}
          </p>
        </div>
        <PeriodSwitcher current={periodDays} />
      </header>

      {hasAlerts ? (
        <div className="mb-4 space-y-2">
          {complaintAlert && (
            <AlertBar
              level="critical"
              title={`Complaint rate ${kpis.complaintRate}% (umbral 0.1%)`}
              detail="Resend marcará la cuenta si pasa de 0.3%. Revisa contenido y segmentación de marketing."
            />
          )}
          {bounceAlert && (
            <AlertBar
              level="warning"
              title={`Bounce rate ${kpis.bounceRate}% (umbral 2%)`}
              detail="Reputación del subdominio en riesgo. Verifica que la lista no esté inflada con emails comprados o viejos."
            />
          )}
          {cronStuck && (
            <AlertBar
              level="warning"
              title="Jobs en estado 'sending' por más de 5 minutos"
              detail="Posible dispatcher bloqueado o fallo entre claim y envío. Revisa logs de /api/savia/dispatch."
            />
          )}
        </div>
      ) : null}

      {/* KPIs principales */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Enviados" value={kpis.sent.toString()} />
        <KpiCard
          label="Entregados"
          value={`${kpis.deliveryRate}%`}
          subtext={`${kpis.delivered} eventos`}
        />
        <KpiCard
          label="Aperturas"
          value={`${kpis.openRate}%`}
          subtext={`${kpis.opened} eventos`}
        />
        <KpiCard
          label="Clics"
          value={`${kpis.clickRate}%`}
          subtext={`${kpis.clicked} eventos`}
        />
      </section>

      {/* Cola + salud */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="En cola" value={queue.queued.toString()} tone="muted" />
        <KpiCard label="Enviando" value={queue.sending.toString()} tone="muted" />
        <KpiCard
          label="Fallidos 24h"
          value={queue.failed24h.toString()}
          tone={queue.failed24h > 0 ? "danger" : "muted"}
        />
        <KpiCard
          label="Saltados 24h"
          value={queue.skipped24h.toString()}
          tone="muted"
          subtext="predicates o suppressed"
        />
      </section>

      {/* Performance por flow */}
      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden mb-4">
        <header className="px-4 py-3 border-b border-[rgba(47,98,56,0.08)]">
          <h2 className="font-serif text-sm font-medium text-[var(--color-leaf-900)] m-0">
            Performance por flow · últimos 30 días
          </h2>
        </header>
        {flows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[var(--color-earth-700)]">
            No hay flows declarados todavía.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--color-earth-50)] text-[11px] uppercase tracking-wider text-[var(--color-earth-700)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Flow</th>
                  <th className="text-right px-3 py-2 font-medium">Sent</th>
                  <th className="text-right px-3 py-2 font-medium">Open</th>
                  <th className="text-right px-3 py-2 font-medium">Click</th>
                  <th className="text-right px-3 py-2 font-medium">Skip</th>
                  <th className="text-right px-3 py-2 font-medium">Fail</th>
                  <th className="text-right px-3 py-2 font-medium">Pedidos</th>
                  <th className="text-right px-4 py-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(47,98,56,0.06)]">
                {flows.map((f) => (
                  <tr key={f.flowId} className="hover:bg-[var(--color-earth-50)]/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            f.active
                              ? "bg-[var(--color-leaf-700)]"
                              : "bg-[var(--color-earth-300)]"
                          }`}
                          aria-label={f.active ? "Activo" : "Inactivo"}
                        />
                        <div>
                          <div className="text-[var(--color-leaf-900)] font-medium">
                            {f.flowName}
                          </div>
                          <div className="text-[11px] text-[var(--color-earth-500)] font-mono">
                            {f.flowId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right px-3 py-3 tabular-nums">
                      {f.sent}
                    </td>
                    <td className="text-right px-3 py-3 tabular-nums">
                      {f.delivered > 0 ? `${f.openRate}%` : "—"}
                    </td>
                    <td className="text-right px-3 py-3 tabular-nums">
                      {f.delivered > 0 ? `${f.clickRate}%` : "—"}
                    </td>
                    <td className="text-right px-3 py-3 tabular-nums text-[var(--color-earth-500)]">
                      {f.skipped}
                    </td>
                    <td className="text-right px-3 py-3 tabular-nums">
                      {f.failed > 0 ? (
                        <span className="text-[#B23A1F]">{f.failed}</span>
                      ) : (
                        <span className="text-[var(--color-earth-500)]">0</span>
                      )}
                    </td>
                    <td className="text-right px-3 py-3 tabular-nums">
                      {f.attributedOrders}
                    </td>
                    <td className="text-right px-4 py-3 tabular-nums font-medium text-[var(--color-leaf-900)]">
                      {f.attributedRevenueCop > 0
                        ? formatCop(f.attributedRevenueCop)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Últimas corridas de cron */}
      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        <header className="px-4 py-3 border-b border-[rgba(47,98,56,0.08)]">
          <h2 className="font-serif text-sm font-medium text-[var(--color-leaf-900)] m-0">
            Últimas ejecuciones de cron
          </h2>
          <p className="text-[11px] text-[var(--color-earth-500)] mt-0.5">
            <code>savia-dispatch</code> cada minuto ·{" "}
            <code>savia-cart-detect</code> cada 30 min
          </p>
        </header>
        {crons.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--color-earth-700)]">
            Aún no hay registros de cron.
          </div>
        ) : (
          <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
            {crons.map((c, i) => (
              <li
                key={`${c.jobname}-${c.startTime}-${i}`}
                className="flex items-center justify-between px-4 py-2.5 text-[13px]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      c.status === "succeeded"
                        ? "bg-[var(--color-leaf-700)]"
                        : "bg-[#B23A1F]"
                    }`}
                  />
                  <code className="text-[var(--color-leaf-900)]">{c.jobname}</code>
                  <span className="text-[var(--color-earth-500)] text-[11px]">
                    {new Date(c.startTime).toLocaleString("es-CO", {
                      hour12: false,
                    })}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--color-earth-700)] tabular-nums">
                  {c.returnMessage ?? c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function KpiCard({
  label,
  value,
  subtext,
  tone = "default",
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: "default" | "muted" | "danger";
}) {
  const valueColor =
    tone === "danger"
      ? "text-[#B23A1F]"
      : tone === "muted"
        ? "text-[var(--color-earth-900)]"
        : "text-[var(--color-leaf-900)]";
  return (
    <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-earth-500)] font-medium">
        {label}
      </p>
      <p className={`font-serif text-2xl mt-1 ${valueColor}`}>{value}</p>
      {subtext ? (
        <p className="text-[11px] text-[var(--color-earth-500)] mt-0.5">
          {subtext}
        </p>
      ) : null}
    </div>
  );
}

function AlertBar({
  level,
  title,
  detail,
}: {
  level: "warning" | "critical";
  title: string;
  detail: string;
}) {
  const styles =
    level === "critical"
      ? "bg-[#FCE9E5] border-[#B23A1F]/30 text-[#B23A1F]"
      : "bg-[#FAEEDA] border-[#854F0B]/30 text-[#854F0B]";
  return (
    <div className={`rounded-lg border px-4 py-2.5 ${styles}`}>
      <p className="text-[13px] font-medium m-0">{title}</p>
      <p className="text-[12px] opacity-80 mt-0.5 m-0">{detail}</p>
    </div>
  );
}

function PeriodSwitcher({ current }: { current: number }) {
  const options: Array<{ d: number; label: string }> = [
    { d: 1, label: "24 h" },
    { d: 7, label: "7 d" },
    { d: 30, label: "30 d" },
  ];
  return (
    <div className="inline-flex bg-white border border-[rgba(47,98,56,0.12)] rounded-lg overflow-hidden text-[12px]">
      {options.map((o) => {
        const isActive = current === o.d;
        const href = o.d === 7 ? "/admin/savia" : `/admin/savia?period=${o.d}`;
        return (
          <a
            key={o.d}
            href={href}
            className={`px-3 py-1.5 transition-colors ${
              isActive
                ? "bg-[var(--color-leaf-100)] text-[var(--color-leaf-900)] font-medium"
                : "text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
            }`}
          >
            {o.label}
          </a>
        );
      })}
    </div>
  );
}
