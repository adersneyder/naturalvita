import type { Metadata } from "next";
import { Suspense } from "react";
import SignupForm from "./_SignupForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description:
    "Crea tu cuenta en NaturalVita para guardar tus pedidos, direcciones y preferencias.",
  robots: { index: false, follow: false },
};

export default function CrearCuentaPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-[var(--color-leaf-900)] tracking-tight">
            Crear cuenta
          </h1>
          <p className="mt-2 text-sm text-[var(--color-earth-700)]">
            Tus pedidos, direcciones y preferencias en un solo lugar.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="h-12 rounded-lg bg-[var(--color-earth-50)] animate-pulse" />
          }
        >
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
