import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "../../../_components/Breadcrumbs";
import { requireCustomer } from "@/lib/auth/customer-auth";
import { createClient } from "@/lib/supabase/server";
import OrderStatusPoller from "./_OrderStatusPoller";
import { formatCop } from "@/lib/format/currency";

export const metadata: Metadata = {
  title: "Pedido confirmado",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Params = Promise<{ order_number: string }>;

export default async function OrderSuccessPage({ params }: { params: Params }) {
  const { order_number } = await params;
  const customer = await requireCustomer({
    redirectTo: `/pedido/${order_number}/exito`,
  });

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "order_number, customer_email, customer_name, total_cop, subtotal_cop, shipping_cop, tax_cop, status, payment_status, paid_at, shipping_recipient, shipping_street, shipping_details, shipping_city, shipping_department",
    )
    .eq("order_number", order_number)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (!order) {
    // No es del cliente o no existe → mandamos a /mi-cuenta
    redirect("/mi-cuenta");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <Breadcrumbs
        items={[
          { label: "Mi cuenta", href: "/mi-cuenta" },
          { label: `Pedido ${order.order_number}` },
        ]}
      />

      {/* Estado en vivo: polling cada 3s hasta 30s, después congela */}
      <OrderStatusPoller
        orderNumber={order.order_number}
        initialPaymentStatus={order.payment_status}
      />

      <article className="mt-6 rounded-2xl bg-white border border-[var(--color-earth-100)] p-6 sm:p-8">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-earth-700)]">
            Número de pedido
          </p>
          <h1 className="font-serif text-2xl md:text-3xl text-[var(--color-leaf-900)] tracking-tight mt-1">
            {order.order_number}
          </h1>
        </header>

        <section className="grid sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-earth-700)] mb-2">
              Envío a
            </p>
            <p className="text-sm text-[var(--color-leaf-900)]">
              {order.shipping_recipient}
            </p>
            <p className="text-sm text-[var(--color-earth-700)]">
              {order.shipping_street}
              {order.shipping_details ? `, ${order.shipping_details}` : ""}
            </p>
            <p className="text-sm text-[var(--color-earth-700)]">
              {order.shipping_city}, {order.shipping_department}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-earth-700)] mb-2">
              Confirmación
            </p>
            <p className="text-sm text-[var(--color-earth-700)]">
              Te enviamos los detalles a
            </p>
            <p className="text-sm text-[var(--color-leaf-900)]">
              {order.customer_email}
            </p>
          </div>
        </section>

        <section className="border-t border-[var(--color-earth-100)] pt-5">
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
            <div className="flex justify-between pt-3 border-t border-[var(--color-earth-100)] mt-3">
              <dt className="text-sm text-[var(--color-earth-700)]">Total</dt>
              <dd className="font-serif text-2xl text-[var(--color-leaf-900)] tabular-nums">
                {formatCop(order.total_cop)}
              </dd>
            </div>
          </dl>
        </section>
      </article>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/mi-cuenta"
          className="px-5 py-2.5 rounded-lg border border-[var(--color-earth-100)] text-sm font-medium text-[var(--color-leaf-900)] text-center hover:bg-[var(--color-earth-50)]"
        >
          Ver mis pedidos
        </Link>
        <Link
          href="/tienda"
          className="px-5 py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium text-center hover:bg-[var(--color-iris-600)]"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
