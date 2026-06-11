import Image from "next/image";
import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string; sort?: string }>;

const DEFAULT_DAYS = 30;

type FunnelRow = {
  product_id: string | null;
  product_slug: string;
  product_name: string;
  image_url: string | null;
  views: number;
  adds_to_cart: number;
  unique_buyers: number;
  units_sold: number;
  revenue_cop: number;
  conv_view_to_cart: number | null;
  conv_view_to_purchase: number | null;
};

const SORTS: Record<string, { label: string; fn: (a: FunnelRow, b: FunnelRow) => number }> = {
  views: { label: "Más vistos", fn: (a, b) => b.views - a.views },
  revenue: { label: "Más ingresos", fn: (a, b) => b.revenue_cop - a.revenue_cop },
  conv: {
    label: "Mejor conversión",
    fn: (a, b) => (b.conv_view_to_purchase ?? -1) - (a.conv_view_to_purchase ?? -1),
  },
  // "Oportunidades": mucha vista, poca compra. Ordena por el gap
  // views * (1 - conversión normalizada) — un proxy simple de "dinero
  // dejado sobre la mesa". Solo aplica a filas con vistas.
  opportunity: {
    label: "Oportunidades",
    fn: (a, b) => {
      const score = (r: FunnelRow) =>
        r.views > 0 ? r.views * (1 - (r.conv_view_to_purchase ?? 0) / 100) : -1;
      return score(b) - score(a);
    },
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
 * Funnel por producto: vistas → carrito → compra, sobre la ventana
 * elegida. La agregación corre en Postgres (RPC tracking_product_funnel)
 * — el panel solo ordena y presenta.
 *
 * El orden "Oportunidades" es el accionable: productos con mucho interés
 * (vistas) y poca conversión. Ahí es donde una mejor foto, un precio
 * ajustado o una descripción más clara paga más rápido.
 */
export default async function SembradoProductosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["owner", "admin"]);
  const params = await searchParams;
  const days = Math.max(1, Math.min(365, parseInt(params.days ?? "", 10) || DEFAULT_DAYS));
  const sortKey = params.sort && SORTS[params.sort] ? params.sort : "views";

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("tracking_product_funnel", {
    p_days: days,
  });

  if (error) {
    console.error("[sembrado/productos] RPC error", error.message);
  }

  const rows = ((data ?? []) as FunnelRow[]).sort(SORTS[sortKey].fn);

  // Totales para la cabecera.
  const totals = rows.reduce(
    (acc, r) => ({
      views: acc.views + r.views,
      carts: acc.carts + r.adds_to_cart,
      revenue: acc.revenue + r.revenue_cop,
    }),
    { views: 0, carts: 0, revenue: 0 },
  );

  function buildHref(overrides: { days?: number; sort?: string }): string {
    const next = new URLSearchParams();
    const d = overrides.days ?? days;
    const s = overrides.sort ?? sortKey;
    if (d !== DEFAULT_DAYS) next.set("days", String(d));
    if (s !== "views") next.set("sort", s);
    return `/admin/sembrado/productos${next.toString() ? `?${next}` : ""}`;
  }

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Funnel por producto
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            {rows.length} productos · {totals.views.toLocaleString("es-CO")}{" "}
            vistas · {formatCOP(totals.revenue)} en ventas · últimos {days} días
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

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-x-auto">
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--color-earth-700)]">
            Sin datos en esta ventana. Los eventos aparecen a medida que los
            visitantes navegan el catálogo con el tracker activo.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(47,98,56,0.1)] text-left">
                <Th>Producto</Th>
                <Th align="right">Vistas</Th>
                <Th align="right">Al carrito</Th>
                <Th align="right">Pedidos</Th>
                <Th align="right">Unidades</Th>
                <Th align="right">Ingresos</Th>
                <Th align="right">Vista→Carrito</Th>
                <Th align="right">Vista→Compra</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(47,98,56,0.06)]">
              {rows.map((r) => (
                <tr
                  key={r.product_slug}
                  className="hover:bg-[var(--color-earth-50)]/40"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0 max-w-xs">
                      {r.image_url ? (
                        <Image
                          src={r.image_url}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-md object-cover flex-shrink-0 w-7 h-7"
                        />
                      ) : (
                        <span className="w-7 h-7 rounded-md bg-[var(--color-earth-100)] flex-shrink-0" />
                      )}
                      {r.product_id ? (
                        <Link
                          href={`/producto/${r.product_slug}`}
                          target="_blank"
                          className="truncate text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)]"
                          title={r.product_name}
                        >
                          {r.product_name}
                        </Link>
                      ) : (
                        <span
                          className="truncate text-[var(--color-earth-500)]"
                          title={`Slug "${r.product_slug}" sin producto asociado (¿renombrado?)`}
                        >
                          {r.product_name} ⚠
                        </span>
                      )}
                    </div>
                  </td>
                  <Td>{r.views.toLocaleString("es-CO")}</Td>
                  <Td>{r.adds_to_cart.toLocaleString("es-CO")}</Td>
                  <Td>{r.unique_buyers.toLocaleString("es-CO")}</Td>
                  <Td>{r.units_sold.toLocaleString("es-CO")}</Td>
                  <Td>{r.revenue_cop > 0 ? formatCOP(r.revenue_cop) : "—"}</Td>
                  <Td>
                    <ConvBadge value={r.conv_view_to_cart} />
                  </Td>
                  <Td>
                    <ConvBadge value={r.conv_view_to_purchase} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[10px] text-[var(--color-earth-500)] mt-3">
        Vistas y carrito vienen del tracker (visitantes con JS). Pedidos,
        unidades e ingresos vienen de las órdenes pagadas — por eso pueden
        aparecer productos vendidos con 0 vistas (compra directa desde
        email, o navegador sin tracker). &quot;Oportunidades&quot; ordena
        por interés no convertido: muchas vistas, poca compra.
      </p>
    </>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}) {
  return (
    <th
      className={`px-3 py-2 text-[10px] uppercase tracking-wider font-medium text-[var(--color-earth-500)] ${
        align === "right" ? "text-right" : "text-left"
      }`}
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
 * Badge de conversión con semáforo. Umbrales pensados para e-commerce
 * de suplementos: >2% vista→compra es bueno, <0.5% es señal de problema
 * (si hay tráfico suficiente para que el número signifique algo).
 */
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
