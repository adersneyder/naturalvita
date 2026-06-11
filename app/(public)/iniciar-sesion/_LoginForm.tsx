"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  signInWithGoogleAction,
  signInWithPasswordAction,
  signInWithMagicLinkAction,
  type AuthState,
} from "./_actions/auth";
import GoogleButton from "./_GoogleButton";

const INITIAL_STATE: AuthState = { ok: false };

/**
 * Formulario de inicio de sesión con tres métodos:
 *   1. Google OAuth (botón destacado, primer CTA)
 *   2. Email + password (form principal, debajo de Google)
 *   3. Magic link (link discreto que abre form modal/inline)
 *
 * El parámetro `?next=/ruta` indica a dónde llevar al cliente después
 * de autenticarse. Default: /mi-cuenta.
 *
 * Errores OAuth llegan como `?error=mensaje` en URL (cuando el callback
 * falla y redirige aquí).
 */
export default function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/mi-cuenta";
  const urlError = params.get("error");

  const [showMagicLink, setShowMagicLink] = useState(false);

  const [pwdState, pwdAction, pwdPending] = useActionState(
    signInWithPasswordAction,
    INITIAL_STATE,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    signInWithMagicLinkAction,
    INITIAL_STATE,
  );

  return (
    <div className="space-y-5">
      {/* Error desde URL (callback OAuth falló) */}
      {urlError && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700"
        >
          {urlError}
        </div>
      )}

      {/* 1. Google OAuth */}
      <form action={signInWithGoogleAction}>
        <input type="hidden" name="next" value={next} />
        <GoogleButton label="Continuar con Google" />
      </form>

      {/* Separador */}
      <div className="flex items-center gap-3 text-xs text-[var(--color-earth-400)]">
        <div className="flex-1 h-px bg-[var(--color-earth-100)]" />
        <span>o con tu correo</span>
        <div className="flex-1 h-px bg-[var(--color-earth-100)]" />
      </div>

      {/* 2. Email + password */}
      {!showMagicLink && (
        <form action={pwdAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />

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
              autoFocus
              disabled={pwdPending}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--color-earth-200)] focus:outline-none focus:border-[var(--color-iris-700)] disabled:opacity-50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className="block text-sm text-[var(--color-earth-700)]"
              >
                Contraseña
              </label>
              <Link
                href="/recuperar-contrasena"
                className="text-xs text-[var(--color-iris-700)] hover:underline"
              >
                ¿La olvidaste?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoComplete="current-password"
              disabled={pwdPending}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--color-earth-200)] focus:outline-none focus:border-[var(--color-iris-700)] disabled:opacity-50"
            />
          </div>

          {pwdState.message && !pwdState.ok && (
            <p role="alert" className="text-sm text-red-600">
              {pwdState.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pwdPending}
            className="w-full py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pwdPending ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
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

      {/* Switch entre métodos */}
      <div className="text-center text-xs text-[var(--color-earth-500)]">
        <button
          type="button"
          onClick={() => setShowMagicLink(!showMagicLink)}
          className="text-[var(--color-iris-700)] hover:underline"
        >
          {showMagicLink
            ? "Iniciar con contraseña"
            : "Prefiero recibir un enlace por correo"}
        </button>
      </div>

      {/* Link a registro */}
      <div className="pt-4 mt-4 border-t border-[var(--color-earth-100)] text-center text-sm text-[var(--color-earth-700)]">
        ¿No tienes cuenta?{" "}
        <Link
          href={`/crear-cuenta${next !== "/mi-cuenta" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-[var(--color-iris-700)] hover:underline font-medium"
        >
          Crear cuenta
        </Link>
      </div>

      {/* Continuar como invitado: solo se ofrece cuando viene del checkout.
          Reduce fricción de compra sin "competir" con el login (queda al
          pie como tercera opción discreta). */}
      {next === "/checkout" && (
        <div className="pt-3 border-t border-dashed border-[var(--color-earth-100)] text-center">
          <Link
            href="/checkout?guest=1"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-earth-700)] hover:text-[var(--color-iris-700)]"
          >
            ¿No quieres crear cuenta?
            <span className="text-[var(--color-iris-700)] font-medium underline underline-offset-2">
              Continuar como invitado
            </span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
