"use client";

import { useState, useTransition } from "react";
import { inviteAdmin } from "./actions";

const ROLES = [
  { value: "admin", label: "Admin (casi todo)" },
  { value: "editor", label: "Editor (catálogo + guías)" },
  { value: "cashier", label: "Caja (pedidos + cancelar)" },
  { value: "warehouse", label: "Bodega (pedidos + despacho)" },
] as const;

export default function InviteForm() {
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      const res = await inviteAdmin(formData);
      if (res.ok) {
        form.reset();
        setFeedback({ ok: true, msg: res.message ?? "Invitación enviada" });
      } else {
        setFeedback({ ok: false, msg: res.error });
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 md:grid-cols-[1fr_1fr_160px_auto] gap-2 items-end"
    >
      <div>
        <label
          htmlFor="email"
          className="block text-[10px] uppercase tracking-wider text-[var(--color-earth-500)] mb-1"
        >
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="persona@equipo.com"
          className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm focus:outline-none focus:border-[var(--color-iris-700)]"
        />
      </div>
      <div>
        <label
          htmlFor="full_name"
          className="block text-[10px] uppercase tracking-wider text-[var(--color-earth-500)] mb-1"
        >
          Nombre
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          minLength={2}
          placeholder="Nombre completo"
          className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm focus:outline-none focus:border-[var(--color-iris-700)]"
        />
      </div>
      <div>
        <label
          htmlFor="role"
          className="block text-[10px] uppercase tracking-wider text-[var(--color-earth-500)] mb-1"
        >
          Rol
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue=""
          className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm bg-white focus:outline-none focus:border-[var(--color-iris-700)]"
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Invitar"}
      </button>

      {feedback && (
        <p
          className={`md:col-span-4 text-xs m-0 p-2 rounded-lg ${
            feedback.ok
              ? "text-[var(--color-leaf-700)] bg-[var(--color-leaf-100)]/60"
              : "text-[#B23A1F] bg-[#FCE9E5]"
          }`}
        >
          {feedback.msg}
        </p>
      )}
    </form>
  );
}
