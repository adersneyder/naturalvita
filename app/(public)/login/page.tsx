import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginDestination } from "@/lib/auth/post-login";
import LoginForm from "../iniciar-sesion/_LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description:
    "Accede a tu cuenta de NaturalVita para ver tus pedidos, direcciones y preferencias.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /login — entry point ÚNICO de autenticación para clientes y equipo.
 *
 * Reglas:
 *   - Sin sesión: muestra el form (Google + password + magic link).
 *   - Con sesión: redirige según rol (admin_users activo → /admin,
 *     resto → /mi-cuenta) o al ?next= si vino explícito.
 *
 * Las rutas viejas /iniciar-sesion y /admin/login redirigen aquí vía
 * next.config (preservando querystring), así que ningún enlace antiguo
 * en emails o bookmarks se rompe.
 */
export default async function LoginPage({
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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-[var(--color-leaf-900)] tracking-tight">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm text-[var(--color-earth-700)]">
            Clientes y equipo de NaturalVita entran por aquí.
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
