import Link from "next/link";
import { Suspense } from "react";
import AdminLoginForm from "./_LoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Panel admin · NaturalVita",
  robots: { index: false, follow: false },
};

/**
 * Página de login del panel admin. Entry point único para todos los
 * miembros del equipo (owner, admin, editor, cashier, warehouse).
 *
 * Acceso: público. No requiere sesión — la usamos para conseguirla.
 * El layout /admin excepciona esta ruta (ver headers x-pathname).
 *
 * Después del signIn exitoso, el action redirige a /admin. El layout
 * de /admin valida que el user_id existe en admin_users activo; si no,
 * signOut + redirect aquí con ?error=not_authorized.
 */
export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-earth-50)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-block font-serif text-xl text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)]"
          >
            NaturalVita
          </Link>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            Panel administrativo
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-6">
          <h1 className="font-serif text-lg text-[var(--color-leaf-900)] m-0 mb-4">
            Inicia sesión
          </h1>
          <Suspense fallback={null}>
            <AdminLoginForm />
          </Suspense>
        </div>

        <p className="text-[11px] text-[var(--color-earth-500)] text-center mt-4">
          ¿Eres cliente?{" "}
          <Link
            href="/iniciar-sesion"
            className="text-[var(--color-iris-700)] hover:underline"
          >
            Inicia sesión aquí
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
