"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  signInWithGoogleAction,
  signUpWithPasswordAction,
  signInWithMagicLinkAction,
  type AuthState,
} from "../iniciar-sesion/_actions/auth";
import GoogleButton from "../iniciar-sesion/_GoogleButton";

const INITIAL_STATE: AuthState = { ok: false };

export default function SignupForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/mi-cuenta";

  const [showMagicLink, setShowMagicLink] = useState(false);

  const [signupState, signupAction, signupPending] = useActionState(
    signUpWithPasswordAction,
    INITIAL_STATE,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    signInWithMagicLinkAction,
    INITIAL_STATE,
  );

  return (
    <div className="space-y-5">
      {/* 1. Google OAuth */}
      <form action={signInWithGoogleAction}>
        <input type="hidden" name="next" value={next} />
        <GoogleButton label="Continuar con Google" />
      </form>

      <div className="flex items-center gap-3 text-xs text-[var(--color-earth-400)]">
        <div className="flex-1 h-px bg-[var(--color-earth-100)]" />
        <span>o con tu correo</span>
        <div className="flex-1 h-px bg-[var(--color-earth-100)]" />
      </div>

      {/* 2. Email + password */}
      {!showMagicLink && (
        <form action={signupAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />

          <div>
            <label
              htmlFor="full_name"
              className="block text-sm text-[var(--color-earth-700)] mb-1"
            >
              Nombre completo
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              required
              autoComplete="name"
              autoFocus
              disabled={signupPending}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--color-earth-200)] focus:outline-none focus:border-[var(--color-iris-700)] disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm text-[var(--color-earth-700)] mb-1"
            >
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              autoComplete="email"
              disabled={signupPending}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--color-earth-200)] focus:outline-none focus:border-[var(--color-iris-700)] disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm text-[var(--color-earth-700)] mb-1"
            >
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={10}
              autoComplete="new-password"
              disabled={signupPending}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--color-earth-200)] focus:outline-none focus:border-[var(--color-iris-700)] disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-[var(--color-earth-500)]">
              Mínimo 10 caracteres.
            </p>
          </div>

          {signupState.message && (
            <p
              role={signupState.ok ? "status" : "alert"}
              className={`text-sm ${
                signupState.ok ? "text-[var(--color-leaf-700)]" : "text-red-600"
              }`}
            >
              {signupState.message}
            </p>
          )}

          <button
            type="submit"
            disabled={signupPending || signupState.ok}
            className="w-full py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signupPending
              ? "Creando cuenta..."
              : signupState.ok
                ? "✓ Revisa tu correo"
                : "Crear cuenta"}
          </button>

          <p className="text-xs text-[var(--color-earth-500)] text-center leading-relaxed">
            Al crear cuenta aceptas nuestros{" "}
            <Link
              href="/legal/terminos"
              className="underline hover:text-[var(--color-earth-700)]"
            >
              términos
            </Link>{" "}
            y la{" "}
            <Link
              href="/legal/privacidad"
              className="underline hover:text-[var(--color-earth-700)]"
            >
              política de privacidad
            </Link>
            .
          </p>
        </form>
      )}

      {/* 3. Magic link */}
      {showMagicLink && (
        <form action={magicAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />

          <div>
            <label
              htmlFor="magic-email"
              className="block text-sm text-[var(--color-earth-700)] mb-1"
            >
              Correo electrónico
            </label>
            <input
              type="email"
              id="magic-email"
              name="email"
              required
              autoComplete="email"
              autoFocus
              disabled={magicPending || magicState.ok}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--color-earth-200)] focus:outline-none focus:border-[var(--color-iris-700)] disabled:opacity-50"
            />
            <p className="mt-1.5 text-xs text-[var(--color-earth-500)]">
              Te enviaremos un enlace para acceder sin contraseña.
            </p>
          </div>

          {magicState.message && (
            <p
              role={magicState.ok ? "status" : "alert"}
              className={`text-sm ${
                magicState.ok ? "text-[var(--color-leaf-700)]" : "text-red-600"
              }`}
            >
              {magicState.message}
            </p>
          )}

          <button
            type="submit"
            disabled={magicPending || magicState.ok}
            className="w-full py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {magicPending
              ? "Enviando..."
              : magicState.ok
                ? "✓ Enlace enviado"
                : "Enviar enlace al correo"}
          </button>
        </form>
      )}

      <div className="text-center text-xs text-[var(--color-earth-500)]">
        <button
          type="button"
          onClick={() => setShowMagicLink(!showMagicLink)}
          className="text-[var(--color-iris-700)] hover:underline"
        >
          {showMagicLink
            ? "Crear cuenta con contraseña"
            : "Prefiero recibir un enlace por correo"}
        </button>
      </div>

      {/* Link a login */}
      <div className="pt-4 mt-4 border-t border-[var(--color-earth-100)] text-center text-sm text-[var(--color-earth-700)]">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={`/iniciar-sesion${next !== "/mi-cuenta" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-[var(--color-iris-700)] hover:underline font-medium"
        >
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
