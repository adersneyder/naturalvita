"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/mi-cuenta";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    urlError ? "error" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState(translateError(urlError));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: redirect,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="text-center py-6 px-6 rounded-2xl bg-[var(--color-leaf-100)]/40 border border-[var(--color-leaf-100)]">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)] mb-4 text-xl">
          ✓
        </div>
        <p className="text-sm font-medium text-[var(--color-leaf-900)] mb-2">
          Revisa tu correo
        </p>
        <p className="text-xs text-[var(--color-earth-700)] leading-relaxed">
          Enviamos un enlace de acceso a<br />
          <span className="font-medium">{email}</span>
        </p>
        <p className="text-xs text-[var(--color-earth-500)] mt-4">
          El enlace expira en 1 hora. Si no lo ves, revisa la carpeta de spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-xs uppercase tracking-wider font-semibold text-[var(--color-earth-700)] mb-2"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tunombre@correo.com"
          className="w-full px-4 py-3 rounded-lg border border-[var(--color-earth-100)] text-base text-[var(--color-leaf-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)] focus:border-transparent"
          disabled={status === "loading"}
        />
      </div>

      {errorMessage && (
        <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading" || !email}
        className="w-full px-4 py-3 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "Enviando..." : "Enviar enlace"}
      </button>

      <p className="text-xs text-center text-[var(--color-earth-500)] mt-6">
        Al continuar aceptas nuestros{" "}
        <a
          href="/legal/terminos"
          className="text-[var(--color-iris-700)] hover:underline"
        >
          términos
        </a>{" "}
        y la{" "}
        <a
          href="/legal/privacidad"
          className="text-[var(--color-iris-700)] hover:underline"
        >
          política de privacidad
        </a>
        .
      </p>
    </form>
  );
}

function translateError(code: string | null): string {
  if (!code) return "";
  if (code === "onboarding_failed")
    return "No pudimos crear tu cuenta. Intenta de nuevo o escríbenos a pedidos@naturalvita.co.";
  if (code === "no_code") return "Enlace inválido. Solicita uno nuevo.";
  if (code === "not_authorized")
    return "Tu cuenta no tiene acceso. Contacta al administrador.";
  return code;
}
