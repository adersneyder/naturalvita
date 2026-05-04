import Link from "next/link";
import { formatCop } from "@/lib/format/currency";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { TrackingChip } from "@/components/orders/TrackingChip";
import type { CustomerOrderRow } from "@/lib/checkout/customer-orders";

export default function OrdersListPanel({
  orders,
}: {
  orders: CustomerOrderRow[];
}) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-earth-100)] mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-7 h-7 text-[var(--color-earth-500)]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
            />
          </svg>
        </div>
        <h3 className="font-serif text-lg text-[var(--color-leaf-900)] mb-2">
          Aún no tienes pedidos
        </h3>
        <p className="text-sm text-[var(--color-earth-700)] mb-6 max-w-sm mx-auto">
          Cuando hagas tu primera compra aparecerá aquí, junto al estado de
          envío y los detalles.
        </p>
        <Link
          href="/tienda"
          className="inline-block px-5 py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)]"
        >
          Explorar el catálogo
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="hidden md:grid grid-cols-[1.4fr_1fr_1.2fr_1fr_auto] gap-4 px-4 py-2 text-[11px] uppercase tracking-wider text-[var(--color-earth-500)] font-medium border-b border-[var(--color-earth-100)] mb-1">
        <span>Pedido</span>
        <span>Fecha</span>
        <span>Estado</span>
        <span className="text-right">Total</span>
        <span aria-hidden />
      </div>
      <ul className="divide-y divide-[var(--color-earth-100)]">
        {orders.map((order) => {
          const isShippedOrLater =
            order.status === "shipped" || order.status === "delivered";
          return (
            <li key={order.order_number} className="px-4 py-4 hover:bg-[var(--color-earth-50)] transition-colors group">
              <Link
                href={`/mi-cuenta/pedido/${order.order_number}`}
                className="block md:grid md:grid-cols-[1.4fr_1fr_1.2fr_1fr_auto] md:gap-4 md:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-leaf-900)] tabular-nums">
                    {order.order_number}
                  </p>
                  <p className="text-xs text-[var(--color-earth-700)] mt-0.5">
                    {order.items_count} {order.items_count === 1 ? "producto" : "productos"}
                  </p>
                </div>
                <p className="text-xs text-[var(--color-earth-700)] tabular-nums mt-1 md:mt-0">
                  {formatDate(order.created_at)}
                </p>
                <div className="mt-2 md:mt-0">
                  <StatusBadge kind="payment" value={order.payment_status} />
                </div>
                <p className="text-sm font-medium text-[var(--color-leaf-900)] tabular-nums mt-2 md:mt-0 md:text-right">
                  {formatCop(order.total_cop)}
                </p>
                <span
                  aria-hidden
                  className="hidden md:inline text-[var(--color-earth-500)] group-hover:text-[var(--color-leaf-700)] transition-colors"
                >
                  ›
                </span>
              </Link>
              {isShippedOrLater && (
                <div className="mt-2 md:pl-0">
                  <TrackingChip
                    trackingNumber={order.tracking_number}
                    shippingCarrier={order.shipping_carrier}
                    variant="inline"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
