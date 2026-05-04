import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { listCustomerOrders } from "@/lib/checkout/customer-orders";
import { formatCop } from "@/lib/format/currency";
import { StatusBadge } from "@/components/orders/StatusBadge";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Params;
}) {
  await getAdminUser();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customer }, orders, { data: addresses }] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id, email, full_name, phone, document_type, document_number, accepts_marketing, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    listCustomerOrders(id),
    supabase
      .from("addresses")
      .select(
        "id, recipient_name, phone, department, city, street, details, postal_code, label, is_default",
      )
      .eq("customer_id", id)
      .order("is_default", { ascending: false }),
  ]);

  if (!customer) notFound();

  const totalSpent = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((acc, o) => acc + o.total_cop, 0);

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/admin/clientes"
          className="text-xs text-[var(--color-earth-700)] hover:text-[var(--color-leaf-700)] hover:underline"
        >
          ← Clientes
        </Link>
      </div>

      <header className="mb-5">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium">
          Cliente
        </p>
        <h1 className="font-serif text-2xl text-[var(--color-leaf-900)] tracking-tight mt-0.5">
          {customer.full_name ?? customer.email}
        </h1>
        <p className="text-xs text-[var(--color-earth-700)] mt-1">
          Registrado el{" "}
          {new Intl.DateTimeFormat("es-CO", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(customer.created_at))}
        </p>
      </header>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
        <div className="space-y-4">
          {/* Pedidos */}
          <article className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
            <h2 className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium mb-3">
              Pedidos ({orders.length})
            </h2>
            {orders.length === 0 ? (
              <p className="text-sm text-[var(--color-earth-700)] text-center py-4">
                Este cliente aún no ha realizado pedidos.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-earth-100)]">
                {orders.map((o) => (
                  <li key={o.order_number}>
                    <Link
                      href={`/admin/pedidos?q=${o.order_number}`}
                      className="block py-2 hover:bg-[var(--color-earth-50)] -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-leaf-900)] tabular-nums">
                            {o.order_number}
                          </p>
                          <p className="text-[11px] text-[var(--color-earth-700)]">
                            {new Intl.DateTimeFormat("es-CO", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }).format(new Date(o.created_at))}{" "}
                            · {o.items_count}{" "}
                            {o.items_count === 1 ? "producto" : "productos"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge kind="payment" value={o.payment_status} />
                          <p className="text-sm font-medium text-[var(--color-leaf-900)] tabular-nums">
                            {formatCop(o.total_cop)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* Direcciones */}
          {addresses && addresses.length > 0 && (
            <article className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
              <h2 className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium mb-3">
                Direcciones guardadas
              </h2>
              <ul className="space-y-2">
                {addresses.map((a) => (
                  <li
                    key={a.id}
                    className="p-3 rounded-lg bg-[var(--color-earth-50)] text-sm"
                  >
                    <p className="font-medium text-[var(--color-leaf-900)]">
                      {a.label ?? a.recipient_name}
                      {a.is_default && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--color-iris-700)] font-medium">
                          Predeterminada
                        </span>
                      )}
                    </p>
                    <p className="text-[var(--color-earth-700)] text-xs mt-1">
                      {a.street}
                      {a.details ? `, ${a.details}` : ""} · {a.city},{" "}
                      {a.department}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </div>

        {/* Sidebar info contacto */}
        <aside className="space-y-4">
          <article className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
            <h2 className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium mb-3">
              Resumen
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[11px] text-[var(--color-earth-700)]">
                  Total invertido
                </dt>
                <dd className="font-serif text-xl text-[var(--color-leaf-900)] tabular-nums mt-0.5">
                  {formatCop(totalSpent)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--color-earth-700)]">
                  Pedidos completados
                </dt>
                <dd className="text-[var(--color-leaf-900)] tabular-nums">
                  {orders.filter((o) => o.payment_status === "paid").length}
                </dd>
              </div>
            </dl>
          </article>

          <article className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
            <h2 className="text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium mb-3">
              Contacto
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[11px] text-[var(--color-earth-700)]">
                  Email
                </dt>
                <dd className="text-[var(--color-leaf-900)] break-all">
                  {customer.email}
                </dd>
              </div>
              {customer.phone && (
                <div>
                  <dt className="text-[11px] text-[var(--color-earth-700)]">
                    Teléfono
                  </dt>
                  <dd className="text-[var(--color-leaf-900)] tabular-nums">
                    {customer.phone}
                  </dd>
                </div>
              )}
              {customer.document_number && (
                <div>
                  <dt className="text-[11px] text-[var(--color-earth-700)]">
                    Documento
                  </dt>
                  <dd className="text-[var(--color-leaf-900)] tabular-nums">
                    {customer.document_type}{" "}
                    {customer.document_number}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] text-[var(--color-earth-700)]">
                  Marketing
                </dt>
                <dd className="text-[var(--color-leaf-900)]">
                  {customer.accepts_marketing ? "Acepta" : "No acepta"}
                </dd>
              </div>
            </dl>
          </article>
        </aside>
      </div>
    </>
  );
}
