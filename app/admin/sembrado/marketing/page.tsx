import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;

const DEFAULT_DAYS = 30;

type FlowRow = {
  flow_id: string;
  flow_name: string;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  attributed_orders: number;
  attributed_revenue_cop: number;
  open_rate_pct: number | null;
  ctr_pct: number | null;
  revenue_per_send_cop: number | null;
  as_of: string;
};

type CouponRow = {
  coupon_id: string;
  code: string;
  description: string;
  redemptions: number;
  unique_customers: number;
  revenue_cop: number;
  discount_total_cop: number;
  aov_with_coupon_cop: number;
  discount_pct_of_revenue: number;
  as_of: string;
};

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Pulso · Marketing. Dos secciones:
 *  - Atribución por flow Savia: revenue last-touch atribuido a cada
 *    flow + open rate + CTR + revenue por envío.
 *  - Performance de cupones: redenciones, revenue traído, descuento
 *    aplicado, % descuento sobre revenue.
 *
 * Ambas vistas son el "feedback loop" de las acciones de marketing
 * — y la base para que un agente decida qué flow potenciar o qué
 * cupón retirar.
 */
export default async function PulsoMarketingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["owner", "admin"]);
  const params = await searchParams;
  const days = Math.max(1, Math.min(365, parseInt(params.days ?? "", 10) || DEFAULT_DAYS));

  const admin = createAdminClient();
  const [{ data: flows }, { data: coupons }] = await Promise.all([
    admin.rpc("savia_flow_attribution", {
      p_days: days,
      p_attribution_window_days: 7,
    }),
    admin.rpc("coupon_performance", { p_days: days }),
  ]);

  const flowRows = ((flows ?? []) as FlowRow[]).sort(
    (a, b) => b.attributed_revenue_cop - a.attributed_revenue_cop,
  );
  const couponRows = ((coupons ?? []) as CouponRow[]);

  const flowTotals = flowRows.reduce(
    (acc, r) => ({
      sent: acc.sent + r.emails_sent,
      opened: acc.opened + r.emails_opened,
      revenue: acc.revenue + r.attributed_revenue_cop,
      orders: acc.orders + r.attributed_orders,
    }),
    { sent: 0, opened: 0, revenue: 0, orders: 0 },
  );

  const couponTotals = couponRows.reduce(
    (acc, r) => ({
      redemptions: acc.redemptions + r.redemptions,
      revenue: acc.revenue + r.revenue_cop,
      discount: acc.discount + r.discount_total_cop,
    }),
    { redemptions: 0, revenue: 0, discount: 0 },
  );

  const asOf = flowRows[0]?.as_of ?? couponRows[0]?.as_of ?? null;

  return (
    <>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Marketing
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            Atribución por flow Savia · performance de cupones · últimos{" "}
            {days} días
          </p>
        </div>
        <Link
          href="/admin/sembrado"
          className="text-xs text-[var(--color-iris-700)] hover:underline"
        >
          ← Sembrado
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-1 mb-4">
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={`/admin/sembrado/marketing${d !== DEFAULT_DAYS ? `?days=${d}` : ""}`}
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

      {/* Flows Savia */}
      <section className="mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0">
            Atribución por flow Savia
          </h2>
          <p className="text-xs text-[var(--color-earth-700)] m-0">
            {flowTotals.sent.toLocaleString("es-CO")} envíos ·{" "}
            {flowTotals.orders.toLocaleString("es-CO")} órdenes atribuidas ·{" "}
            <span className="font-medium text-[var(--color-leaf-900)]">
              {formatCOP(flowTotals.revenue)}
            </span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-x-auto">
          {flowRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-earth-700)]">
              Sin envíos de flows en esta ventana. Los datos aparecen
              cuando Savia procesa al menos un job con flow_id.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(47,98,56,0.1)]">
                  <Th>Flow</Th>
                  <Th align="right">Enviados</Th>
                  <Th align="right">Abiertos</Th>
                  <Th align="right">Open rate</Th>
                  <Th align="right">CTR</Th>
                  <Th
                    align="right"
                    title="Órdenes pagadas dentro de 7 días después de un open/click del flow (atribución last-touch)."
                  >
                    Órdenes atribuidas
                  </Th>
                  <Th align="right">Revenue atribuido</Th>
                  <Th
                    align="right"
                    title="Revenue atribuido dividido por emails enviados — la métrica de eficiencia del flow."
                  >
                    Rev / envío
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(47,98,56,0.06)]">
                {flowRows.map((r) => (
                  <tr
                    key={r.flow_id}
                    className="hover:bg-[var(--color-earth-50)]/40"
                  >
                    <td className="px-3 py-2">
                      <span className="text-[var(--color-leaf-900)] font-medium">
                        {r.flow_name}
                      </span>
                      <span className="text-[var(--color-earth-500)] font-mono text-[10px] ml-1.5">
                        {r.flow_id}
                      </span>
                    </td>
                    <Td>{r.emails_sent.toLocaleString("es-CO")}</Td>
                    <Td>{r.emails_opened.toLocaleString("es-CO")}</Td>
                    <Td>
                      <Pct value={r.open_rate_pct} goodAt={20} okAt={10} />
                    </Td>
                    <Td>
                      <Pct value={r.ctr_pct} goodAt={3} okAt={1} />
                    </Td>
                    <Td>{r.attributed_orders.toLocaleString("es-CO")}</Td>
                    <Td>
                      {r.attributed_revenue_cop > 0
                        ? formatCOP(r.attributed_revenue_cop)
                        : "—"}
                    </Td>
                    <Td>
                      {r.revenue_per_send_cop !== null
                        ? formatCOP(Math.round(r.revenue_per_send_cop))
                        : "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Cupones */}
      <section className="mb-3">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0">
            Performance de cupones
          </h2>
          <p className="text-xs text-[var(--color-earth-700)] m-0">
            {couponTotals.redemptions.toLocaleString("es-CO")} redenciones ·{" "}
            <span className="font-medium text-[var(--color-leaf-900)]">
              {formatCOP(couponTotals.revenue)}
            </span>{" "}
            ingresos ·{" "}
            <span className="text-[#B23A1F]">
              {formatCOP(couponTotals.discount)}
            </span>{" "}
            en descuentos
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-x-auto">
          {couponRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-earth-700)]">
              Sin redenciones de cupones en esta ventana. Crea uno desde{" "}
              <Link
                href="/admin/cupones/nuevo"
                className="text-[var(--color-iris-700)] hover:underline"
              >
                /admin/cupones/nuevo
              </Link>{" "}
              para empezar.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(47,98,56,0.1)]">
                  <Th>Cupón</Th>
                  <Th align="right">Redenciones</Th>
                  <Th align="right">Clientes</Th>
                  <Th align="right">Revenue</Th>
                  <Th align="right">Descuento total</Th>
                  <Th
                    align="right"
                    title="Descuento total / Revenue. Cuanto más alto, más jugoso fue el cupón para el cliente — y más caro para nosotros."
                  >
                    % desc / rev
                  </Th>
                  <Th align="right">AOV con cupón</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(47,98,56,0.06)]">
                {couponRows.map((r) => (
                  <tr
                    key={r.coupon_id}
                    className="hover:bg-[var(--color-earth-50)]/40"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/cupones/${r.coupon_id}`}
                        className="font-mono font-medium text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)]"
                      >
                        {r.code}
                      </Link>
                      <span className="text-[var(--color-earth-500)] text-[10px] ml-2">
                        {r.description}
                      </span>
                    </td>
                    <Td>{r.redemptions.toLocaleString("es-CO")}</Td>
                    <Td>{r.unique_customers.toLocaleString("es-CO")}</Td>
                    <Td>{formatCOP(r.revenue_cop)}</Td>
                    <Td>
                      <span className="text-[#B23A1F]">
                        {formatCOP(r.discount_total_cop)}
                      </span>
                    </Td>
                    <Td>{r.discount_pct_of_revenue.toFixed(1)}%</Td>
                    <Td>{formatCOP(r.aov_with_coupon_cop)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <p className="text-[10px] text-[var(--color-earth-500)] m-0">
        Cálculo: {asOf ? new Date(asOf).toLocaleString("es-CO", { hour12: false }) : "—"} ·{" "}
        <code>savia_flow_attribution({days}, 7)</code>,{" "}
        <code>coupon_performance({days})</code>. La atribución de flows
        es <strong>last-touch</strong> dentro de los 7 días siguientes
        al click/open: si un cliente abrió emails de 2 flows, solo el
        último cuenta. El revenue de cupones es el ingreso BRUTO de las
        órdenes con redención — el "incremental" (cuánto del revenue no
        habría existido sin el cupón) requeriría un A/B test, no se
        deriva de aquí.
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

/**
 * Badge de porcentaje con umbrales configurables. Útil para open rates,
 * CTRs, etc. donde lo "bueno" depende del contexto.
 */
function Pct({
  value,
  goodAt,
  okAt,
}: {
  value: number | null;
  goodAt: number;
  okAt: number;
}) {
  if (value === null) {
    return <span className="text-[var(--color-earth-400)]">—</span>;
  }
  const style =
    value >= goodAt
      ? "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]"
      : value >= okAt
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
