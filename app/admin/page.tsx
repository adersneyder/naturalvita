import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Calcular inicio del día en hora Colombia para los KPIs "hoy"
  const colombiaTodayStart = new Date();
  // Bogotá es UTC-5: ajustamos a medianoche local en términos UTC
  colombiaTodayStart.setUTCHours(5, 0, 0, 0);
  if (colombiaTodayStart > new Date()) {
    colombiaTodayStart.setUTCDate(colombiaTodayStart.getUTCDate() - 1);
  }
  const todayIso = colombiaTodayStart.toISOString();

  const [
    { count: productsDraft },
    { count: productsActive },
    { count: categoriesCount },
    { count: taxRatesCount },
    { count: laboratoriesCount },
    { count: dataSourcesCount },
    { count: ordersToday },
    { data: ordersTodayPaid },
    { count: pendingOrdersCount },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("categories").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("tax_rates").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("laboratories").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("data_sources").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayIso),
    supabase
      .from("orders")
      .select("total_cop")
      .eq("payment_status", "paid")
      .gte("created_at", todayIso),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .in("status", ["paid", "processing"]),
  ]);

  const salesToday = (ordersTodayPaid ?? []).reduce(
    (acc, o: { total_cop: number }) => acc + o.total_cop,
    0,
  );

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
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
              : `${pendingOrdersCount ?? 0} requieren acción`
          }
        />
        <KpiCard label="Visitantes hoy" value="0" delta="Tracking pendiente" />
        <KpiCard
          label="Productos activos"
          value={String(productsActive ?? 0)}
          delta={`${productsDraft ?? 0} en borrador`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-3.5">
        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
          <div className="flex justify-between items-center mb-2.5">
            <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
              Configuración inicial
            </p>
            <span className="text-[11px] text-[var(--color-leaf-700)]">Fase 1 · MVP</span>
          </div>
          <SetupStep
            done={(categoriesCount ?? 0) > 0}
            title={`${categoriesCount ?? 0} categorías configuradas`}
            description="Crea, edita y organiza las categorías del catálogo"
            href="/admin/categorias"
          />
          <SetupStep
            done={(taxRatesCount ?? 0) > 0}
            title={`${taxRatesCount ?? 0} tarifas de IVA configuradas`}
            description="Define qué productos pagan IVA y cuáles están excluidos"
            href="/admin/configuracion/impuestos"
          />
          <SetupStep
            done={(productsDraft ?? 0) + (productsActive ?? 0) > 0}
            title="Sincronizar productos de laboratorios"
            description={`${laboratoriesCount ?? 0} laboratorios · ${dataSourcesCount ?? 0} fuentes configuradas`}
            href="/admin/fuentes"
          />
          <SetupStep
            done={false}
            title="Revisar y publicar productos"
            description="Ajusta precios, asigna IVA, publica al catálogo"
            href="/admin/productos"
          />
          <SetupStep
            done={false}
            title="Configurar pasarela de pago"
            description="Credenciales de Bold para recibir pagos"
            href="/admin/configuracion"
          />
        </div>

        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
          <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0 mb-2.5">
            Requieren atención
          </p>
          <AttentionRow
            title="Pedidos por despachar"
            description="Pagados, sin enviar"
            count={pendingOrdersCount ?? 0}
          />
          <AttentionRow
            title="Productos sin aprobar"
            description="De scraping reciente"
            count={productsDraft ?? 0}
          />
          <AttentionRow title="Stock bajo" description="Menos de 5 unidades" count={0} />
          <AttentionRow
            title="Carritos abandonados"
            description="Últimas 24h"
            count={0}
          />
        </div>
      </div>

      <div className="mt-5 bg-[var(--color-leaf-100)] rounded-xl p-4 text-xs text-[var(--color-leaf-900)]">
        <p className="font-medium m-0 mb-1">Estado actual del panel</p>
        <p className="m-0 text-[var(--color-earth-700)]">
          Hitos 1.1 y 1.2 completos · Categorías e impuestos funcionales · Los siguientes hitos
          agregarán: gestión de usuarios admin, fuentes de datos con scraping automático, bandeja
          de productos con editor completo, importador CSV, y catálogo público.
        </p>
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="bg-white p-3 rounded-[10px] border border-[rgba(47,98,56,0.1)]">
      <p className="text-[11px] text-[var(--color-earth-700)] m-0 mb-1">{label}</p>
      <p className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0 leading-none">
        {value}
      </p>
      <p className="text-[10px] text-[var(--color-earth-500)] mt-1 m-0">{delta}</p>
    </div>
  );
}

function SetupStep({
  done,
  title,
  description,
  href,
}: {
  done: boolean;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block py-2 border-b border-[#F0E9DB] last:border-b-0 hover:bg-[var(--color-earth-50)] -mx-2 px-2 rounded-md transition-colors"
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 border flex items-center justify-center text-[9px] ${
            done
              ? "bg-[var(--color-leaf-700)] border-[var(--color-leaf-700)] text-white"
              : "border-[var(--color-earth-500)] text-transparent"
          }`}
        >
          {done ? "✓" : ""}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[var(--color-leaf-900)] m-0 font-medium">{title}</p>
          <p className="text-[11px] text-[var(--color-earth-700)] m-0">{description}</p>
        </div>
        <span className="text-[var(--color-earth-500)]">→</span>
      </div>
    </Link>
  );
}

function AttentionRow({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count: number;
}) {
  const isHot = count > 0;
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#F0E9DB] last:border-b-0">
      <div>
        <p className="text-[13px] text-[var(--color-leaf-900)] m-0">{title}</p>
        <p className="text-[11px] text-[var(--color-earth-700)] m-0">{description}</p>
      </div>
      <span
        className={`text-[11px] px-2 py-0.5 rounded-lg font-medium ${
          isHot
            ? "bg-[#FAEEDA] text-[#854F0B]"
            : "bg-[#F0E9DB] text-[var(--color-earth-700)]"
        }`}
      >
        {count}
      </span>
    </div>
  );
}
