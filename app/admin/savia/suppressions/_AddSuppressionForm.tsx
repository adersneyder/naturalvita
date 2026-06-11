"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSuppression } from "../actions";

/**
 * Form para añadir un email a suppressions manualmente. Caso de uso:
 * un cliente pide por WhatsApp/teléfono que no le lleguen más correos.
 */
export default function AddSuppressionForm() {
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await addSuppression(email, notes);
      if (!res.ok) {
        setMessage({ ok: false, text: res.error });
        return;
      }
      setMessage({ ok: true, text: `${email.trim().toLowerCase()} añadido.` });
      setEmail("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4"
    >
      <h2 className="font-serif text-sm font-medium text-[var(--color-leaf-900)] m-0 mb-1">
        Añadir manualmente
      </h2>
      <p className="text-[11px] text-[var(--color-earth-500)] mb-3">
        Para cuando un cliente pide por otro canal no recibir más correos.
      </p>
      <div className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="correo@ejemplo.com"
          className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs focus:outline-none focus:border-[var(--color-iris-700)]"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Nota (opcional): pidió baja por WhatsApp…"
          className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs focus:outline-none focus:border-[var(--color-iris-700)]"
        />
        <button
          type="submit"
          disabled={pending || !email}
          className="w-full px-3 py-2 rounded-lg bg-[var(--color-iris-700)] text-white text-xs font-medium hover:bg-[var(--color-iris-600)] disabled:opacity-50"
        >
          {pending ? "Añadiendo…" : "Bloquear marketing para este email"}
        </button>
      </div>
      {message && (
        <p
          className={`text-[11px] mt-2 m-0 ${message.ok ? "text-[var(--color-leaf-700)]" : "text-[#B23A1F]"}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
