"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createLaboratory, updateLaboratory, deleteLaboratory } from "../actions";

export type LaboratoryRow = {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  scrape_url: string | null;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  products_count: number;
  sources_count: number;
};

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; row: LaboratoryRow };

export default function LaboratoriesList({
  rows,
  canDelete,
}: {
  rows: LaboratoryRow[];
  canDelete: boolean;
}) {
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
          ? await updateLaboratory(modal.row.id, formData)
          : await createLaboratory(formData);

      if (!result.success) {
        setError(result.error ?? "Error desconocido");
        return;
      }
      setModal({ mode: "closed" });
    });
  }

  function handleDelete(row: LaboratoryRow) {
    if (!confirm(`¿Eliminar el laboratorio "${row.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteLaboratory(row.id);
      if (!result.success) alert(result.error ?? "Error al eliminar");
    });
  }

  const blocked = (row: LaboratoryRow) => row.products_count > 0 || row.sources_count > 0;

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
            Laboratorios
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
            Proveedores de los productos. Cada laboratorio puede tener múltiples fuentes de datos.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setModal({ mode: "create" });
          }}
          className="bg-[var(--color-leaf-700)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--color-leaf-900)]"
        >
          + Nuevo laboratorio
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_100px_100px_100px_120px] gap-3 px-5 py-3 bg-[var(--color-earth-50)] text-[11px] uppercase tracking-wider font-medium text-[var(--color-earth-700)]">
          <span>Laboratorio</span>
          <span>Slug</span>
          <span>Productos</span>
          <span>Fuentes</span>
          <span>Estado</span>
          <span></span>
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--color-earth-700)]">
            No hay laboratorios. Crea el primero para empezar a importar productos.
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_140px_100px_100px_100px_120px] gap-3 px-5 py-3 items-center border-b border-[#F0E9DB] last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0 truncate">
                  {row.name}
                </p>
                {row.website_url && (
                  <a
                    href={row.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-[var(--color-earth-700)] hover:text-[var(--color-leaf-700)] m-0 truncate block"
                  >
                    {row.website_url.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
              <span className="text-[11px] text-[var(--color-earth-700)] font-mono truncate">
                {row.slug}
              </span>
              <span className="text-xs text-[var(--color-leaf-900)]">{row.products_count}</span>
              <span className="text-xs text-[var(--color-leaf-900)]">{row.sources_count}</span>
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
                {canDelete && (
                  <button
                    onClick={() => handleDelete(row)}
                    disabled={isPending || blocked(row)}
                    className="text-[11px] text-red-700 hover:text-red-900 disabled:text-[var(--color-earth-500)] disabled:cursor-not-allowed"
                    title={blocked(row) ? "Tiene productos o fuentes asociadas" : "Eliminar"}
                  >
                    Eliminar
                  </button>
                )}
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
            className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-medium text-[var(--color-leaf-900)] m-0 mb-4">
              {modal.mode === "create" ? "Nuevo laboratorio" : `Editar: ${modal.row.name}`}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Nombre *">
                <Input
                  name="name"
                  required
                  defaultValue={modal.mode === "edit" ? modal.row.name : ""}
                  placeholder="Sistema Natural"
                  autoFocus
                />
              </Field>

              <Field label="Slug URL (auto si lo dejas vacío)">
                <Input
                  name="slug"
                  defaultValue={modal.mode === "edit" ? modal.row.slug : ""}
                  placeholder="sistema-natural"
                  className="font-mono text-xs"
                />
              </Field>

              <Field label="Website (URL pública)">
                <Input
                  name="website_url"
                  type="url"
                  defaultValue={modal.mode === "edit" ? (modal.row.website_url ?? "") : ""}
                  placeholder="https://sistemanatural.com"
                />
              </Field>

              <Field label="URL de catálogo (para scraping)">
                <Input
                  name="scrape_url"
                  type="url"
                  defaultValue={modal.mode === "edit" ? (modal.row.scrape_url ?? "") : ""}
                  placeholder="https://sistemanatural.com/tienda"
                />
              </Field>

              <Field label="URL del logo">
                <Input
                  name="logo_url"
                  type="url"
                  defaultValue={modal.mode === "edit" ? (modal.row.logo_url ?? "") : ""}
                  placeholder="https://..."
                />
              </Field>

              <Field label="Descripción">
                <Textarea
                  name="description"
                  rows={2}
                  defaultValue={modal.mode === "edit" ? (modal.row.description ?? "") : ""}
                  placeholder="Notas internas sobre el laboratorio"
                />
              </Field>

              <div className="flex items-center pb-1">
                <label className="flex items-center gap-2 text-xs text-[var(--color-leaf-900)] cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    value="true"
                    defaultChecked={modal.mode === "edit" ? modal.row.is_active : true}
                    className="w-3.5 h-3.5"
                  />
                  Activo (sus productos pueden venderse)
                </label>
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
                  {isPending
                    ? "Guardando..."
                    : modal.mode === "edit"
                      ? "Guardar"
                      : "Crear laboratorio"}
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
