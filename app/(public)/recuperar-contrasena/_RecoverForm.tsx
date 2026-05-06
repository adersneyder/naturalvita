"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecoverForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const redirect = `${window.location.origin}/restablecer-contrasena`;

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: redirect },
    );

    if (error && error.message.toLowerCase().includes("rate limit")) {
      setStatus("error");
      setErrorMessage("Demasiados intentos. Espera unos minutos.");
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
          Si <span className="font-medium">{email}</span> tiene una cuenta, recibirás un enlace para restablecer tu contraseña.
        </p>
        <p className="text-xs text-[var(--color-earth-500)] mt-4">
          El enlace expira en 1 hora. Si no lo ves, revisa la carpeta de spam.
        </p>
        <Link href="/iniciar-sesion" className="inline-block mt-5 text-xs text-[var(--color-iris-700)] hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs uppercase tracking-wider font-semibold text-[var(--color-earth-700)] mb-2">
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
        <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={status === "loading" || !email}
        className="w-full px-4 py-3 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status === "loading" ? "Enviando..." : "Enviar enlace de recuperación"}
      </button>
      <p className="text-sm text-center text-[var(--color-earth-700)] mt-6">
        <Link href="/iniciar-sesion" className="text-[var(--color-iris-700)] hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
