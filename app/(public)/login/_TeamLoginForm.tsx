"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  signInWithPasswordAction,
  type AuthState,
} from "@/app/(public)/iniciar-sesion/_actions/auth";

const INITIAL_STATE: AuthState = { ok: false };

/**
 * Form de acceso del equipo. Email + password únicamente — sin OAuth ni
 * magic link, porque queremos credenciales fijas con rotación periódica.
 *
 * Reutiliza signInWithPasswordAction del cliente: Supabase Auth es el
 * mismo, lo que diferencia equipo de cliente es la tabla admin_users
 * (validada por el layout de /admin). El hidden next=/admin asegura
 * el destino tras autenticar.
 */
export default function TeamLoginForm() {
  const [state, formAction, pending] = useActionState(
    signInWithPasswordAction,
    INITIAL_STATE,
  );
  const params = useSearchParams();
  const urlError = params.get("error");

  let banner: { tone: "warn" | "err"; msg: string } | null = null;
  if (urlError === "not_authorized") {
    banner = {
      tone: "warn",
      msg: "Tu cuenta no tiene acceso al panel admin. Pídele a un owner que te dé permisos.",
    };
  } else if (urlError === "onboarding_failed") {
    banner = { tone: "err", msg: "No pudimos completar tu acceso. Intenta de nuevo." };
  } else if (urlError) {
    banner = { tone: "err", msg: urlError };
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

      <p className="text-[11px] text-center text-[var(--color-earth-500)]">
        ¿Olvidaste tu contraseña?{" "}
        <Link
          href="/recuperar-contrasena"
          className="text-[var(--color-iris-700)] hover:underline"
        >
          Recupérala
        </Link>
      </p>
    </form>
  );
}
