"use client";

import { useState, useTransition } from "react";
import { createPriceSyncRun } from "../actions";

type Lab = { id: string; name: string };

export default function NuevaSincForm({ laboratories }: { laboratories: Lab[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createPriceSyncRun(formData);
      // Si todo fue bien la acción ya hizo redirect — no llegamos aquí.
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="laboratoryId"
          className="block text-xs font-medium text-[var(--color-leaf-900)] mb-1"
        >
          Laboratorio
        </label>
        <select
          id="laboratoryId"
          name="laboratoryId"
          required
          defaultValue=""
          className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm bg-white focus:outline-none focus:border-[var(--color-iris-700)]"
        >
          <option value="" disabled>
            Selecciona laboratorio…
          </option>
          {laboratories.map((lab) => (
            <option key={lab.id} value={lab.id}>
              {lab.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="file"
          className="block text-xs font-medium text-[var(--color-leaf-900)] mb-1"
        >
          Archivo (.xlsx o .csv)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="block w-full text-xs text-[var(--color-earth-700)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[rgba(47,98,56,0.15)] file:text-xs file:font-medium file:bg-white file:text-[var(--color-leaf-900)] file:cursor-pointer hover:file:bg-[var(--color-earth-50)]"
        />
      </div>

      {error && (
        <p className="text-[#B23A1F] text-xs m-0 p-2 bg-[#FCE9E5] rounded-lg">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
      >
        {pending ? "Procesando archivo…" : "Subir y procesar"}
      </button>
    </form>
  );
}
