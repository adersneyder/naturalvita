"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createCollection, updateCollection, deleteCollection } from "../actions";

export type CollectionRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  meta_title: string | null;
  meta_description: string | null;
  products_count: number;
};

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; row: CollectionRow };

export default function CollectionsList({
  rows,
  canDelete,
}: {
  rows: CollectionRow[];
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
          ? await updateCollection(modal.row.id, formData)
          : await createCollection(formData);

      if (!result.success) {
        setError(result.error ?? "Error desconocido");
        return;
      }
      setModal({ mode: "closed" });
    });
  }

  function handleDelete(row: CollectionRow) {
    if (!confirm(`¿Eliminar la colección "${row.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCollection(row.id);
      if (!result.success) {
        alert(result.error ?? "Error al eliminar");
      }
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
            Colecciones
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
            Agrupaciones temáticas para marketing y SEO. Un producto puede estar en varias.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setModal({ mode: "create" });
          }}
          className="bg-[var(--color-leaf-700)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--color-leaf-900)] transition-colors"
        >
          + Nueva colección
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_100px_100px_120px] gap-3 px-5 py-3 bg-[var(--color-earth-50)] text-[11px] uppercase tracking-wider font-medium text-[var(--color-earth-700)]">
          <span>Colección</span>
          <span>Slug</span>
          <span>Productos</span>
          <span>Estado</span>
          <span></span>
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--color-earth-700)]">
            No hay colecciones. Crea la primera para empezar a agrupar productos.
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_120px_100px_100px_120px] gap-3 px-5 py-3 items-center border-b border-[#F0E9DB] last:border-b-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0 truncate">
                    {row.name}
                  </p>
                  {row.is_featured && (
                    <span className="text-[9px] font-medium bg-[var(--color-leaf-100)] text-[var(--color-leaf-900)] px-1.5 py-0.5 rounded uppercase">
                      Destacada
                    </span>
                  )}
                </div>
                {row.description && (
                  <p className="text-[11px] text-[var(--color-earth-700)] mt-0.5 m-0 truncate">
                    {row.description}
                  </p>
                )}
              </div>
              <span className="text-[11px] text-[var(--color-earth-700)] font-mono truncate">
                {row.slug}
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
              <div className="flex gap-2 justify-end">
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
                    disabled={isPending || row.products_count > 0}
                    className="text-[11px] text-red-700 hover:text-red-900 disabled:text-[var(--color-earth-500)] disabled:cursor-not-allowed"
                    title={
                      row.products_count > 0
                        ? "Tiene productos asociados, primero quítalos"
                        : "Eliminar"
                    }
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
              {modal.mode === "create" ? "Nueva colección" : `Editar: ${modal.row.name}`}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Nombre *" required>
                <Input
                  name="name"
                  required
                  defaultValue={modal.mode === "edit" ? modal.row.name : ""}
                  placeholder="ej. Más vendidos"
                  autoFocus
                />
              </Field>

              <Field label="Slug URL (auto si lo dejas vacío)">
                <Input
                  name="slug"
                  defaultValue={modal.mode === "edit" ? modal.row.slug : ""}
                  placeholder="mas-vendidos"
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-[var(--color-earth-500)] mt-1 m-0">
                  Aparecerá en /tienda/coleccion/[slug]
                </p>
              </Field>

              <Field label="Descripción">
                <Textarea
                  name="description"
                  rows={2}
                  defaultValue={modal.mode === "edit" ? (modal.row.description ?? "") : ""}
                  placeholder="Descripción corta para mostrar en la página de la colección"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Orden de aparición">
                  <Input
                    name="sort_order"
                    type="number"
                    min="0"
                    defaultValue={modal.mode === "edit" ? modal.row.sort_order : 99}
                  />
                </Field>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-xs text-[var(--color-leaf-900)] cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_featured"
                      value="true"
                      defaultChecked={modal.mode === "edit" ? modal.row.is_featured : false}
                      className="w-3.5 h-3.5"
                    />
                    Destacada en home
                  </label>
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

              <div className="border-t border-[#F0E9DB] pt-3">
                <p className="text-[11px] uppercase tracking-wider font-medium text-[var(--color-earth-700)] mb-2">
                  SEO
                </p>
                <Field label="Meta title (60 caracteres)">
                  <Input
                    name="meta_title"
                    maxLength={60}
                    defaultValue={modal.mode === "edit" ? (modal.row.meta_title ?? "") : ""}
                    placeholder="Más vendidos | NaturalVita"
                  />
                </Field>
                <Field label="Meta description (160 caracteres)">
                  <Textarea
                    name="meta_description"
                    rows={2}
                    maxLength={160}
                    defaultValue={
                      modal.mode === "edit" ? (modal.row.meta_description ?? "") : ""
                    }
                    placeholder="Los productos más comprados por nuestros clientes..."
                  />
                </Field>
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
                      ? "Guardar cambios"
                      : "Crear colección"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[var(--color-earth-700)] mb-1">
        {label}
        {required && " "}
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
