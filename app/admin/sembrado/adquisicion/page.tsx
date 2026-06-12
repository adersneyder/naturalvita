import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string; sort?: string }>;

const DEFAULT_DAYS = 30;

type AcqRow = {
  utm_source: string;
  sessions: number;
  visitors: number;
  last_touch_orders: number;
  last_touch_revenue_cop: number;
  first_touch_orders: number;
  first_touch_revenue_cop: number;
  conv_last_touch_pct: number | null;
  conv_first_touch_pct: number | null;
  as_of: string;
};

const SORTS: Record<string, { label: string; fn: (a: AcqRow, b: AcqRow) => number }> = {
  sessions: { label: "Sesiones", fn: (a, b) => b.sessions - a.sessions },
  last_revenue: {
    label: "Ingresos (last-touch)",
    fn: (a, b) => b.last_touch_revenue_cop - a.last_touch_revenue_cop,
  },
  first_revenue: {
    label: "Ingresos (first-touch)",
    fn: (a, b) => b.first_touch_revenue_cop - a.first_touch_revenue_cop,
  },
  conv_last: {
    label: "Conversión last-touch",
    fn: (a, b) => (b.conv_last_touch_pct ?? -1) - (a.conv_last_touch_pct ?? -1),
  },
};

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Pulso · Adquisición. Por utm_source con first-touch vs last-touch
 * comparables en la misma fila — ahí se ve si una fuente "introduce"
 * pero no "cierra", o lo contrario.
 *
 * (direct) agrupa el tráfico sin UTM: la línea base contra la que
 * comparar las campañas.
 */
export default async function PulsoAdquisicionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["owner", "admin"]);
  const params = await searchParams;
  const days = Math.max(1, Math.min(365, parseInt(params.days ?? "", 10) || DEFAULT_DAYS));
  const sortKey = params.sort && SORTS[params.sort] ? params.sort : "sessions";

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("tracking_acquisition_overview", {
    p_days: days,
  });
  if (error) console.error("[pulso/adquisicion] RPC", error.message);

  const rows = ((data ?? []) as AcqRow[]).sort(SORTS[sortKey].fn);
  const asOf = rows[0]?.as_of ?? null;

  const totals = rows.reduce(
    (acc, r) => ({
      sessions: acc.sessions + r.sessions,
      lastRevenue: acc.lastRevenue + r.last_touch_revenue_cop,
      firstRevenue: acc.firstRevenue + r.first_touch_revenue_cop,
      lastOrders: acc.lastOrders + r.last_touch_orders,
    }),
    { sessions: 0, lastRevenue: 0, firstRevenue: 0, lastOrders: 0 },
  );

  function buildHref(overrides: { days?: number; sort?: string }): string {
    const next = new URLSearchParams();
    const d = overrides.days ?? days;
    const s = overrides.sort ?? sortKey;
    if (d !== DEFAULT_DAYS) next.set("days", String(d));
    if (s !== "sessions") next.set("sort", s);
    return `/admin/sembrado/adquisicion${next.toString() ? `?${next}` : ""}`;
  }

  return (
    <>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Adquisición
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            {rows.length} fuentes · {totals.sessions.toLocaleString("es-CO")}{" "}
            sesiones · {formatCOP(totals.lastRevenue)} en ventas atribuidas
            (last-touch) · últimos {days} días
          </p>
        </div>
        <Link
          href="/admin/sembrado"
          className="text-xs text-[var(--color-iris-700)] hover:underline"
        >
          ← Sembrado
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
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
        <div className="ml-auto flex gap-1">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={buildHref({ days: d })}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                days === d
                  ? "bg-[var(--color-leaf-100)] border-[var(--color-leaf-700)]/30 text-[var(--color-leaf-900)] font-medium"
                  : "bg-white border-[rgba(47,98,56,0.12)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-x-auto mb-3">
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--color-earth-700)]">
            Sin tráfico identificable en esta ventana. Los datos aparecen
            cuando los visitantes con UTM (campañas de email, social,
            Google Ads) llegan al sitio.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(47,98,56,0.1)]">
                <Th>Fuente</Th>
                <Th align="right">Sesiones</Th>
                <Th align="right">Visitantes</Th>
                <Th
                  align="right"
                  title="Compras cuya última visita traía esta fuente. Atribución 'tradicional': la fuente que cerró."
                >
                  Compras last-touch
                </Th>
                <Th align="right">Ingresos last-touch</Th>
                <Th align="right">Conv last-touch</Th>
                <Th
                  align="right"
                  title="Compradores cuyo PRIMER touchpoint fue esta fuente. Mide cuánto 'inicia' una fuente la relación."
                >
                  Compras first-touch
                </Th>
                <Th align="right">Ingresos first-touch</Th>
                <Th align="right">Conv first-touch</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(47,98,56,0.06)]">
              {rows.map((r) => (
                <tr
                  key={r.utm_source}
                  className="hover:bg-[var(--color-earth-50)]/40"
                >
                  <td className="px-3 py-2">
                    <span className="font-mono text-[var(--color-leaf-900)]">
                      {r.utm_source}
                    </span>
                  </td>
                  <Td>{r.sessions.toLocaleString("es-CO")}</Td>
                  <Td>{r.visitors.toLocaleString("es-CO")}</Td>
                  <Td>{r.last_touch_orders.toLocaleString("es-CO")}</Td>
                  <Td>
                    {r.last_touch_revenue_cop > 0
                      ? formatCOP(r.last_touch_revenue_cop)
                      : "—"}
                  </Td>
                  <Td>
                    <ConvBadge value={r.conv_last_touch_pct} />
                  </Td>
                  <Td>{r.first_touch_orders.toLocaleString("es-CO")}</Td>
                  <Td>
                    {r.first_touch_revenue_cop > 0
                      ? formatCOP(r.first_touch_revenue_cop)
                      : "—"}
                  </Td>
                  <Td>
                    <ConvBadge value={r.conv_first_touch_pct} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[10px] text-[var(--color-earth-500)] m-0">
        Cálculo: {asOf ? new Date(asOf).toLocaleString("es-CO", { hour12: false }) : "—"} ·
        {" "}<code>tracking_acquisition_overview({days})</code>.{" "}
        First-touch atribuye la compra a la PRIMERA fuente vista por el
        visitante; last-touch a la fuente del propio evento purchase. Si una
        fuente es alta en first y baja en last, está introduciendo clientes
        que vuelven por otro canal — informa decisiones de retargeting.
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

function ConvBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-[var(--color-earth-400)]">—</span>;
  }
  const style =
    value >= 2
      ? "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]"
      : value >= 0.5
        ? "bg-[#FAEEDA] text-[#854F0B]"
        : "bg-[#FCE9E5] text-[#B23A1F]";
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded-md font-medium ${style}`}
    >
      {value.toFixed(1)}%
    </span>
  );
}
