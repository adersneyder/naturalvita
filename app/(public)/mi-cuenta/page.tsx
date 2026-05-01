import type { Metadata } from "next";
import Link from "next/link";
import { requireCustomer } from "@/lib/auth/customer-auth";
import LogoutButton from "./_LogoutButton";
import Breadcrumbs from "../_components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Mi cuenta",
  description: "Tu cuenta NaturalVita: pedidos, direcciones y preferencias.",
  robots: { index: false, follow: false },
};

export default async function MiCuentaPage() {
  const customer = await requireCustomer();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Mi cuenta" }]} />

      <header className="mt-6 mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight">
            Hola{customer.full_name ? `, ${customer.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-earth-700)]">
            {customer.email}
          </p>
        </div>
        <LogoutButton />
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <AccountCard
          title="Mis pedidos"
          description="Historial de compras y estado de envíos."
          comingSoon
        />
        <AccountCard
          title="Mis direcciones"
          description="Direcciones guardadas para checkout más rápido."
          comingSoon
        />
        <AccountCard
          title="Mis datos"
          description="Nombre, documento, teléfono y preferencias de marketing."
          comingSoon
        />
        <AccountCard
          title="Soporte"
          description="¿Necesitas ayuda con un pedido? Escríbenos."
          href="/contacto"
        />
      </div>
    </div>
  );
}

function AccountCard({
  title,
  description,
  href,
  comingSoon,
}: {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-serif text-lg text-[var(--color-leaf-900)]">{title}</h2>
        {comingSoon && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-earth-100)] text-[var(--color-earth-700)] font-medium">
            Próximamente
          </span>
        )}
      </div>
      <p className="text-sm text-[var(--color-earth-700)]">{description}</p>
    </>
  );

  if (comingSoon || !href) {
    return (
      <div className="block p-5 rounded-2xl bg-white border border-[var(--color-earth-100)] opacity-75">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block p-5 rounded-2xl bg-white border border-[var(--color-earth-100)] hover:border-[var(--color-iris-700)] hover:shadow-sm transition-all"
    >
      {content}
    </Link>
  );
}
