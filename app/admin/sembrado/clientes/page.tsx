import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ segment?: string; sort?: string }>;

type RfmRow = {
  customer_email: string;
  customer_id: string | null;
  customer_name: string | null;
  last_order_at: string;
  days_since_last_order: number;
  orders_count: number;
  lifetime_revenue_cop: number;
  avg_order_value_cop: number;
  r_score: number;
  f_score: number;
  m_score: number;
  segment_code: string;
  as_of: string;
};

type CohortRow = {
  cohort_month: string;
  cohort_size: number;
  months_since: number;
  active_customers: number;
  as_of: string;
};

type ClvRow = {
  total_customers: number;
  repeat_customers: number;
  repeat_rate_pct: number;
  aov_cop: number;
  clv_estimate_cop: number;
  avg_days_between_orders: number;
  total_revenue_cop: number;
  as_of: string;
};

// Códigos ESTABLES (contrato compartido con la RPC + agentes Savia).
// El label es cosmético; el código no se renombra sin migración.
const SEGMENTS: Record<string, { label: string; tone: string; hint: string }> = {
  champions: {
    label: "Champions",
    tone: "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]",
    hint: "Compraron hace poco, frecuentemente y son los que más gastan. Atiéndelos con cuidado.",
  },
  loyal: {
    label: "Loyal",
    tone: "bg-[#DDEBFD] text-[#1A56DB]",
    hint: "Compradores recurrentes con frecuencia decente. Premia su lealtad.",
  },
  new: {
    label: "New",
    tone: "bg-[#E0F2F1] text-[#0F766E]",
    hint: "Compraron hace poco pero por primera o segunda vez. Empújalos a una segunda/tercera compra.",
  },
  at_risk: {
    label: "At risk",
    tone: "bg-[#FAEEDA] text-[#854F0B]",
    hint: "Eran frecuentes pero no vuelven. Reactiva con cupón antes de perderlos.",
  },
  hibernating: {
    label: "Hibernating",
    tone: "bg-[var(--color-earth-100)] text-[var(--color-earth-700)]",
    hint: "No compran hace tiempo y nunca fueron muy frecuentes. Reactivación con incentivo fuerte o dejar reposar.",
  },
  developing: {
    label: "Developing",
    tone: "bg-[#F3E8FF] text-[#6B21A8]",
    hint: "Casos intermedios — siguen su curso natural.",
  },
};

const SORTS: Record<
  string,
  { label: string; fn: (a: RfmRow, b: RfmRow) => number }
> = {
  revenue: { label: "Más gastan", fn: (a, b) => b.lifetime_revenue_cop - a.lifetime_revenue_cop },
  recency: { label: "Más recientes", fn: (a, b) => a.days_since_last_order - b.days_since_last_order },
  orders: { label: "Más pedidos", fn: (a, b) => b.orders_count - a.orders_count },
  aov: { label: "AOV", fn: (a, b) => b.avg_order_value_cop - a.avg_order_value_cop },
};

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
}

/**
 * Pulso · Clientes. Tres bloques:
 *  - KPIs CLV: salud agregada (repeat rate, AOV, CLV, gap).
 *  - Cohort heatmap: % de retención por mes-de-adquisición.
 *  - Tabla RFM: lista de clientes con segmento, filtros por segmento.
 *
 * El segment_code es contrato con Savia (campañas) y agentes — no
 * renombrar sin migración.
 */
