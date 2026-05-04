import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { listAdminCustomers } from "@/lib/admin/admin-orders";
import { formatCop } from "@/lib/format/currency";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await getAdminUser();
  const customers = await listAdminCustomers();

  return (
    <>
      <header className="mb-4">
        <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
          Clientes
        </h1>
        <p className="text-xs text-[var(--color-earth-700)] mt-1">
          {customers.length}{" "}
          {customers.length === 1 ? "cliente registrado" : "clientes registrados"}
          {customers.length === 200 && " (mostrando los 200 más recientes)"}
        </p>
      </header>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        {customers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[var(--color-earth-700)]">
              Aún no hay clientes registrados.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[2fr_1.5fr_0.7fr_1fr_0.4fr] gap-4 px-4 py-2 text-[10px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium border-b border-[rgba(47,98,56,0.08)]">
              <span>Cliente</span>
              <span>Contacto</span>
              <span className="text-right">Pedidos</span>
              <span className="text-right">Total gastado</span>
              <span aria-hidden />
            </div>
            <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
              {customers.map((customer) => (
                <li key={customer.id}>
                  <Link
                    href={`/admin/clientes/${customer.id}`}
                    className="block md:grid md:grid-cols-[2fr_1.5fr_0.7fr_1fr_0.4fr] md:gap-4 md:items-center px-4 py-3 hover:bg-[var(--color-earth-50)] transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-leaf-900)] truncate">
                        {customer.full_name ?? "Sin nombre"}
                      </p>
                      <p className="text-[11px] text-[var(--color-earth-500)] mt-0.5">
                        Registrado {formatDate(customer.created_at)}
                      </p>
                    </div>
                    <div className="min-w-0 mt-1 md:mt-0">
                      <p className="text-xs text-[var(--color-earth-700)] truncate">
                        {customer.email}
                      </p>
                      {customer.phone && (
                        <p className="text-[11px] text-[var(--color-earth-500)] tabular-nums">
                          {customer.phone}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-leaf-900)] tabular-nums mt-2 md:mt-0 md:text-right">
                      {customer.orders_count}
                    </p>
                    <p className="text-sm font-medium text-[var(--color-leaf-900)] tabular-nums mt-1 md:mt-0 md:text-right">
                      {formatCop(customer.total_spent)}
                    </p>
                    <span
                      aria-hidden
                      className="hidden md:inline text-[var(--color-earth-500)] group-hover:text-[var(--color-leaf-700)] transition-colors text-right"
                    >
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
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
