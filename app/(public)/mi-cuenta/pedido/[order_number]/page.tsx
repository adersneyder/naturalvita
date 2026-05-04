import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Breadcrumbs from "../../../_components/Breadcrumbs";
import { requireCustomer } from "@/lib/auth/customer-auth";
import {
  getCustomerOrderDetail,
  buildOrderTimeline,
} from "@/lib/checkout/customer-orders";
import { formatCop } from "@/lib/format/currency";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { TrackingChip } from "@/components/orders/TrackingChip";

export const metadata: Metadata = {
  title: "Detalle del pedido",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Params = Promise<{ order_number: string }>;

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Params;
}) {
  const { order_number } = await params;
  const customer = await requireCustomer({
    redirectTo: `/mi-cuenta/pedido/${order_number}`,
  });

  const order = await getCustomerOrderDetail(customer.id, order_number);
  if (!order) redirect("/mi-cuenta?tab=pedidos");

  const timeline = buildOrderTimeline(order);
  const isCancelled = order.status === "cancelled";
  const isRefunded = order.status === "refunded";
  const isShippedOrLater =
    order.status === "shipped" || order.status === "delivered";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      <Breadcrumbs
        items={[
          { label: "Mi cuenta", href: "/mi-cuenta" },
          { label: "Pedidos", href: "/mi-cuenta?tab=pedidos" },
          { label: order.order_number },
        ]}
      />

      <header className="mt-4 mb-6">
        <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-earth-700)]">
          Pedido
        </p>
        <h1 className="font-serif text-2xl md:text-3xl text-[var(--color-leaf-900)] tracking-tight mt-1 tabular-nums">
          {order.order_number}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <StatusBadge kind="payment" value={order.payment_status} />
          <StatusBadge kind="status" value={order.status} />
        </div>
      </header>

      {(isCancelled || isRefunded) && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-[var(--color-earth-50)] border border-[var(--color-earth-100)] text-sm text-[var(--color-earth-700)]">
          {isCancelled
            ? "Este pedido fue cancelado. Si pagaste, el reembolso se procesa por la pasarela."
            : "Este pedido fue reembolsado. El abono llegará a tu medio de pago original en 3 a 10 días hábiles."}
        </div>
      )}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Columna izquierda: timeline + items */}
        <div className="space-y-6">
          {/* Timeline */}
          <article className="rounded-2xl bg-white border border-[var(--color-earth-100)] p-6">
            <h2 className="font-serif text-lg text-[var(--color-leaf-900)] mb-4">
              Estado del pedido
            </h2>
            <OrderTimeline stages={timeline} />
            {isShippedOrLater && (
              <div className="mt-5 pt-5 border-t border-[var(--color-earth-100)]">
                <TrackingChip
                  trackingNumber={order.tracking_number}
                  shippingCarrier={order.shipping_carrier}
                  variant="card"
                />
              </div>
            )}
          </article>

          {/* Items */}
          <article className="rounded-2xl bg-white border border-[var(--color-earth-100)] p-6">
            <h2 className="font-serif text-lg text-[var(--color-leaf-900)] mb-4">
              Productos del pedido
            </h2>
            <ul className="divide-y divide-[var(--color-earth-100)]">
              {order.items.map((item, idx) => (
                <li key={idx} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                  {item.product_image_url ? (
                    <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-[var(--color-earth-50)] overflow-hidden relative">
                      <Image
                        src={item.product_image_url}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                        sizes="56px"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-[var(--color-earth-100)]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-leaf-900)] font-medium leading-tight">
                      {item.product_name}
                    </p>
                    {item.product_sku && (
                      <p className="text-[11px] text-[var(--color-earth-500)] font-mono mt-0.5">
                        {item.product_sku}
                      </p>
                    )}
                    <p className="text-xs text-[var(--color-earth-700)] mt-1 tabular-nums">
                      {item.quantity} × {formatCop(item.unit_price_cop)}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-[var(--color-leaf-900)] tabular-nums">
                    {formatCop(item.subtotal_cop)}
                  </p>
                </li>
              ))}
            </ul>
          </article>
        </div>

        {/* Columna derecha: dirección + totales */}
        <aside className="space-y-6">
          <article className="rounded-2xl bg-white border border-[var(--color-earth-100)] p-6">
            <h2 className="font-serif text-lg text-[var(--color-leaf-900)] mb-3">
              Resumen
            </h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[var(--color-earth-700)]">
                <dt>Subtotal</dt>
                <dd className="text-[var(--color-leaf-900)] tabular-nums">
                  {formatCop(order.subtotal_cop)}
                </dd>
              </div>
              <div className="flex justify-between text-[var(--color-earth-700)]">
                <dt>IVA</dt>
                <dd className="text-[var(--color-leaf-900)] tabular-nums">
                  {formatCop(order.tax_cop)}
                </dd>
              </div>
              <div className="flex justify-between text-[var(--color-earth-700)]">
                <dt>Envío</dt>
                <dd className="text-[var(--color-leaf-900)] tabular-nums">
                  {order.shipping_cop === 0
                    ? "Gratis"
                    : formatCop(order.shipping_cop)}
                </dd>
              </div>
              {order.discount_cop > 0 && (
                <div className="flex justify-between text-[var(--color-leaf-700)]">
                  <dt>Descuento</dt>
                  <dd className="tabular-nums">
                    −{formatCop(order.discount_cop)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-[var(--color-earth-100)] mt-2">
                <dt className="text-sm text-[var(--color-earth-700)]">Total</dt>
                <dd className="font-serif text-xl text-[var(--color-leaf-900)] tabular-nums">
                  {formatCop(order.total_cop)}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-2xl bg-white border border-[var(--color-earth-100)] p-6">
            <h2 className="font-serif text-lg text-[var(--color-leaf-900)] mb-3">
              Envío a
            </h2>
            <p className="text-sm text-[var(--color-leaf-900)] font-medium">
              {order.shipping_recipient}
            </p>
            <p className="text-sm text-[var(--color-earth-700)] mt-1 leading-relaxed">
              {order.shipping_street}
              {order.shipping_details ? `, ${order.shipping_details}` : ""}
              <br />
              {order.shipping_city}, {order.shipping_department}
              {order.shipping_postal_code ? ` · ${order.shipping_postal_code}` : ""}
              <br />
              Tel. {order.shipping_phone}
            </p>
          </article>

          <Link
            href="/tienda"
            className="block w-full text-center px-5 py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)]"
          >
            Seguir comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}
