"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createPresentationType,
  updatePresentationType,
  deletePresentationType,
} from "../actions";

export type PresentationRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  default_unit: string;
  unit_family: string;
  sort_order: number;
  is_active: boolean;
  products_count: number;
};

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; row: PresentationRow };

const FAMILY_LABELS: Record<string, string> = {
  weight: "Peso (g, kg, oz, lb)",
  volume: "Volumen (ml, l, fl_oz)",
  units: "Unidades (cápsulas, tabletas)",
  other: "Otro",
};

export default function PresentationsList({ rows }: { rows: PresentationRow[] }) {
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
          ? await updatePresentationType(modal.row.id, formData)
          : await createPresentationType(formData);

      if (!result.success) {
        setError(result.error ?? "Error desconocido");
        return;
      }
      setModal({ mode: "closed" });
    });
  }

  function handleDelete(row: PresentationRow) {
    if (!confirm(`¿Eliminar la presentación "${row.name}"?`)) return;
    startTransition(async () => {
      const result = await deletePresentationType(row.id, row.code);
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
            Tipos de presentación
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
            Cómo se presenta físicamente el producto: cápsulas, polvo, gotas, etc.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setModal({ mode: "create" });
          }}
          className="bg-[var(--color-leaf-700)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--color-leaf-900)]"
        >
          + Nuevo tipo
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_140px_100px_100px_120px] gap-3 px-5 py-3 bg-[var(--color-earth-50)] text-[11px] uppercase tracking-wider font-medium text-[var(--color-earth-700)]">
          <span>Nombre</span>
          <span>Código</span>
          <span>Familia</span>
          <span>Productos</span>
          <span>Estado</span>
          <span></span>
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--color-earth-700)]">
            No hay tipos de presentación.
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_120px_140px_100px_100px_120px] gap-3 px-5 py-3 items-center border-b border-[#F0E9DB] last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">{row.name}</p>
                {row.description && (
                  <p className="text-[11px] text-[var(--color-earth-700)] m-0 mt-0.5">
                    {row.description}
                  </p>
                )}
              </div>
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
                {row.is_active ? "Activo" : "Inactivo"}
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
              {modal.mode === "create" ? "Nuevo tipo de presentación" : `Editar: ${modal.row.name}`}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              {modal.mode === "create" ? (
                <Field label="Código (único, en inglés sin espacios) *">
                  <Input
                    name="code"
                    required
                    placeholder="powder, capsules, drops..."
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

              <Field label="Nombre visible *">
                <Input
                  name="name"
                  required
                  defaultValue={modal.mode === "edit" ? modal.row.name : ""}
                  placeholder="Cápsulas, Polvo, Gotas"
                />
              </Field>

              <Field label="Descripción">
                <Textarea
                  name="description"
                  rows={2}
                  defaultValue={modal.mode === "edit" ? (modal.row.description ?? "") : ""}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
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
                <Field label="Unidad por defecto">
                  <Input
                    name="default_unit"
                    defaultValue={modal.mode === "edit" ? modal.row.default_unit : "units"}
                    placeholder="g, ml, units"
                    className="font-mono text-xs"
                  />
                </Field>
              </div>

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
                    Activo
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

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.15)] bg-white text-[var(--color-leaf-900)] focus:outline-none focus:border-[var(--color-leaf-500)] resize-vertical ${props.className ?? ""}`}
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
