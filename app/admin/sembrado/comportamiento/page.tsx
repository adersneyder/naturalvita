import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;

const DEFAULT_DAYS = 30;

type FunnelStep = {
  step_order: number;
  step_event_type: string;
  visitors: number;
  pct_of_previous: number | null;
  pct_of_total: number | null;
  as_of: string;
};

type Landing = {
  page_path: string;
  sessions: number;
  bounce_sessions: number;
  orders: number;
  conv_pct: number | null;
  as_of: string;
};

const STEP_LABELS: Record<string, string> = {
  page_view: "Vio cualquier página",
  product_view: "Vio una ficha de producto",
  add_to_cart: "Agregó al carrito",
  view_cart: "Abrió el carrito",
  checkout_start: "Inició checkout",
  add_payment_info: "Abrió el modal de pago",
  purchase: "Compró",
};

/**
 * Pulso · Comportamiento. Embudo global de visitantes únicos pasando por
 * los 7 escalones que el tracker registra hoy + top landings con
 * bounce y conversión. El "step roto" se identifica al instante en
 * pct_of_previous: el escalón con el drop más grande es donde invertir
 * en UX o copy primero.
 */
export default async function PulsoComportamientoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["owner", "admin"]);
  const params = await searchParams;
  const days = Math.max(1, Math.min(365, parseInt(params.days ?? "", 10) || DEFAULT_DAYS));

  const admin = createAdminClient();
  const [{ data: funnel }, { data: landings }] = await Promise.all([
    admin.rpc("tracking_funnel_overview", { p_days: days }),
    admin.rpc("tracking_top_landings", { p_days: days, p_limit: 10 }),
  ]);

  const steps = (funnel ?? []) as FunnelStep[];
  const lands = (landings ?? []) as Landing[];
  const asOf = steps[0]?.as_of ?? lands[0]?.as_of ?? null;

  // Identifica el escalón con peor pct_of_previous (excluyendo el primero).
  let worstDropIndex = -1;
  let worstDropValue = 100;
  steps.forEach((s, i) => {
    if (i === 0) return;
    if (s.pct_of_previous !== null && s.pct_of_previous < worstDropValue) {
      worstDropValue = s.pct_of_previous;
      worstDropIndex = i;
    }
  });

  const maxVisitors = steps[0]?.visitors ?? 1;

  return (
    <>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Comportamiento
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            Embudo de visitantes únicos · últimos {days} días
            {worstDropIndex >= 0 && (
              <>
                {" · "}
                <span className="text-[#B23A1F] font-medium">
                  Mayor fuga: {STEP_LABELS[steps[worstDropIndex].step_event_type]}{" "}
                  ({worstDropValue.toFixed(1)}% del paso anterior)
                </span>
              </>
            )}
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
            href={`/admin/sembrado/comportamiento${d !== DEFAULT_DAYS ? `?days=${d}` : ""}`}
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

      {/* Embudo */}
      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 mb-4">
        <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0 mb-3">
          Embudo de visitantes
        </h2>
        {steps.length === 0 || maxVisitors === 0 ? (
          <p className="text-xs text-[var(--color-earth-500)] m-0">
            Aún no hay datos en esta ventana.
          </p>
        ) : (
          <div className="space-y-2">
            {steps.map((s, i) => {
              const widthPct = (s.visitors / maxVisitors) * 100;
              const isWorst = i === worstDropIndex;
              return (
                <div key={s.step_order}>
                  <div className="flex items-baseline justify-between text-xs mb-1">
                    <span className="text-[var(--color-earth-900)]">
                      <span className="text-[var(--color-earth-500)] mr-1.5">
                        {s.step_order}.
                      </span>
                      {STEP_LABELS[s.step_event_type] ?? s.step_event_type}
                    </span>
                    <span className="tabular-nums text-[var(--color-earth-700)]">
                      {s.visitors.toLocaleString("es-CO")} visitantes
                      {s.pct_of_previous !== null && (
                        <span
                          className={`ml-2 ${isWorst ? "text-[#B23A1F] font-medium" : "text-[var(--color-earth-500)]"}`}
                        >
                          {s.pct_of_previous.toFixed(1)}% del paso previo
                        </span>
                      )}
                      {s.pct_of_total !== null && (
                        <span className="ml-2 text-[var(--color-earth-500)]">
                          · {s.pct_of_total.toFixed(1)}% total
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-3 bg-[var(--color-earth-100)] rounded-md overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isWorst ? "bg-[#B23A1F]" : "bg-[var(--color-leaf-700)]"
                      }`}
                      style={{ width: `${Math.max(2, widthPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Top landings */}
      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 mb-3">
        <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0 mb-3">
          Top landings
        </h2>
        {lands.length === 0 ? (
          <p className="text-xs text-[var(--color-earth-500)] m-0">
            Sin datos de páginas de entrada aún.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(47,98,56,0.1)]">
                <Th>Página de entrada</Th>
                <Th align="right">Sesiones</Th>
                <Th
                  align="right"
                  title="Sesiones con exactamente un page_view: el visitante llegó y se fue."
                >
                  Bounce
                </Th>
                <Th align="right">% Bounce</Th>
                <Th align="right">Pedidos</Th>
                <Th align="right">Conversión</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(47,98,56,0.06)]">
              {lands.map((l) => {
                const bouncePct =
                  l.sessions > 0
                    ? (l.bounce_sessions / l.sessions) * 100
                    : null;
                return (
                  <tr
                    key={l.page_path}
                    className="hover:bg-[var(--color-earth-50)]/40"
                  >
                    <td className="px-3 py-2">
                      <span className="font-mono text-[var(--color-leaf-900)] truncate block max-w-xs">
                        {l.page_path}
                      </span>
                    </td>
                    <Td>{l.sessions.toLocaleString("es-CO")}</Td>
                    <Td>{l.bounce_sessions.toLocaleString("es-CO")}</Td>
                    <Td>
                      <BouncePct value={bouncePct} />
                    </Td>
                    <Td>{l.orders.toLocaleString("es-CO")}</Td>
                    <Td>
                      <ConvBadge value={l.conv_pct} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-[10px] text-[var(--color-earth-500)] m-0">
        Cálculo: {asOf ? new Date(asOf).toLocaleString("es-CO", { hour12: false }) : "—"} ·
        {" "}<code>tracking_funnel_overview({days})</code>,{" "}
        <code>tracking_top_landings({days}, 10)</code>. El embudo cuenta
        visitantes únicos: un mismo visitor que vuelve más tarde a comprar
        cuenta como uno solo. Bounce alto en una landing con alta
        conversión: la página filtra eficientemente; bounce alto sin
        conversión: revisar copy, velocidad o relevancia del tráfico.
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

function BouncePct({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-[var(--color-earth-400)]">—</span>;
  }
  // Bounce: invertido al semáforo de conversión. Menos es mejor.
  const style =
    value <= 40
      ? "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]"
      : value <= 70
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
