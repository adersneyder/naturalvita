import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./_LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description:
    "Accede a tu cuenta de NaturalVita para ver tus pedidos, direcciones y preferencias.",
  robots: { index: false, follow: false },
};

export default function IniciarSesionPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-[var(--color-leaf-900)] tracking-tight">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm text-[var(--color-earth-700)]">
            Te enviamos un enlace de acceso a tu correo. No necesitas contraseña.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="h-12 rounded-lg bg-[var(--color-earth-50)] animate-pulse" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
