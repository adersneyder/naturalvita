import type { Metadata } from "next";
import { requireCustomer } from "@/lib/auth/customer-auth";
import { createClient } from "@/lib/supabase/server";
import { listCustomerOrders } from "@/lib/checkout/customer-orders";
import Breadcrumbs from "../_components/Breadcrumbs";
import LogoutButton from "./_LogoutButton";
import AccountTabs, { AccountPanel } from "./_AccountTabs";
import SummaryPanel from "./_SummaryPanel";
import OrdersListPanel from "./_OrdersListPanel";
import AddressesPanel, { type SavedAddressDTO } from "./_AddressesPanel";
import DataPanel from "./_DataPanel";
import type { ContactInput } from "@/lib/checkout/schemas";

export const metadata: Metadata = {
  title: "Mi cuenta",
  description: "Tu cuenta NaturalVita: pedidos, direcciones y preferencias.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tab?: string }>;

export default async function MiCuentaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const customer = await requireCustomer();
  const params = await searchParams;
  const activeTab = params.tab ?? "resumen";

  const supabase = await createClient();

  const [orders, addressesResp] = await Promise.all([
    listCustomerOrders(customer.id),
    supabase
      .from("addresses")
      .select(
        "id, recipient_name, phone, department, city, street, details, postal_code, label, is_default",
      )
      .eq("customer_id", customer.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const addresses = (addressesResp.data ?? []) as SavedAddressDTO[];

  const totalSpent = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((acc, o) => acc + o.total_cop, 0);
  const recentOrders = orders.slice(0, 3);
  const defaultAddress = addresses.find((a) => a.is_default) ?? null;

  const initialContact: ContactInput = {
    full_name: customer.full_name ?? "",
    phone: customer.phone ?? "",
    document_type: (customer.document_type as ContactInput["document_type"]) ?? "CC",
    document_number: customer.document_number ?? "",
    accepts_marketing: customer.accepts_marketing,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      <Breadcrumbs items={[{ label: "Mi cuenta" }]} />

      <header className="mt-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight">
            Mi cuenta
          </h1>
          <p className="mt-1 text-sm text-[var(--color-earth-700)]">
            {customer.email}
          </p>
        </div>
        <LogoutButton />
      </header>

      <AccountTabs
        pedidosCount={orders.length}
        direccionesCount={addresses.length}
      />

      <AccountPanel>
        {activeTab === "resumen" && (
          <SummaryPanel
            customerName={customer.full_name}
            recentOrders={recentOrders}
            totalOrdersCount={orders.length}
            totalSpent={totalSpent}
            defaultAddress={
              defaultAddress
                ? {
                    label: defaultAddress.label,
                    recipient_name: defaultAddress.recipient_name,
                    street: defaultAddress.street,
                    details: defaultAddress.details,
                    city: defaultAddress.city,
                    department: defaultAddress.department,
                  }
                : null
            }
          />
        )}
        {activeTab === "pedidos" && <OrdersListPanel orders={orders} />}
        {activeTab === "direcciones" && (
          <AddressesPanel addresses={addresses} />
        )}
        {activeTab === "datos" && (
          <DataPanel initial={initialContact} email={customer.email} />
        )}
      </AccountPanel>
    </div>
  );
}
