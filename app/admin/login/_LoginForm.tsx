"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithPasswordAction, type AuthState } from "@/app/(public)/iniciar-sesion/_actions/auth";

const INITIAL_STATE: AuthState = { ok: false };

/**
 * Form de login del panel admin.
 *
 * Solo email + password — sin OAuth ni magic link. El admin necesita
 * acceso predecible y rápido con credenciales fijas; los flujos de
 * cliente (Google, magic link) viven en /iniciar-sesion.
 *
 * Reutiliza el server action signInWithPasswordAction del cliente porque
 * Supabase Auth es el mismo — la diferenciación entre admin y cliente
 * vive en la tabla public.admin_users, no en el flujo de signIn.
 *
 * El campo hidden `next=/admin` hace que el redirect post-login vaya al
 * dashboard. Si el usuario no resulta ser admin, getAdminUser() en el
 * layout hará signOut + redirect aquí con ?error=not_authorized.
 */
export default function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(
    signInWithPasswordAction,
    INITIAL_STATE,
  );
  const params = useSearchParams();
  const error = params.get("error");

  let banner: { tone: "warn" | "err"; msg: string } | null = null;
  if (error === "not_authorized") {
    banner = {
      tone: "warn",
      msg: "Tu cuenta no tiene acceso al panel admin. Pídele a un owner que te dé permisos.",
    };
  } else if (error === "onboarding_failed") {
    banner = { tone: "err", msg: "No pudimos completar tu acceso. Intenta de nuevo." };
  }
  if (state.message) {
    banner = { tone: "err", msg: state.message };
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value="/admin" />

      <div>
        <label
          htmlFor="email"
          className="block text-xs font-medium text-[var(--color-leaf-900)] mb-1"
        >
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm focus:outline-none focus:border-[var(--color-iris-700)]"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium text-[var(--color-leaf-900)] mb-1"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm focus:outline-none focus:border-[var(--color-iris-700)]"
        />
      </div>

      {banner && (
        <p
          className={`text-xs m-0 p-2 rounded-lg ${
            banner.tone === "warn"
              ? "text-[#854F0B] bg-[#FAEEDA]"
              : "text-[#B23A1F] bg-[#FCE9E5]"
          }`}
        >
          {banner.msg}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
      >
        {pending ? "Entrando…" : "Entrar al panel"}
      </button>
    </form>
  );
}
