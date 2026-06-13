"use client";

import { useActionState, useId } from "react";
import {
  changePasswordAction,
  type AuthState,
} from "@/app/(public)/iniciar-sesion/_actions/auth";

const INITIAL_STATE: AuthState = { ok: false };

/**
 * Sección "Cambiar contraseña" reusable. Sirve tanto en /mi-cuenta como
 * en el panel admin. Si el usuario nunca tuvo password (login con Google
 * o magic link), este mismo flujo le crea una — el server action no pide
 * la actual.
 */
export default function ChangePasswordSection() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    INITIAL_STATE,
  );
  const pwdId = useId();
  const confirmId = useId();

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label
          htmlFor={pwdId}
          className="block text-xs font-medium text-[var(--color-leaf-900)] mb-1"
        >
          Nueva contraseña
        </label>
        <input
          id={pwdId}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm focus:outline-none focus:border-[var(--color-iris-700)]"
        />
        <p className="text-[10px] text-[var(--color-earth-500)] mt-1 m-0">
          Al menos 10 caracteres.
        </p>
      </div>

      <div>
        <label
          htmlFor={confirmId}
          className="block text-xs font-medium text-[var(--color-leaf-900)] mb-1"
        >
          Confirmar contraseña
        </label>
        <input
          id={confirmId}
          name="password_confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm focus:outline-none focus:border-[var(--color-iris-700)]"
        />
      </div>

      {state.message && (
        <p
          className={`text-xs m-0 p-2 rounded-lg ${
            state.ok
              ? "text-[var(--color-leaf-700)] bg-[var(--color-leaf-100)]/60"
              : "text-[#B23A1F] bg-[#FCE9E5]"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
