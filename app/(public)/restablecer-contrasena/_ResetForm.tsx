"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 10;

export default function ResetForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [status, setStatus] = useState<"checking" | "ready" | "loading" | "error">("checking");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus("ready");
      } else {
        setStatus("error");
        setErrorMessage("El enlace ha expirado o no es válido. Solicita uno nuevo.");
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    await supabase.auth.signOut();
    router.push("/iniciar-sesion?message=password_reset");
  }

  if (status === "checking") {
    return <div className="h-12 rounded-lg bg-[var(--color-earth-50)] animate-pulse" />;
  }

  if (status === "error" && !password && !passwordConfirm) {
    return (
      <div className="text-center py-6 px-6 rounded-2xl bg-red-50 border border-red-100">
        <p className="text-sm text-red-700 mb-4">{errorMessage}</p>
        <a href="/recuperar-contrasena" className="inline-block px-4 py-2 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] transition-colors">
          Solicitar nuevo enlace
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="password" className="block text-xs uppercase tracking-wider font-semibold text-[var(--color-earth-700)] mb-2">
          Nueva contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={MIN_PASSWORD_LENGTH}
          className="w-full px-4 py-3 rounded-lg border border-[var(--color-earth-100)] text-base text-[var(--color-leaf-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)] focus:border-transparent"
          disabled={status === "loading"}
        />
        <p className="mt-1 text-xs text-[var(--color-earth-500)]">Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
      </div>
      <div>
        <label htmlFor="password-confirm" className="block text-xs uppercase tracking-wider font-semibold text-[var(--color-earth-700)] mb-2">
          Confirmar contraseña
        </label>
        <input
          id="password-confirm"
          type="password"
          required
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          minLength={MIN_PASSWORD_LENGTH}
          className="w-full px-4 py-3 rounded-lg border border-[var(--color-earth-100)] text-base text-[var(--color-leaf-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)] focus:border-transparent"
          disabled={status === "loading"}
        />
      </div>
      {errorMessage && (
        <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={status === "loading" || !password || !passwordConfirm}
        className="w-full px-4 py-3 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status === "loading" ? "Guardando..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
