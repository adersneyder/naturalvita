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

  const [
    { count: productsDraft },
    { count: productsActive },
    { count: laboratories },
    { count: dataSources },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("laboratories").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("data_sources").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const salesToday = 0;
  const ordersToday = 0;
  const visitorsToday = 0;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <KpiCard label="Ventas hoy" value={formatCOP(salesToday)} delta="Sin pedidos aún" />
        <KpiCard label="Pedidos hoy" value={String(ordersToday)} delta="Esperando primer pedido" />
        <KpiCard label="Visitantes hoy" value={String(visitorsToday)} delta="Conecta analytics" />
        <KpiCard label="Productos activos" value={String(productsActive ?? 0)} delta={`${productsDraft ?? 0} borrador`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-3.5">
        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
          <div className="flex justify-between items-center mb-2.5">
            <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">Primeros pasos</p>
            <span className="text-[11px] text-[var(--color-leaf-700)]">Fase 1 · MVP</span>
          </div>
          <SetupStep
            done={false}
            title="Agregar fuentes de datos"
            description={`${dataSources ?? 0} laboratorios configurados — sincroniza productos`}
            href="/admin/fuentes"
          />
          <SetupStep
            done={false}
            title="Sincronizar productos"
            description="Trae el catálogo de los laboratorios WooCommerce"
            href="/admin/fuentes"
          />
          <SetupStep
            done={false}
            title="Revisar y publicar productos"
            description="Ajusta precios, asigna categorías, publica al catálogo"
            href="/admin/productos"
          />
          <SetupStep
            done={false}
            title="Configurar pasarela Bold"
            description="Agrega tus credenciales para recibir pagos"
            href="/admin/configuracion"
          />
        </div>

        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
          <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0 mb-2.5">
            Requieren atención
          </p>
          <AttentionRow title="Productos sin aprobar" description="De scraping reciente" count={productsDraft ?? 0} />
          <AttentionRow title="Stock bajo" description="Menos de 5 unidades" count={0} />
          <AttentionRow title="Carritos abandonados" description="Últimas 24h" count={0} />
          <AttentionRow title="Mensajes del chatbot" description="Sin resolver" count={0} />
        </div>
      </div>

      <div className="mt-5 bg-[var(--color-leaf-100)] rounded-xl p-4 text-xs text-[var(--color-leaf-900)]">
        <p className="font-medium m-0 mb-1">Información · Fase 1 en construcción</p>
        <p className="m-0 text-[var(--color-earth-700)]">
          Las secciones de productos, fuentes de datos, inventario y pedidos se están construyendo
          incrementalmente. Las que aún no tienen datos muestran cero.
        </p>
      </div>
    </>
  );
}

function KpiCard({ label, value, delta }: { label: string; value: string; delta: string }) {
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
    <Link href={href} className="block py-2 border-b border-[#F0E9DB] last:border-b-0 hover:bg-[var(--color-earth-50)] -mx-2 px-2 rounded-md transition-colors">
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
