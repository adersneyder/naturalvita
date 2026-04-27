"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createContentUnit, updateContentUnit, deleteContentUnit } from "../actions";

export type UnitRow = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  unit_family: string;
  sort_order: number;
  is_active: boolean;
  products_count: number;
};

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; row: UnitRow };

const FAMILY_LABELS: Record<string, string> = {
  weight: "Peso",
  volume: "Volumen",
  units: "Unidades",
  other: "Otro",
};

export default function UnitsList({ rows }: { rows: UnitRow[] }) {
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result =
        modal.mode === "edit"
          ? await updateContentUnit(modal.row.id, formData)
          : await createContentUnit(formData);

      if (!result.success) {
        setError(result.error ?? "Error desconocido");
        return;
      }
      setModal({ mode: "closed" });
    });
  }

  function handleDelete(row: UnitRow) {
    if (!confirm(`¿Eliminar la unidad "${row.name}" (${row.symbol})?`)) return;
    startTransition(async () => {
      const result = await deleteContentUnit(row.id, row.code);
      if (!result.success) alert(result.error ?? "Error");
    });
  }

  return (
    <>
      <div className="flex justify-between items-start mb-5">
        <div>
          <Link
            href="/admin/configuracion"
            className="text-xs text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)]"
          >
            ← Configuración
          </Link>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0 mt-1">
            Unidades de contenido
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
            Unidad en que se mide el contenido del producto: gramos, mililitros, cápsulas, etc.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setModal({ mode: "create" });
          }}
          className="bg-[var(--color-leaf-700)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--color-leaf-900)]"
        >
          + Nueva unidad
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_120px_120px_100px_100px_120px] gap-3 px-5 py-3 bg-[var(--color-earth-50)] text-[11px] uppercase tracking-wider font-medium text-[var(--color-earth-700)]">
          <span>Nombre</span>
          <span>Símbolo</span>
          <span>Código</span>
          <span>Familia</span>
          <span>Productos</span>
          <span>Estado</span>
          <span></span>
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--color-earth-700)]">
            No hay unidades de contenido.
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_100px_120px_120px_100px_100px_120px] gap-3 px-5 py-3 items-center border-b border-[#F0E9DB] last:border-b-0"
            >
              <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">{row.name}</p>
              <span className="text-xs text-[var(--color-leaf-900)] font-mono font-medium">
                {row.symbol}
              </span>
              <span className="text-[11px] text-[var(--color-earth-700)] font-mono">{row.code}</span>
              <span className="text-[11px] text-[var(--color-earth-700)]">
                {FAMILY_LABELS[row.unit_family] ?? row.unit_family}
              </span>
              <span className="text-xs text-[var(--color-leaf-900)]">{row.products_count}</span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${
                  row.is_active
                    ? "bg-[var(--color-leaf-100)] text-[var(--color-leaf-900)]"
                    : "bg-[#F0E9DB] text-[var(--color-earth-700)]"
                }`}
              >
                {row.is_active ? "Activa" : "Inactiva"}
              </span>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setError(null);
                    setModal({ mode: "edit", row });
                  }}
                  className="text-[11px] text-[var(--color-leaf-700)] hover:text-[var(--color-leaf-900)]"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(row)}
                  disabled={isPending || row.products_count > 0}
                  className="text-[11px] text-red-700 hover:text-red-900 disabled:text-[var(--color-earth-500)] disabled:cursor-not-allowed"
                  title={row.products_count > 0 ? "Tiene productos asociados" : "Eliminar"}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modal.mode !== "closed" && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setModal({ mode: "closed" })}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-medium text-[var(--color-leaf-900)] m-0 mb-4">
              {modal.mode === "create" ? "Nueva unidad de contenido" : `Editar: ${modal.row.name}`}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              {modal.mode === "create" ? (
                <Field label="Código (único, en inglés sin espacios) *">
                  <Input
                    name="code"
                    required
                    placeholder="g, ml, capsules..."
                    className="font-mono text-xs"
                    autoFocus
                  />
                </Field>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-[var(--color-earth-700)] mb-1">
                    Código (no editable)
                  </label>
                  <p className="text-xs text-[var(--color-earth-700)] bg-[var(--color-earth-50)] px-3 py-2 rounded-lg m-0 font-mono">
                    {modal.row.code}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre visible *">
                  <Input
                    name="name"
                    required
                    defaultValue={modal.mode === "edit" ? modal.row.name : ""}
                    placeholder="Gramos"
                  />
                </Field>
                <Field label="Símbolo *">
                  <Input
                    name="symbol"
                    required
                    defaultValue={modal.mode === "edit" ? modal.row.symbol : ""}
                    placeholder="g"
                    className="font-mono"
                  />
                </Field>
              </div>

              <Field label="Familia de unidad *">
                <Select
                  name="unit_family"
                  defaultValue={modal.mode === "edit" ? modal.row.unit_family : "units"}
                  required
                >
                  {Object.entries(FAMILY_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Orden">
                  <Input
                    name="sort_order"
                    type="number"
                    min="0"
                    defaultValue={modal.mode === "edit" ? modal.row.sort_order : 99}
                  />
                </Field>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-xs text-[var(--color-leaf-900)] cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      value="true"
                      defaultChecked={modal.mode === "edit" ? modal.row.is_active : true}
                      className="w-3.5 h-3.5"
                    />
                    Activa
                  </label>
                </div>
              </div>

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setModal({ mode: "closed" })}
                  disabled={isPending}
                  className="px-4 py-2 text-sm text-[var(--color-earth-700)] hover:bg-[var(--color-earth-100)] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium bg-[var(--color-leaf-700)] text-white rounded-lg hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : modal.mode === "edit" ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[var(--color-earth-700)] mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.15)] bg-white text-[var(--color-leaf-900)] focus:outline-none focus:border-[var(--color-leaf-500)] ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.15)] bg-white text-[var(--color-leaf-900)] focus:outline-none focus:border-[var(--color-leaf-500)] ${props.className ?? ""}`}
    />
  );
}
