"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createAttribute,
  updateAttribute,
  deleteAttribute,
  createAttributeOption,
  deleteAttributeOption,
} from "../actions";

export type AttributeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  attribute_type: string;
  is_filterable: boolean;
  show_in_card: boolean;
  sort_order: number;
  is_active: boolean;
  products_count: number;
  options: Array<{ id: string; value: string; slug: string; sort_order: number }>;
};

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; row: AttributeRow };

const TYPE_LABELS: Record<string, string> = {
  boolean: "Sí / No (booleano)",
  select: "Selección única",
  multi_select: "Selección múltiple",
  text: "Texto libre",
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  boolean: "Checkbox simple. Ej: Vegano, Sin gluten.",
  select: "Lista desplegable, una opción. Ej: Sabor (Vainilla, Chocolate).",
  multi_select: "Múltiples opciones. Ej: Apto para (Niños, Adultos, Mayores).",
  text: "Campo de texto libre. Ej: Notas adicionales.",
};

export default function AttributesList({
  rows,
  canDelete,
}: {
  rows: AttributeRow[];
  canDelete: boolean;
}) {
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [optionInput, setOptionInput] = useState<Record<string, string>>({});
  const [expandedAttr, setExpandedAttr] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result =
        modal.mode === "edit"
          ? await updateAttribute(modal.row.id, formData)
          : await createAttribute(formData);

      if (!result.success) {
        setError(result.error ?? "Error desconocido");
        return;
      }
      setModal({ mode: "closed" });
    });
  }

  function handleDelete(row: AttributeRow) {
    if (!confirm(`¿Eliminar el atributo "${row.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteAttribute(row.id);
      if (!result.success) alert(result.error ?? "Error");
    });
  }

  function handleAddOption(attrId: string) {
    const val = (optionInput[attrId] ?? "").trim();
    if (!val) return;
    startTransition(async () => {
      const result = await createAttributeOption(attrId, val);
      if (!result.success) {
        alert(result.error ?? "Error");
      } else {
        setOptionInput((prev) => ({ ...prev, [attrId]: "" }));
      }
    });
  }

  function handleDeleteOption(optionId: string) {
    if (!confirm("¿Eliminar esta opción?")) return;
    startTransition(async () => {
      const result = await deleteAttributeOption(optionId);
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
            Atributos
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
            Características objetivas para que el cliente filtre productos en el catálogo.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setModal({ mode: "create" });
          }}
          className="bg-[var(--color-leaf-700)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--color-leaf-900)]"
        >
          + Nuevo atributo
        </button>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] py-10 text-center text-sm text-[var(--color-earth-700)]">
            No hay atributos. Crea el primero para empezar a etiquetar productos.
          </div>
        ) : (
          rows.map((row) => {
            const isExpanded = expandedAttr === row.id;
            const needsOptions =
              row.attribute_type === "select" || row.attribute_type === "multi_select";

            return (
              <div
                key={row.id}
                className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden"
              >
                <div className="grid grid-cols-[1fr_140px_100px_100px_180px] gap-3 px-5 py-3 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0 truncate">
                        {row.name}
                      </p>
                      {!row.is_active && (
                        <span className="text-[9px] font-medium bg-[#F0E9DB] text-[var(--color-earth-700)] px-1.5 py-0.5 rounded uppercase">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-earth-500)] m-0 font-mono truncate">
                      {row.slug}
                    </p>
                  </div>
                  <span className="text-[11px] text-[var(--color-earth-700)]">
                    {TYPE_LABELS[row.attribute_type] ?? row.attribute_type}
                  </span>
                  <span className="text-xs text-[var(--color-leaf-900)]">
                    {row.products_count}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {row.is_filterable && (
                      <span className="text-[10px] text-[var(--color-leaf-700)]">
                        ✓ Filtrable
                      </span>
                    )}
                    {row.show_in_card && (
                      <span className="text-[10px] text-[var(--color-leaf-700)]">
                        ✓ Mostrar en tarjeta
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 justify-end">
                    {needsOptions && (
                      <button
                        onClick={() => setExpandedAttr(isExpanded ? null : row.id)}
                        className="text-[11px] text-[var(--color-leaf-700)] hover:text-[var(--color-leaf-900)]"
                      >
                        Opciones ({row.options.length})
                      </button>
                    )}
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
                            ? "Tiene productos asociados"
                            : "Eliminar"
                        }
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && needsOptions && (
                  <div className="border-t border-[#F0E9DB] px-5 py-3 bg-[var(--color-earth-50)]">
                    <p className="text-[11px] uppercase tracking-wider font-medium text-[var(--color-earth-700)] mb-2">
                      Opciones disponibles
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {row.options.length === 0 ? (
                        <p className="text-[11px] text-[var(--color-earth-500)] italic m-0">
                          Sin opciones aún
                        </p>
                      ) : (
                        row.options.map((opt) => (
                          <span
                            key={opt.id}
                            className="inline-flex items-center gap-1.5 bg-white text-xs px-2 py-1 rounded-full border border-[rgba(47,98,56,0.15)]"
                          >
                            {opt.value}
                            <button
                              onClick={() => handleDeleteOption(opt.id)}
                              disabled={isPending}
                              className="text-[var(--color-earth-500)] hover:text-red-700 leading-none"
                              title="Eliminar opción"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={optionInput[row.id] ?? ""}
                        onChange={(e) =>
                          setOptionInput((p) => ({ ...p, [row.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption(row.id);
                          }
                        }}
                        placeholder="Nueva opción..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[rgba(47,98,56,0.15)] bg-white"
                      />
                      <button
                        onClick={() => handleAddOption(row.id)}
                        disabled={isPending || !(optionInput[row.id] ?? "").trim()}
                        className="px-3 py-1.5 text-xs font-medium bg-[var(--color-leaf-700)] text-white rounded-lg hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
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
              {modal.mode === "create" ? "Nuevo atributo" : `Editar: ${modal.row.name}`}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Nombre *">
                <Input
                  name="name"
                  required
                  defaultValue={modal.mode === "edit" ? modal.row.name : ""}
                  placeholder="ej. Vegano, Sin gluten, Sabor"
                  autoFocus
                />
              </Field>

              <Field label="Slug URL (auto si lo dejas vacío)">
                <Input
                  name="slug"
                  defaultValue={modal.mode === "edit" ? modal.row.slug : ""}
                  placeholder="vegano, sin-gluten, sabor"
                  className="font-mono text-xs"
                />
              </Field>

              {modal.mode === "create" ? (
                <Field label="Tipo de atributo *">
                  <Select name="attribute_type" defaultValue="boolean" required>
                    {Object.entries(TYPE_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <p className="text-[10px] text-[var(--color-earth-500)] mt-1 m-0">
                    El tipo no se puede cambiar después de creado.
                  </p>
                </Field>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-[var(--color-earth-700)] mb-1">
                    Tipo (no editable)
                  </label>
                  <p className="text-xs text-[var(--color-earth-700)] bg-[var(--color-earth-50)] px-3 py-2 rounded-lg m-0">
                    {TYPE_LABELS[modal.row.attribute_type]} ·{" "}
                    {TYPE_DESCRIPTIONS[modal.row.attribute_type]}
                  </p>
                </div>
              )}

              <Field label="Descripción interna">
                <Textarea
                  name="description"
                  rows={2}
                  defaultValue={modal.mode === "edit" ? (modal.row.description ?? "") : ""}
                  placeholder="Para qué sirve este atributo (notas internas)"
                />
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
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-xs text-[var(--color-leaf-900)] cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_filterable"
                      value="true"
                      defaultChecked={modal.mode === "edit" ? modal.row.is_filterable : true}
                      className="w-3.5 h-3.5"
                    />
                    Usar como filtro en catálogo
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[var(--color-leaf-900)] cursor-pointer">
                    <input
                      type="checkbox"
                      name="show_in_card"
                      value="true"
                      defaultChecked={modal.mode === "edit" ? modal.row.show_in_card : false}
                      className="w-3.5 h-3.5"
                    />
                    Mostrar en tarjeta de producto
                  </label>
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
                  {isPending
                    ? "Guardando..."
                    : modal.mode === "edit"
                      ? "Guardar"
                      : "Crear atributo"}
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
