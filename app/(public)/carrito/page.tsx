import type { Metadata } from "next";
import Breadcrumbs from "../_components/Breadcrumbs";
import CartPageContent from "./_CartPageContent";

export const metadata: Metadata = {
  title: "Tu carrito",
  description: "Revisa los productos en tu carrito antes de continuar al pago.",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Carrito" }]} />
      <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight mt-6 mb-8">
        Tu carrito
      </h1>
      <CartPageContent />
    </div>
  );
}
