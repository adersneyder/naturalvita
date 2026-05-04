import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { getAdminOrderDetail } from "@/lib/admin/admin-orders";
import { buildOrderTimeline } from "@/lib/checkout/customer-orders";
import { formatCop } from "@/lib/format/currency";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import OrderActions from "./_OrderActions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Params;
}) {
  await getAdminUser();
  const { id } = await params;

  const order = await getAdminOrderDetail(id);
  if (!order) notFound();

  const timeline = buildOrderTimeline(order);

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/admin/pedidos"
          className="text-xs text-[var(--color-earth-700)] hover:text-[var(--color-leaf-700)] hover:underline"
        >
          ← Pedidos
        </Link>
      </div>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium">
            Pedido
          </p>
          <h1 className="font-serif text-2xl text-[var(--color-leaf-900)] tracking-tight tabular-nums mt-0.5">
            {order.order_number}
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            Creado el {formatDateLong(order.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge kind="payment" value={order.payment_status} />
          <StatusBadge kind="status" value={order.status} />
          <StatusBadge kind="fulfillment" value={order.fulfillment_status} />
        </div>
      </header>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
        {/* Columna principal */}
        <div className="space-y-4">
          {/* Cliente */}
          <article className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
            <h2 className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium mb-2">
              Cliente
            </h2>
            <p className="text-sm text-[var(--color-leaf-900)] font-medium">
              {order.customer_name}
            </p>
            <p className="text-sm text-[var(--color-earth-700)]">
              {order.customer_email}
            </p>
            {order.customer_phone && (
              <p className="text-sm text-[var(--color-earth-700)]">
                Tel. {order.customer_phone}
              </p>
            )}
            {order.customer_id && (
              <Link
                href={`/admin/clientes/${order.customer_id}`}
                className="inline-block mt-2 text-xs text-[var(--color-iris-700)] hover:underline"
              >
                Ver perfil del cliente
              </Link>
            )}
          </article>

          {/* Items */}
          <article className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
            <h2 className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium mb-3">
              Productos del pedido
            </h2>
            <ul className="divide-y divide-[var(--color-earth-100)]">
              {order.items.map((item, idx) => (
                <li
                  key={idx}
                  className="py-3 flex items-start gap-3 first:pt-0 last:pb-0"
                >
                  {item.product_image_url ? (
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-[var(--color-earth-50)] overflow-hidden relative">
                      <Image
                        src={item.product_image_url}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-[var(--color-earth-100)]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-leaf-900)] leading-tight">
                      {item.product_name}
                    </p>
                    {item.product_sku && (
                      <p className="text-[11px] text-[var(--color-earth-500)] font-mono mt-0.5">
                        {item.product_sku}
                      </p>
                    )}
                    <Link
                      href={`/admin/productos/${item.product_id}`}
                      className="text-[11px] text-[var(--color-iris-700)] hover:underline mt-0.5 inline-block"
                    >
                      Ver producto
                    </Link>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--color-earth-700)] tabular-nums">
                      {item.quantity} × {formatCop(item.unit_price_cop)}
                    </p>
                    <p className="text-sm font-medium text-[var(--color-leaf-900)] tabular-nums mt-0.5">
                      {formatCop(item.subtotal_cop)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          {/* Totales */}
          <article className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
            <h2 className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium mb-3">
              Totales
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
                <dt>Envío ({order.shipping_department})</dt>
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
              <div className="flex justify-between pt-2 border-t border-[var(--color-earth-100)] mt-2">
                <dt className="text-sm font-medium">Total</dt>
                <dd className="font-serif text-xl text-[var(--color-leaf-900)] tabular-nums">
                  {formatCop(order.total_cop)}
                </dd>
              </div>
            </dl>
          </article>

          {/* Bold tracking */}
          {order.bold_payment_id && (
            <article className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
              <h2 className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium mb-2">
                Pago Bold
              </h2>
              <p className="text-xs text-[var(--color-earth-700)]">
                ID transacción
              </p>
              <p className="text-sm text-[var(--color-leaf-900)] font-mono break-all">
                {order.bold_payment_id}
              </p>
              {order.paid_at && (
                <p className="text-xs text-[var(--color-earth-700)] mt-1.5">
                  Pagado el {formatDateLong(order.paid_at)}
                </p>
              )}
            </article>
          )}
        </div>

        {/* Columna derecha: timeline + acciones + envío */}
        <aside className="space-y-4">
          {/* Acciones */}
          <article className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
            <h2 className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium mb-3">
              Acciones
            </h2>
            <OrderActions
              orderId={order.id}
              orderNumber={order.order_number}
              status={order.status}
              paymentStatus={order.payment_status}
              trackingNumber={order.tracking_number}
              notes={order.notes}
            />
          </article>

          {/* Timeline */}
          <article className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
            <h2 className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium mb-3">
              Cronología
            </h2>
            <OrderTimeline stages={timeline} />
            {order.tracking_number && (
              <div className="mt-4 pt-4 border-t border-[var(--color-earth-100)]">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium">
                  Guía
                </p>
                <p className="text-sm text-[var(--color-leaf-900)] font-mono mt-1">
                  {order.tracking_number}
                </p>
              </div>
            )}
          </article>

          {/* Envío */}
          <article className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
            <h2 className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium mb-2">
              Dirección de envío
            </h2>
            <p className="text-sm text-[var(--color-leaf-900)] font-medium">
              {order.shipping_recipient}
            </p>
            <p className="text-sm text-[var(--color-earth-700)] mt-0.5 leading-relaxed">
              {order.shipping_street}
              {order.shipping_details ? `, ${order.shipping_details}` : ""}
              <br />
              {order.shipping_city}, {order.shipping_department}
              {order.shipping_postal_code
                ? ` · ${order.shipping_postal_code}`
                : ""}
              <br />
              Tel. {order.shipping_phone}
            </p>
          </article>
        </aside>
      </div>
    </>
  );
}

function formatDateLong(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
