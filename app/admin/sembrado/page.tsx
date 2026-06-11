import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;

const DEFAULT_DAYS = 30;

/**
 * Dashboard del tracker "Sembrado" — MVP.
 *
 * Mostramos lo accionable desde día 1:
 *   - Visitas únicas (visitor_id distintos)
 *   - Sesiones (session_id distintos)
 *   - Page views
 *   - Embudo: product_view → add_to_cart → checkout_start → purchase
 *   - Top páginas por page_view
 *   - Top fuentes UTM
 *
 * Calcula todo con SQL agregado (RPCs no necesarios — los queries son
 * simples y la tabla tiene los índices).
 */
export default async function SembradoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["owner", "admin"]);
  const params = await searchParams;
  const days = Math.max(1, Math.min(365, parseInt(params.days ?? "", 10) || DEFAULT_DAYS));

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const admin = createAdminClient();

  // Métricas globales: para counts usamos head=true (rápido); para uniques
  // cargamos los IDs y deduplicamos en memoria. MVP — cuando crezcamos a
  // millones de eventos hay que mover a una RPC con count(distinct ...).
  const [
    { data: uniqueVisitors },
    { data: uniqueSessions },
    { count: pageViews },
    { count: productViews },
    { count: addsToCart },
    { count: checkoutStarts },
    { count: purchases },
    { data: topPagesRaw },
    { data: topUtmRaw },
  ] = await Promise.all([
    admin
      .from("tracking_events")
      .select("visitor_id")
      .gte("created_at", sinceIso)
      .limit(20000),
    admin
      .from("tracking_events")
      .select("session_id")
      .gte("created_at", sinceIso)
      .limit(20000),
    admin
      .from("tracking_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceIso)
      .eq("event_type", "page_view"),
    admin
      .from("tracking_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceIso)
      .eq("event_type", "product_view"),
    admin
      .from("tracking_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceIso)
      .eq("event_type", "add_to_cart"),
    admin
      .from("tracking_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceIso)
      .eq("event_type", "checkout_start"),
    admin
      .from("tracking_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceIso)
      .eq("event_type", "purchase"),
    admin
      .from("tracking_events")
      .select("page_path")
      .gte("created_at", sinceIso)
      .eq("event_type", "page_view")
      .limit(20000),
    admin
      .from("tracking_events")
      .select("utm_source, utm_campaign")
      .gte("created_at", sinceIso)
      .not("utm_source", "is", null)
      .limit(20000),
  ]);

  const visitors = new Set(
    ((uniqueVisitors ?? []) as Array<{ visitor_id: string }>).map(
      (r) => r.visitor_id,
    ),
  ).size;
  const sessions = new Set(
    ((uniqueSessions ?? []) as Array<{ session_id: string }>).map(
      (r) => r.session_id,
    ),
  ).size;

  // Conteo en memoria para topN. Mismo razonamiento: MVP.
  const pageCounts = new Map<string, number>();
  for (const r of (topPagesRaw ?? []) as Array<{ page_path: string }>) {
    pageCounts.set(r.page_path, (pageCounts.get(r.page_path) ?? 0) + 1);
  }
  const topPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const utmCounts = new Map<string, number>();
  for (const r of (topUtmRaw ?? []) as Array<{
    utm_source: string | null;
    utm_campaign: string | null;
  }>) {
    const key = `${r.utm_source ?? "—"} / ${r.utm_campaign ?? "—"}`;
    utmCounts.set(key, (utmCounts.get(key) ?? 0) + 1);
  }
  const topUtm = Array.from(utmCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const conversion = productViews && productViews > 0
    ? ((purchases ?? 0) / productViews) * 100
    : 0;

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Sembrado
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            Tracker propio · últimos {days} días
          </p>
        </div>
        <form action="/admin/sembrado" method="get" className="flex items-center gap-2">
          <select
            name="days"
            defaultValue={String(days)}
            className="px-2 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs bg-white focus:outline-none focus:border-[var(--color-iris-700)]"
          >
            <option value="7">7 días</option>
            <option value="30">30 días</option>
            <option value="90">90 días</option>
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)]"
          >
            Aplicar
          </button>
        </form>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Visitantes únicos" value={visitors} />
        <Stat label="Sesiones" value={sessions} />
        <Stat label="Page views" value={pageViews ?? 0} />
        <Stat
          label="Conversión vista→compra"
          value={`${conversion.toFixed(2)}%`}
        />
      </section>

      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 mb-6">
        <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0 mb-3">
          Embudo
        </h2>
        <FunnelRow label="Vio producto" value={productViews ?? 0} base={productViews ?? 0} />
        <FunnelRow label="Agregó al carrito" value={addsToCart ?? 0} base={productViews ?? 0} />
        <FunnelRow label="Inició checkout" value={checkoutStarts ?? 0} base={productViews ?? 0} />
        <FunnelRow label="Compró" value={purchases ?? 0} base={productViews ?? 0} />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5">
          <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0 mb-3">
            Páginas más vistas
          </h2>
          {topPages.length === 0 ? (
            <p className="text-xs text-[var(--color-earth-500)]">Sin datos aún.</p>
          ) : (
            <ul className="space-y-1">
              {topPages.map(([path, count]) => (
                <li
                  key={path}
                  className="flex items-center justify-between text-xs gap-3"
                >
                  <span className="font-mono truncate text-[var(--color-earth-900)]">
                    {path}
                  </span>
                  <span className="tabular-nums text-[var(--color-earth-700)] flex-shrink-0">
                    {count.toLocaleString("es-CO")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5">
          <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0 mb-3">
            Fuentes (utm_source / utm_campaign)
          </h2>
          {topUtm.length === 0 ? (
            <p className="text-xs text-[var(--color-earth-500)]">
              Sin campañas aún. Añade <code>?utm_source=…</code> a tus enlaces.
            </p>
          ) : (
            <ul className="space-y-1">
              {topUtm.map(([key, count]) => (
                <li
                  key={key}
                  className="flex items-center justify-between text-xs gap-3"
                >
                  <span className="truncate text-[var(--color-earth-900)]">
                    {key}
                  </span>
                  <span className="tabular-nums text-[var(--color-earth-700)] flex-shrink-0">
                    {count.toLocaleString("es-CO")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-[11px] text-[var(--color-earth-500)] mt-4">
        Los identificadores anónimos no se vinculan a clientes. Los datos
        identificados solo aparecen cuando el visitante aceptó la analítica
        en el banner — su política está en{" "}
        <Link
          href="/legal/privacidad"
          className="text-[var(--color-iris-700)] hover:underline"
        >
          la política de privacidad
        </Link>
        .
      </p>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-earth-500)] m-0">
        {label}
      </p>
      <p className="text-xl font-medium text-[var(--color-leaf-900)] m-0 mt-1 tabular-nums">
        {typeof value === "number" ? value.toLocaleString("es-CO") : value}
      </p>
    </div>
  );
}

function FunnelRow({
  label,
  value,
  base,
}: {
  label: string;
  value: number;
  base: number;
}) {
  const pct = base > 0 ? (value / base) * 100 : 0;
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[var(--color-earth-900)]">{label}</span>
        <span className="tabular-nums text-[var(--color-earth-700)]">
          {value.toLocaleString("es-CO")} ·{" "}
          <span className="text-[var(--color-earth-500)]">{pct.toFixed(1)}%</span>
        </span>
      </div>
      <div className="h-2 bg-[var(--color-earth-100)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-leaf-700)] transition-all"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
