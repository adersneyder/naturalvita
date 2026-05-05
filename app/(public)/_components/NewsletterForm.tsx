"use client";

import { useActionState } from "react";
import {
  subscribeNewsletterAction,
  type NewsletterSignupState,
} from "../_actions/newsletter";

const INITIAL_STATE: NewsletterSignupState = { ok: false, message: "" };

/**
 * Formulario de suscripción al newsletter para el footer.
 *
 * Diseño:
 *   - Honeypot oculto (campo "website") para bloquear bots simples.
 *   - useActionState para mostrar mensaje de éxito/error inline sin
 *     navegación.
 *   - Email persiste en el campo si hay error; se limpia con éxito.
 *   - El botón se deshabilita durante el submit (pending=true).
 */
export function NewsletterForm() {
  const [state, formAction, isPending] = useActionState(
    subscribeNewsletterAction,
    INITIAL_STATE,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col sm:flex-row gap-2 w-full md:w-auto md:min-w-[380px]"
    >
      {/* Honeypot: invisible para humanos, los bots tienden a llenar todo */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label>
          No llenar este campo
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <input
        type="email"
        name="email"
        required
        placeholder="tu@correo.com"
        aria-label="Tu correo electrónico"
        autoComplete="email"
        disabled={isPending || state.ok}
        defaultValue={state.ok ? "" : undefined}
        className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isPending || state.ok}
        className="px-6 py-3 rounded-lg bg-white text-leaf-900 text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {isPending ? "Enviando..." : state.ok ? "¡Suscrito!" : "Suscribirme"}
      </button>

      {state.message && (
        <p
          role="status"
          aria-live="polite"
          className={`absolute mt-14 text-xs ${
            state.ok ? "text-leaf-100" : "text-red-300"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
