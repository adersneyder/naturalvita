import Link from "next/link";
import { formatCop } from "@/lib/format/currency";
import { StatusBadge } from "@/components/orders/StatusBadge";
import type { CustomerOrderRow } from "@/lib/checkout/customer-orders";

export default function SummaryPanel({
  customerName,
  recentOrders,
  totalOrdersCount,
  totalSpent,
  defaultAddress,
}: {
  customerName: string | null;
  recentOrders: CustomerOrderRow[];
  totalOrdersCount: number;
  totalSpent: number;
  defaultAddress: {
    label: string | null;
    recipient_name: string;
    street: string;
    details: string | null;
    city: string;
    department: string;
  } | null;
}) {
  const firstName = customerName?.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div>
        <h2 className="font-serif text-2xl text-[var(--color-leaf-900)] tracking-tight">
          {firstName ? `Hola, ${firstName}` : "Hola"}
        </h2>
        <p className="text-sm text-[var(--color-earth-700)] mt-1">
          Aquí tienes todo lo de tus compras y datos de envío en NaturalVita.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-[var(--color-leaf-100)]/40">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-leaf-700)] font-medium">
            Pedidos realizados
          </p>
          <p className="font-serif text-2xl text-[var(--color-leaf-900)] tabular-nums mt-1">
            {totalOrdersCount}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#F8F6FC]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-iris-700)] font-medium">
            Total invertido
          </p>
          <p className="font-serif text-2xl text-[var(--color-leaf-900)] tabular-nums mt-1">
            {formatCop(totalSpent)}
          </p>
        </div>
      </div>

      {/* Últimos pedidos */}
      {recentOrders.length > 0 && (
        <section>
          <header className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-base text-[var(--color-leaf-900)]">
              Tus últimos pedidos
            </h3>
            {totalOrdersCount > recentOrders.length && (
              <Link
                href="/mi-cuenta?tab=pedidos"
                className="text-xs text-[var(--color-iris-700)] hover:underline"
              >
                Ver todos
              </Link>
            )}
          </header>
          <ul className="space-y-2">
            {recentOrders.map((order) => (
              <li key={order.order_number}>
                <Link
                  href={`/mi-cuenta/pedido/${order.order_number}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-earth-100)] hover:border-[var(--color-iris-700)] hover:bg-[var(--color-earth-50)] transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-leaf-900)] tabular-nums">
                      {order.order_number}
                    </p>
                    <p className="text-[11px] text-[var(--color-earth-700)] mt-0.5">
                      {order.items_count} {order.items_count === 1 ? "producto" : "productos"} ·{" "}
                      <span className="tabular-nums">
                        {formatCop(order.total_cop)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge kind="payment" value={order.payment_status} />
                    <span
                      aria-hidden
                      className="text-[var(--color-earth-500)] group-hover:text-[var(--color-leaf-700)]"
                    >
                      ›
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Dirección predeterminada */}
      {defaultAddress && (
        <section>
          <header className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-base text-[var(--color-leaf-900)]">
              Dirección de envío predeterminada
            </h3>
            <Link
              href="/mi-cuenta?tab=direcciones"
              className="text-xs text-[var(--color-iris-700)] hover:underline"
            >
              Gestionar
            </Link>
          </header>
          <div className="p-4 rounded-xl bg-white border border-[var(--color-earth-100)]">
            <p className="text-sm font-medium text-[var(--color-leaf-900)]">
              {defaultAddress.label ?? defaultAddress.recipient_name}
            </p>
            <p className="text-sm text-[var(--color-earth-700)] mt-1 leading-relaxed">
              {defaultAddress.street}
              {defaultAddress.details ? `, ${defaultAddress.details}` : ""}
              <br />
              {defaultAddress.city}, {defaultAddress.department}
            </p>
          </div>
        </section>
      )}

      {/* Empty state si no tiene pedidos */}
      {recentOrders.length === 0 && (
        <section className="text-center py-8 px-6 rounded-xl bg-[var(--color-earth-50)]">
          <p className="font-serif text-base text-[var(--color-leaf-900)] mb-1">
            Aún no tienes pedidos
          </p>
          <p className="text-sm text-[var(--color-earth-700)] mb-4">
            Empieza a explorar nuestros productos seleccionados.
          </p>
          <Link
            href="/tienda"
            className="inline-block px-5 py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)]"
          >
            Ir a la tienda
          </Link>
        </section>
      )}
    </div>
  );
}
