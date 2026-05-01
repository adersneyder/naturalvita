import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Breadcrumbs from "../_components/Breadcrumbs";
import { requireCustomer } from "@/lib/auth/customer-auth";
import { createClient } from "@/lib/supabase/server";
import CheckoutClient from "./_CheckoutClient";

export const metadata: Metadata = {
  title: "Finalizar compra",
  description: "Completa tus datos de envío y método de pago.",
  robots: { index: false, follow: false },
};

// El checkout es altamente dinámico: depende de la sesión del cliente.
export const dynamic = "force-dynamic";

export type SavedAddress = {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  department: string;
  city: string;
  street: string;
  details: string | null;
  postal_code: string | null;
  is_default: boolean;
};

export default async function CheckoutPage() {
  // Auth gate: si no hay sesión, redirige preservando que vuelva al checkout
  const customer = await requireCustomer({ redirectTo: "/checkout" });

  // Cargar direcciones guardadas para mostrar selector
  const supabase = await createClient();
  const { data: addressesRaw } = await supabase
    .from("addresses")
    .select(
      "id, label, recipient_name, phone, department, city, street, details, postal_code, is_default",
    )
    .eq("customer_id", customer.id)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  const addresses = (addressesRaw ?? []) as SavedAddress[];

  // Nota: NO redirigimos a /carrito si está vacío porque el carrito vive en
  // localStorage del cliente y no es visible desde el server. El componente
  // cliente CheckoutClient detecta el carrito vacío y redirige.
  // Esto evita un redirect-loop: server piensa "carrito vacío", redirige,
  // pero el cliente sí tiene items.

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <Breadcrumbs
        items={[
          { label: "Carrito", href: "/carrito" },
          { label: "Finalizar compra" },
        ]}
      />
      <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight mt-6 mb-8">
        Finalizar compra
      </h1>
      <CheckoutClient
        customerId={customer.id}
        customerEmail={customer.email}
        initialContact={{
          full_name: customer.full_name ?? "",
          phone: customer.phone ?? "",
          document_type:
            (customer.document_type as "CC" | "CE" | "NIT" | "PA" | "TI") ??
            "CC",
          document_number: customer.document_number ?? "",
          accepts_marketing: customer.accepts_marketing,
        }}
        savedAddresses={addresses}
      />
    </div>
  );
}
