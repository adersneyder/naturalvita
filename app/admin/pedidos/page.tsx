import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { listAdminOrders } from "@/lib/admin/admin-orders";
import { formatCop } from "@/lib/format/currency";
import { StatusBadge } from "@/components/orders/StatusBadge";
import OrdersFilters from "./_OrdersFilters";
import AdminPagination from "../_components/AdminPagination";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  payment_status?: string;
  page?: string;
}>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await getAdminUser();
  const params = await searchParams;

  const search = params.q ?? "";
  const status = params.status ?? "all";
  const paymentStatus = params.payment_status ?? "all";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 25;

  const result = await listAdminOrders({
    search,
    status,
    payment_status: paymentStatus,
    page,
    pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

  function buildHref(p: number): string {
    const next = new URLSearchParams();
    if (search) next.set("q", search);
    if (status !== "all") next.set("status", status);
    if (paymentStatus !== "all") next.set("payment_status", paymentStatus);
    if (p > 1) next.set("page", String(p));
    return `/admin/pedidos${next.toString() ? `?${next}` : ""}`;
  }

  return (
    <>
      <header className="mb-4">
        <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
          Pedidos
        </h1>
        <p className="text-xs text-[var(--color-earth-700)] mt-1">
          {result.total} {result.total === 1 ? "pedido en total" : "pedidos en total"}
        </p>
      </header>

      <OrdersFilters
        initialSearch={search}
        initialStatus={status}
        initialPayment={paymentStatus}
      />

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        {result.rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[var(--color-earth-700)]">
              No hay pedidos que coincidan con los filtros.
            </p>
            {(search || status !== "all" || paymentStatus !== "all") && (
              <Link
                href="/admin/pedidos"
                className="inline-block mt-2 text-xs text-[var(--color-iris-700)] hover:underline"
              >
                Limpiar filtros
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[1.4fr_1.6fr_1fr_1.4fr_0.9fr_auto] gap-4 px-4 py-2 text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium border-b border-[rgba(47,98,56,0.08)]">
              <span>Pedido</span>
              <span>Cliente</span>
              <span>Fecha</span>
              <span>Estado</span>
              <span className="text-right">Total</span>
              <span aria-hidden />
            </div>
            <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
              {result.rows.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/pedidos/${order.id}`}
                    className="block md:grid md:grid-cols-[1.4fr_1.6fr_1fr_1.4fr_0.9fr_auto] md:gap-4 md:items-center px-4 py-3 hover:bg-[var(--color-earth-50)] transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-leaf-900)] tabular-nums">
                        {order.order_number}
                      </p>
                      <p className="text-[11px] text-[var(--color-earth-700)] mt-0.5">
                        {order.items_count}{" "}
                        {order.items_count === 1 ? "producto" : "productos"}
                      </p>
                    </div>
                    <div className="min-w-0 mt-1 md:mt-0">
                      <p className="text-sm text-[var(--color-leaf-900)] truncate">
                        {order.customer_name}
                      </p>
                      <p className="text-[11px] text-[var(--color-earth-700)] truncate">
                        {order.customer_email}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--color-earth-700)] tabular-nums mt-1 md:mt-0">
                      {formatDate(order.created_at)}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2 md:mt-0">
                      <StatusBadge kind="payment" value={order.payment_status} />
                      <StatusBadge kind="status" value={order.status} />
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
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="px-4 pb-3">
          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            buildHref={buildHref}
          />
        </div>
      </div>
    </>
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