export default async function PulsoClientesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["owner", "admin"]);
  const params = await searchParams;
  const segmentFilter = params.segment && SEGMENTS[params.segment] ? params.segment : "";
  const sortKey = params.sort && SORTS[params.sort] ? params.sort : "revenue";

  const admin = createAdminClient();
  const [{ data: rfm }, { data: cohorts }, { data: clvRows }] = await Promise.all([
    admin.rpc("customer_rfm"),
    admin.rpc("customer_cohorts", { p_months: 12 }),
    admin.rpc("customer_clv_summary"),
  ]);

  const allRfm = (rfm ?? []) as RfmRow[];
  const filtered = segmentFilter
    ? allRfm.filter((r) => r.segment_code === segmentFilter)
    : allRfm;
  const sorted = filtered.slice().sort(SORTS[sortKey].fn);

  const clv = (clvRows ?? [])[0] as ClvRow | undefined;
  const asOf = clv?.as_of ?? allRfm[0]?.as_of ?? null;

  // Conteo por segmento (sobre TODOS, no sobre filtrado).
  const segmentCounts = new Map<string, number>();
  for (const r of allRfm) {
    segmentCounts.set(r.segment_code, (segmentCounts.get(r.segment_code) ?? 0) + 1);
  }

  // Heatmap de cohortes: filas = cohort_month, columnas = months_since.
  const cohortsArr = (cohorts ?? []) as CohortRow[];
  const cohortMonths = Array.from(
    new Set(cohortsArr.map((c) => c.cohort_month)),
  ).sort();
  const maxMonthsSince = Math.max(
    0,
    ...cohortsArr.map((c) => c.months_since),
  );
  const cohortMap = new Map<string, CohortRow>();
  for (const c of cohortsArr) {
    cohortMap.set(`${c.cohort_month}|${c.months_since}`, c);
  }

  function buildHref(overrides: { segment?: string; sort?: string }): string {
    const next = new URLSearchParams();
    const s = overrides.segment ?? segmentFilter;
    const k = overrides.sort ?? sortKey;
    if (s) next.set("segment", s);
    if (k !== "revenue") next.set("sort", k);
    return `/admin/sembrado/clientes${next.toString() ? `?${next}` : ""}`;
  }

  return (
    <>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Clientes
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            {allRfm.length.toLocaleString("es-CO")} clientes con al menos
            una compra pagada · RFM + cohortes + CLV histórico
          </p>
        </div>
        <Link
          href="/admin/sembrado"
          className="text-xs text-[var(--color-iris-700)] hover:underline"
        >
          ← Sembrado
        </Link>
      </header>

      {/* KPIs CLV */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <Stat
          label="Clientes únicos"
          value={(clv?.total_customers ?? 0).toLocaleString("es-CO")}
        />
        <Stat
          label="Repeat rate"
          value={`${(clv?.repeat_rate_pct ?? 0).toFixed(1)}%`}
          hint={`${(clv?.repeat_customers ?? 0).toLocaleString("es-CO")} clientes con ≥2 pedidos`}
        />
        <Stat
          label="AOV"
          value={formatCOP(clv?.aov_cop ?? 0)}
          hint="Promedio por pedido pagado"
        />
        <Stat
          label="CLV histórico"
          value={formatCOP(clv?.clv_estimate_cop ?? 0)}
          hint="Revenue / total customers"
        />
      </section>

      {/* Segmentos como chips de filtro */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Link
          href={buildHref({ segment: "" })}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !segmentFilter
              ? "bg-[var(--color-leaf-100)] border-[var(--color-leaf-700)]/30 text-[var(--color-leaf-900)]"
              : "bg-white border-[rgba(47,98,56,0.12)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
          }`}
        >
          Todos
          <span className="ml-1.5 text-[var(--color-earth-500)]">
            {allRfm.length}
          </span>
        </Link>
        {Object.entries(SEGMENTS).map(([code, seg]) => {
          const n = segmentCounts.get(code) ?? 0;
          const active = segmentFilter === code;
          return (
            <Link
              key={code}
              href={buildHref({ segment: code })}
              title={seg.hint}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? `${seg.tone} border-transparent`
                  : "bg-white border-[rgba(47,98,56,0.12)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
              }`}
            >
              {seg.label}
              <span className={`ml-1.5 ${active ? "" : "text-[var(--color-earth-500)]"}`}>
                {n}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Cohort heatmap */}
      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 mb-4 overflow-x-auto">
        <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0 mb-3">
          Retención por cohorte
        </h2>
        {cohortMonths.length === 0 ? (
          <p className="text-xs text-[var(--color-earth-500)] m-0">
            Aún no hay datos suficientes — los meses con compradores
            aparecen aquí a medida que se acumulan.
          </p>
        ) : (
          <table className="text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1 text-[10px] uppercase tracking-wider font-medium text-[var(--color-earth-500)] text-left">
                  Cohorte
                </th>
                <th className="px-2 py-1 text-[10px] uppercase tracking-wider font-medium text-[var(--color-earth-500)] text-right">
                  Tamaño
                </th>
                {Array.from({ length: maxMonthsSince + 1 }, (_, i) => (
                  <th
                    key={i}
                    className="px-2 py-1 text-[10px] uppercase tracking-wider font-medium text-[var(--color-earth-500)] text-center"
                  >
                    +{i}m
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohortMonths.map((cm) => {
                const sample = cohortMap.get(`${cm}|0`);
                const size = sample?.cohort_size ?? 0;
                return (
                  <tr key={cm}>
                    <td className="px-2 py-1 text-[var(--color-earth-900)]">
                      {formatMonth(cm)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-[var(--color-earth-700)]">
                      {size}
                    </td>
                    {Array.from({ length: maxMonthsSince + 1 }, (_, i) => {
                      const cell = cohortMap.get(`${cm}|${i}`);
                      if (!cell || size === 0) {
                        return (
                          <td
                            key={i}
                            className="px-1 py-1 text-center text-[var(--color-earth-300)]"
                          >
                            ·
                          </td>
                        );
                      }
                      const pct = (cell.active_customers / size) * 100;
                      // Verde más intenso a mayor retención.
                      const opacity = Math.min(1, pct / 100);
                      return (
                        <td key={i} className="px-1 py-1 text-center">
                          <span
                            className="inline-block px-1.5 py-0.5 rounded font-medium tabular-nums"
                            style={{
                              backgroundColor: `rgba(47, 98, 56, ${0.08 + opacity * 0.6})`,
                              color: opacity > 0.4 ? "white" : "var(--color-leaf-900)",
                            }}
                            title={`${cell.active_customers} de ${size} activos`}
                          >
                            {pct.toFixed(0)}%
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Tabla RFM */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {Object.entries(SORTS).map(([key, s]) => (
          <Link
            key={key}
            href={buildHref({ sort: key })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              sortKey === key
                ? "bg-[var(--color-leaf-100)] border-[var(--color-leaf-700)]/30 text-[var(--color-leaf-900)]"
                : "bg-white border-[rgba(47,98,56,0.12)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-x-auto mb-3">
        {sorted.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--color-earth-700)]">
            {segmentFilter
              ? `Ningún cliente en el segmento "${SEGMENTS[segmentFilter].label}".`
              : "Aún no hay clientes con compras pagadas."}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(47,98,56,0.1)]">
                <Th>Cliente</Th>
                <Th align="right">Pedidos</Th>
                <Th align="right">Gasto total</Th>
                <Th align="right">AOV</Th>
                <Th align="right">Última compra</Th>
                <Th
                  align="right"
                  title="R = recency (recencia), F = frequency (pedidos), M = monetary (gasto). 1 peor, 5 mejor."
                >
                  RFM
                </Th>
                <Th>Segmento</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(47,98,56,0.06)]">
              {sorted.slice(0, 200).map((r) => {
                const seg = SEGMENTS[r.segment_code] ?? SEGMENTS.developing;
                return (
                  <tr
                    key={r.customer_email}
                    className="hover:bg-[var(--color-earth-50)]/40"
                  >
                    <td className="px-3 py-2 min-w-0">
                      <p className="text-[var(--color-leaf-900)] truncate m-0 max-w-xs">
                        {r.customer_name ?? r.customer_email}
                      </p>
                      <p className="text-[10px] text-[var(--color-earth-500)] m-0 truncate max-w-xs">
                        {r.customer_email}
                        {r.customer_id ? "" : " (guest)"}
                      </p>
                    </td>
                    <Td>{r.orders_count}</Td>
                    <Td>{formatCOP(r.lifetime_revenue_cop)}</Td>
                    <Td>{formatCOP(r.avg_order_value_cop)}</Td>
                    <Td>
                      {r.days_since_last_order === 0
                        ? "hoy"
                        : `hace ${r.days_since_last_order}d`}
                    </Td>
                    <td className="px-3 py-2 text-right tabular-nums font-mono text-[10px] text-[var(--color-earth-700)]">
                      R{r.r_score} F{r.f_score} M{r.m_score}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium ${seg.tone}`}
                      >
                        {seg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {sorted.length > 200 && (
          <p className="px-3 py-2 text-[10px] text-[var(--color-earth-500)] border-t border-[rgba(47,98,56,0.06)] m-0">
            Mostrando 200 de {sorted.length.toLocaleString("es-CO")}. Filtra
            por segmento para ver subconjuntos específicos.
          </p>
        )}
      </div>

      <p className="text-[10px] text-[var(--color-earth-500)] m-0">
        Cálculo: {asOf ? new Date(asOf).toLocaleString("es-CO", { hour12: false }) : "—"} ·
        {" "}<code>customer_rfm()</code>,{" "}
        <code>customer_cohorts(12)</code>,{" "}
        <code>customer_clv_summary()</code>. RFM agrupa por email para
        unificar guest + registered. Los códigos de segmento (champions,
        loyal, new, at_risk, hibernating, developing) son contrato estable
        — los flows de Savia y agentes futuros los usan como llave.
      </p>
    </>
  );
}

function Th({
  children,
  align,
  title,
}: {
  children: React.ReactNode;
  align?: "right";
  title?: string;
}) {
  return (
    <th
      title={title}
      className={`px-3 py-2 text-[10px] uppercase tracking-wider font-medium text-[var(--color-earth-500)] ${
        align === "right" ? "text-right" : "text-left"
      } ${title ? "cursor-help" : ""}`}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2 text-right tabular-nums text-[var(--color-earth-900)]">
      {children}
    </td>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white p-3 rounded-[10px] border border-[rgba(47,98,56,0.1)]">
      <p className="text-[11px] text-[var(--color-earth-700)] m-0 mb-1">
        {label}
      </p>
      <p className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0 leading-none">
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
