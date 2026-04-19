"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    urlError ? "error" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState(urlError ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
      <div className="text-center py-4">
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
          El enlace expira en 1 hora
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <label
        htmlFor="email"
        className="block text-xs font-medium text-[var(--color-earth-700)] mb-2"
      >
        Correo electrónico
      </label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
        disabled={status === "loading"}
        className="w-full px-3 py-2.5 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] bg-white text-[var(--color-leaf-900)] focus:outline-none focus:border-[var(--color-leaf-500)] disabled:opacity-50"
      />

      {errorMessage && (
        <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700 font-medium mb-0.5">
            No se pudo iniciar sesión
          </p>
          <p className="text-xs text-red-600">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading" || !email}
        className="w-full mt-4 px-4 py-2.5 text-sm font-medium rounded-lg bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "Enviando..." : "Enviar enlace de acceso"}
      </button>

      <p className="text-xs text-[var(--color-earth-500)] mt-4 text-center leading-relaxed">
        Te enviaremos un enlace seguro a tu correo.
        <br />
        Sin contraseñas.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-[var(--color-earth-50)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl font-medium text-[var(--color-leaf-900)] mb-2">
            NaturalVita
          </h1>
          <p className="text-sm text-[var(--color-earth-700)]">
            Panel de administración
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[rgba(47,98,56,0.12)]">
          <Suspense fallback={<div className="h-40" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-xs text-[var(--color-earth-500)] text-center mt-6">
          ¿Eres cliente? Ve a{" "}
          <a href="/" className="text-[var(--color-leaf-700)] underline">
            naturalvita.co
          </a>
        </p>
      </div>
    </main>
  );
}
