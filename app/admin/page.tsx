import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LOW_STOCK_THRESHOLD = 5;

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function deltaPct(current: number, previous: number): {
  text: string;
  positive: boolean | null;
} {
  if (previous === 0 && current === 0) return { text: "—", positive: null };
  if (previous === 0) return { text: "nuevo", positive: true };
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? "+" : "";
  return { text: `${sign}${pct.toFixed(0)}%`, positive: pct >= 0 };
}

/**
 * Dashboard del admin. Vista operativa: lo que pasó ayer/hoy/esta semana
 * y lo que requiere acción ahora. Reemplazó la versión "checklist de
 * configuración inicial" porque ya pasamos esa fase — ahora la prioridad
 * es ver el negocio en una pantalla.
 *
 * Mezcla data de:
 *  - orders (ventas, pedidos por despachar)
 *  - tracking_events (visitantes, conversión, top productos vistos, UTM)
 *  - products (stock bajo, drafts pendientes de aprobar)
 *  - email_jobs (fallos de Savia)
 *  - admin_audit_log (actividad reciente del equipo)
 */
export default async function DashboardPage() {
  const adminUser = await requireRole([
    "owner",
    "admin",
    "editor",
    "cashier",
    "warehouse",
  ]);
  const isAdmin = ["owner", "admin"].includes(adminUser.role);

  // Inicio del día en hora Colombia (UTC-5) para el "hoy".
  const colombiaTodayStart = new Date();
  colombiaTodayStart.setUTCHours(5, 0, 0, 0);
  if (colombiaTodayStart > new Date()) {
    colombiaTodayStart.setUTCDate(colombiaTodayStart.getUTCDate() - 1);
  }
  const todayIso = colombiaTodayStart.toISOString();

  const last7Start = new Date();
  last7Start.setUTCDate(last7Start.getUTCDate() - 7);
  const last7Iso = last7Start.toISOString();

  const prev7Start = new Date();
  prev7Start.setUTCDate(prev7Start.getUTCDate() - 14);
  const prev7End = new Date();
  prev7End.setUTCDate(prev7End.getUTCDate() - 7);
  const prev7StartIso = prev7Start.toISOString();
  const prev7EndIso = prev7End.toISOString();

  const supabase = await createClient();
  const admin = createAdminClient();

  // Bloque 1: KPIs principales (ventas, pedidos, visitas, conversión)
  const [
    { data: ordersTodayPaid },
    { count: ordersToday },
    { data: orders7d },
    { data: ordersPrev7d },
    { count: pendingOrdersCount },
    { count: productsDraft },
    { count: productsActive },
    { data: lowStock },
    { count: failedJobsCount },
    { data: visitors7dRows },
    { data: visitorsPrev7dRows },
    { count: pageViews7d },
    { count: productViews7d },
    { count: purchases7d },
    { data: topProductsRaw },
    { data: topUtmRaw },
    { data: cartAddsRaw },
    { data: recentAudit },
  ] = await Promise.all([
    // Ventas hoy
    supabase
      .from("orders")
      .select("total_cop")
      .eq("payment_status", "paid")
      .gte("created_at", todayIso),
    // Pedidos hoy (todos)
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayIso),
    // Pedidos pagados últimos 7 días (para chart + delta)
    supabase
      .from("orders")
      .select("total_cop, created_at")
      .eq("payment_status", "paid")
      .gte("created_at", last7Iso),
    // Pedidos pagados 7d previos (para % delta)
    supabase
      .from("orders")
      .select("total_cop")
      .eq("payment_status", "paid")
      .gte("created_at", prev7StartIso)
      .lt("created_at", prev7EndIso),
    // Por despachar
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .in("status", ["paid", "processing"]),
    // Catálogo
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    // Stock bajo: track_stock=true Y stock < umbral Y is_active
    admin
      .from("products")
      .select("id, name, slug, stock")
      .eq("track_stock", true)
      .eq("is_active", true)
      .lt("stock", LOW_STOCK_THRESHOLD)
      .order("stock")
      .limit(5),
    // Jobs Savia fallidos sin retry
    admin
      .from("email_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),
    // Tracker: visitantes únicos 7d
    admin
      .from("tracking_events")
      .select("visitor_id")
      .gte("created_at", last7Iso)
      .limit(20000),
    admin
      .from("tracking_events")
      .select("visitor_id")
      .gte("created_at", prev7StartIso)
      .lt("created_at", prev7EndIso)
      .limit(20000),
    admin
      .from("tracking_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", last7Iso)
      .eq("event_type", "page_view"),
    admin
      .from("tracking_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", last7Iso)
      .eq("event_type", "product_view"),
    admin
      .from("tracking_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", last7Iso)
      .eq("event_type", "purchase"),
    // Top productos vistos
    admin
      .from("tracking_events")
      .select("event_props")
      .gte("created_at", last7Iso)
      .eq("event_type", "product_view")
      .limit(10000),
    // Top UTM
    admin
      .from("tracking_events")
      .select("utm_source")
      .gte("created_at", last7Iso)
      .not("utm_source", "is", null)
      .limit(10000),
    // Para carritos abandonados: visitor_id con add_to_cart en últimos 7d
    admin
      .from("tracking_events")
      .select("visitor_id, event_type")
      .gte("created_at", last7Iso)
      .in("event_type", ["add_to_cart", "purchase"])
      .limit(20000),
    // Actividad reciente
    admin
      .from("admin_audit_log")
      .select("id, actor_email, action, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const salesToday = (ordersTodayPaid ?? []).reduce(
    (acc, o: { total_cop: number }) => acc + o.total_cop,
    0,
  );
  const sales7d = (orders7d ?? []).reduce(
    (acc, o: { total_cop: number }) => acc + o.total_cop,
    0,
  );
  const salesPrev7d = (ordersPrev7d ?? []).reduce(
    (acc, o: { total_cop: number }) => acc + o.total_cop,
    0,
  );
  const salesDelta = deltaPct(sales7d, salesPrev7d);

  const visitors7d = new Set(
    ((visitors7dRows ?? []) as Array<{ visitor_id: string }>).map(
      (r) => r.visitor_id,
    ),
  ).size;
  const visitorsPrev7d = new Set(
    ((visitorsPrev7dRows ?? []) as Array<{ visitor_id: string }>).map(
      (r) => r.visitor_id,
    ),
  ).size;
  const visitorsDelta = deltaPct(visitors7d, visitorsPrev7d);

  const conversion7d =
    productViews7d && productViews7d > 0
      ? ((purchases7d ?? 0) / productViews7d) * 100
      : 0;

  // Mini chart 7 días: ingresos por día (en orden cronológico).
  const dayBuckets: number[] = Array(7).fill(0);
  for (const o of (orders7d ?? []) as Array<{
    total_cop: number;
    created_at: string;
  }>) {
    const dayMs = new Date(o.created_at).getTime();
    const daysAgo = Math.floor(
      (Date.now() - dayMs) / (1000 * 60 * 60 * 24),
    );
    if (daysAgo >= 0 && daysAgo < 7) {
      dayBuckets[6 - daysAgo] += o.total_cop;
    }
  }
  const maxDay = Math.max(1, ...dayBuckets);

  // Top productos vistos.
  const productCounts = new Map<string, { name: string; count: number; slug: string }>();
  for (const r of (topProductsRaw ?? []) as Array<{
    event_props: { product_slug?: string; product_name?: string };
  }>) {
    const slug = r.event_props?.product_slug;
    const name = r.event_props?.product_name;
    if (!slug || !name) continue;
    const existing = productCounts.get(slug);
    if (existing) existing.count++;
    else productCounts.set(slug, { name, slug, count: 1 });
  }
  const topProducts = Array.from(productCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top UTM source.
  const utmCounts = new Map<string, number>();
  for (const r of (topUtmRaw ?? []) as Array<{ utm_source: string | null }>) {
    if (!r.utm_source) continue;
    utmCounts.set(r.utm_source, (utmCounts.get(r.utm_source) ?? 0) + 1);
  }
  const topUtm = Array.from(utmCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Carritos abandonados (7d): visitors con add_to_cart pero sin purchase.
  // No es perfecto (no excluye al mismo visitor que compró en otro
  // dispositivo) pero es una buena aproximación operativa.
  const addCartVisitors = new Set<string>();
  const purchaseVisitors = new Set<string>();
  for (const r of (cartAddsRaw ?? []) as Array<{
    visitor_id: string;
    event_type: string;
  }>) {
    if (r.event_type === "add_to_cart") addCartVisitors.add(r.visitor_id);
    else if (r.event_type === "purchase") purchaseVisitors.add(r.visitor_id);
  }
  let abandonedCarts = 0;
  for (const v of addCartVisitors) {
    if (!purchaseVisitors.has(v)) abandonedCarts++;
  }

  return (
    <>
      {/* KPIs principales */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <KpiCard
          label="Ventas hoy"
          value={formatCOP(salesToday)}
          delta={
            (ordersTodayPaid?.length ?? 0) === 0
              ? "Sin pedidos pagados aún"
              : `${ordersTodayPaid?.length ?? 0} pedidos pagados`
          }
        />
        <KpiCard
          label="Pedidos hoy"
          value={String(ordersToday ?? 0)}
          delta={
            (ordersToday ?? 0) === 0
              ? "Aún no hay pedidos"
              : `${pendingOrdersCount ?? 0} por despachar`
          }
        />
        <KpiCard
          label="Visitantes 7d"
          value={visitors7d.toLocaleString("es-CO")}
          delta={visitorsDelta.text + " vs. semana anterior"}
          deltaPositive={visitorsDelta.positive}
        />
        <KpiCard
          label="Conversión 7d"
          value={`${conversion7d.toFixed(2)}%`}
          delta={`${(purchases7d ?? 0).toLocaleString("es-CO")} de ${(productViews7d ?? 0).toLocaleString("es-CO")} vistas`}
        />
      </section>

      {/* Tendencia + atención */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-3.5 mb-4">
        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
              Ingresos últimos 7 días
            </p>
            <p className="text-xs text-[var(--color-earth-700)] m-0">
              {formatCOP(sales7d)} ·{" "}
              <span
                className={
                  salesDelta.positive === true
                    ? "text-[var(--color-leaf-700)]"
                    : salesDelta.positive === false
                      ? "text-[#B23A1F]"
                      : "text-[var(--color-earth-500)]"
                }
              >
                {salesDelta.text}
              </span>
            </p>
          </div>
          <SalesSparkline buckets={dayBuckets} maxValue={maxDay} />
          <p className="text-[10px] text-[var(--color-earth-500)] mt-2 m-0">
            Pedidos pagados por día. Hoy a la derecha.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
          <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0 mb-2.5">
            Requieren atención
          </p>
          <AttentionRow
            title="Pedidos por despachar"
            description="Pagados, sin enviar"
            count={pendingOrdersCount ?? 0}
            href="/admin/pedidos?status=processing"
          />
          <AttentionRow
            title="Productos sin aprobar"
            description="De scraping reciente"
            count={productsDraft ?? 0}
            href="/admin/productos?status=draft"
          />
          <AttentionRow
            title="Stock bajo"
            description={`Menos de ${LOW_STOCK_THRESHOLD} unidades`}
            count={lowStock?.length ?? 0}
            href="/admin/productos"
          />
          <AttentionRow
            title="Carritos abandonados"
            description="Últimos 7 días"
            count={abandonedCarts}
            href="/admin/sembrado"
          />
          <AttentionRow
            title="Emails fallidos"
            description="En cola de Savia"
            count={failedJobsCount ?? 0}
            href="/admin/savia/jobs?status=failed"
          />
        </div>
      </section>

      {/* Top productos + Top UTM + Stock bajo detalle */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4">
        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
              Productos más vistos
            </p>
            <Link
              href="/admin/sembrado"
              className="text-[10px] text-[var(--color-iris-700)] hover:underline"
            >
              Ver más
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <EmptyHint text="Sin datos del tracker aún. Aparecerán cuando entren las primeras visitas con consent." />
          ) : (
            <ul className="space-y-1.5 m-0 p-0 list-none">
              {topProducts.map((p) => (
                <li
                  key={p.slug}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <Link
                    href={`/producto/${p.slug}`}
                    target="_blank"
                    className="truncate text-[var(--color-earth-900)] hover:text-[var(--color-iris-700)]"
                  >
                    {p.name}
                  </Link>
                  <span className="tabular-nums text-[var(--color-earth-700)] flex-shrink-0">
                    {p.count.toLocaleString("es-CO")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
              Top fuentes (UTM)
            </p>
            <Link
              href="/admin/sembrado"
              className="text-[10px] text-[var(--color-iris-700)] hover:underline"
            >
              Ver más
            </Link>
          </div>
          {topUtm.length === 0 ? (
            <EmptyHint text="Aún no hay campañas activas. Añade ?utm_source= a tus enlaces para verlas aquí." />
          ) : (
            <ul className="space-y-1.5 m-0 p-0 list-none">
              {topUtm.map(([source, count]) => (
                <li
                  key={source}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate text-[var(--color-earth-900)]">
                    {source}
                  </span>
                  <span className="tabular-nums text-[var(--color-earth-700)] flex-shrink-0">
                    {count.toLocaleString("es-CO")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
              Stock crítico
            </p>
            <Link
              href="/admin/productos"
              className="text-[10px] text-[var(--color-iris-700)] hover:underline"
            >
              Catálogo
            </Link>
          </div>
          {!lowStock || lowStock.length === 0 ? (
            <EmptyHint text={`Ningún producto activo con menos de ${LOW_STOCK_THRESHOLD} unidades.`} />
          ) : (
            <ul className="space-y-1.5 m-0 p-0 list-none">
              {lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <Link
                    href={`/admin/productos/${p.id}`}
                    className="truncate text-[var(--color-earth-900)] hover:text-[var(--color-iris-700)]"
                  >
                    {p.name}
                  </Link>
                  <span
                    className={`tabular-nums flex-shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${
                      p.stock === 0
                        ? "bg-[#FCE9E5] text-[#B23A1F]"
                        : "bg-[#FAEEDA] text-[#854F0B]"
                    }`}
                  >
                    {p.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Actividad reciente del equipo */}
      {isAdmin && (
        <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
              Actividad reciente del equipo
            </p>
            <Link
              href="/admin/auditoria"
              className="text-[10px] text-[var(--color-iris-700)] hover:underline"
            >
              Ver auditoría
            </Link>
          </div>
          {!recentAudit || recentAudit.length === 0 ? (
            <EmptyHint text="Aún no hay eventos registrados." />
          ) : (
            <ul className="space-y-1.5 m-0 p-0 list-none">
              {recentAudit.map((r) => (
                <li key={r.id} className="text-xs flex items-center justify-between gap-3">
                  <span className="truncate text-[var(--color-earth-900)]">
                    <span className="font-medium">{r.actor_email ?? "sistema"}</span>
                    {" · "}
                    {r.summary}
                  </span>
                  <span className="text-[var(--color-earth-500)] text-[10px] flex-shrink-0 tabular-nums">
                    {new Date(r.created_at).toLocaleString("es-CO", {
                      hour12: false,
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="text-[10px] text-[var(--color-earth-500)] mt-4">
        Catálogo: {productsActive ?? 0} activos · {productsDraft ?? 0} en borrador ·{" "}
        {(pageViews7d ?? 0).toLocaleString("es-CO")} page views en 7 días.
      </p>
    </>
  );
}

function KpiCard({
  label,
  value,
  delta,
  deltaPositive,
}: {
  label: string;
  value: string;
  delta: string;
  deltaPositive?: boolean | null;
}) {
  return (
    <div className="bg-white p-3 rounded-[10px] border border-[rgba(47,98,56,0.1)]">
      <p className="text-[11px] text-[var(--color-earth-700)] m-0 mb-1">{label}</p>
      <p className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0 leading-none">
        {value}
      </p>
      <p
        className={`text-[10px] mt-1 m-0 ${
          deltaPositive === true
            ? "text-[var(--color-leaf-700)]"
            : deltaPositive === false
              ? "text-[#B23A1F]"
              : "text-[var(--color-earth-500)]"
        }`}
      >
        {delta}
      </p>
    </div>
  );
}

function AttentionRow({
  title,
  description,
  count,
  href,
}: {
  title: string;
  description: string;
  count: number;
  href?: string;
}) {
  const isHot = count > 0;
  const inner = (
    <div className="flex justify-between items-center py-2 border-b border-[#F0E9DB] last:border-b-0">
      <div>
        <p className="text-[13px] text-[var(--color-leaf-900)] m-0">{title}</p>
        <p className="text-[11px] text-[var(--color-earth-700)] m-0">
          {description}
        </p>
      </div>
      <span
        className={`text-[11px] px-2 py-0.5 rounded-lg font-medium tabular-nums ${
          isHot
            ? "bg-[#FAEEDA] text-[#854F0B]"
            : "bg-[#F0E9DB] text-[var(--color-earth-700)]"
        }`}
      >
        {count}
      </span>
    </div>
  );
  if (!href) return inner;
  return (
    <Link
      href={href}
      className="block hover:bg-[var(--color-earth-50)]/50 -mx-2 px-2 rounded-md"
    >
      {inner}
    </Link>
  );
}

function SalesSparkline({
  buckets,
  maxValue,
}: {
  buckets: number[];
  maxValue: number;
}) {
  return (
    <div className="flex items-end gap-1.5 h-24">
      {buckets.map((value, i) => {
        const heightPct = (value / maxValue) * 100;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col justify-end items-center gap-1"
            title={formatCOP(value)}
          >
            <div className="w-full bg-[var(--color-earth-100)] rounded-t-md overflow-hidden h-full flex flex-col justify-end">
              <div
                className="bg-[var(--color-leaf-700)] transition-all"
                style={{ height: `${Math.max(2, heightPct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="text-[11px] text-[var(--color-earth-500)] m-0 leading-relaxed">
      {text}
    </p>
  );
}
