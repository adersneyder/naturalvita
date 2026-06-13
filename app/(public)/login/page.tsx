import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginDestination } from "@/lib/auth/post-login";
import TeamLoginForm from "./_TeamLoginForm";

export const metadata: Metadata = {
  title: "Acceso al equipo · NaturalVita",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /login — entry point EXCLUSIVO del equipo (owner, admin, editor,
 * cashier, warehouse). Los clientes entran por /iniciar-sesion.
 *
 * Form mínimo: email + password. Sin Google ni magic link — el equipo
 * usa credenciales fijas para acceso predecible y rápido. El olvido de
 * contraseña va por /recuperar-contrasena (compartido con cliente).
 *
 * Si llega un usuario que ya tiene sesión: si es admin activo → /admin,
 * si es cliente → /mi-cuenta. Un `next` explícito se respeta.
 */
export default async function TeamLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    if (next && next.startsWith("/")) redirect(next);
    redirect(await resolvePostLoginDestination("/mi-cuenta"));
  }

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
            Acceso del equipo
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-6">
          <h1 className="font-serif text-lg text-[var(--color-leaf-900)] m-0 mb-4">
            Inicia sesión
          </h1>
          <Suspense fallback={null}>
            <TeamLoginForm />
          </Suspense>
        </div>

        <p className="text-[11px] text-[var(--color-earth-500)] text-center mt-4">
          ¿Eres cliente?{" "}
          <Link
            href="/iniciar-sesion"
            className="text-[var(--color-iris-700)] hover:underline"
          >
            Ingresa a tu cuenta
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
