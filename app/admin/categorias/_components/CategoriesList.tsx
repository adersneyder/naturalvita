"use client";

import { useState, useTransition } from "react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "../actions";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  parent_name: string | null;
  suggested_tax_rate_id: string | null;
  suggested_tax_rate_name: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
};

export type TaxRateOption = {
  id: string;
  code: string;
  name: string;
};

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; category: CategoryRow };

type ConfirmState =
  | { open: false }
  | { open: true; category: CategoryRow };

export default function CategoriesList({
  categories,
  taxRates,
  canDelete,
}: {
  categories: CategoryRow[];
  taxRates: TaxRateOption[];
  canDelete: boolean;
}) {
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Estado local para drag & drop (optimista)
  const [items, setItems] = useState(categories);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Mantener items sincronizado con props cuando cambien
  if (items.length !== categories.length || items.some((it, i) => it.id !== categories[i]?.id)) {
    // Solo re-sync si la lista cambió (creado/eliminado); reordenamiento lo maneja el estado local
  }

  const parentCandidates = items.filter((c) => c.parent_id === null);

  function openCreate() {
    setError(null);
    setModal({ mode: "create" });
  }

  function openEdit(category: CategoryRow) {
    setError(null);
    setModal({ mode: "edit", category });
  }

  function closeModal() {
    setModal({ mode: "closed" });
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      const result =
        modal.mode === "edit"
          ? await updateCategory(modal.category.id, formData)
          : modal.mode === "create"
            ? await createCategory(formData)
            : { success: false, error: "Modo inválido" };

      if (!result.success) {
        setError(result.error ?? "Error desconocido");
        return;
      }
      closeModal();
    });
  }

  function handleDelete(category: CategoryRow) {
    setConfirm({ open: true, category });
  }

  function executeDelete() {
    if (!confirm.open) return;
    const cat = confirm.category;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(cat.id);
      if (!result.success) {
        setError(result.error ?? "Error al eliminar");
      }
      setConfirm({ open: false });
    });
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;

    const reordered = [...items];
    const fromIdx = reordered.findIndex((c) => c.id === draggedId);
    const toIdx = reordered.findIndex((c) => c.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setItems(reordered);
    setDraggedId(null);

    // Persistir el nuevo orden
    startTransition(async () => {
      const result = await reorderCategories(reordered.map((c) => c.id));
      if (!result.success) {
        setError(result.error ?? "Error al reordenar");
        setItems(categories);
      }
    });
  }

  return (
    <>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Categorías
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
            {items.length} categoría{items.length === 1 ? "" : "s"} · arrastra para reordenar
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[var(--color-leaf-700)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--color-leaf-900)] transition-colors"
        >
          + Nueva categoría
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_200px_130px_100px_auto] gap-3 px-5 py-3 bg-[var(--color-earth-50)] text-[11px] uppercase tracking-wider font-medium text-[var(--color-earth-700)]">
          <span></span>
          <span>Nombre</span>
          <span>Tarifa IVA sugerida</span>
          <span>Productos</span>
          <span>Estado</span>
          <span></span>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--color-earth-700)]">
            No hay categorías aún.{" "}
            <button onClick={openCreate} className="text-[var(--color-leaf-700)] underline">
              Crea la primera
            </button>
          </div>
        ) : (
          items.map((category) => (
            <div
              key={category.id}
              draggable
              onDragStart={() => handleDragStart(category.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(category.id)}
              className={`grid grid-cols-[auto_1fr_200px_130px_100px_auto] gap-3 px-5 py-3 items-center border-b border-[#F0E9DB] last:border-b-0 transition-colors ${
                draggedId === category.id ? "opacity-50" : ""
              } ${isPending ? "opacity-70" : ""} hover:bg-[var(--color-earth-50)]`}
            >
              <span className="cursor-grab text-[var(--color-earth-500)] select-none text-lg">⋮⋮</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0 truncate">
                  {category.parent_name && (
                    <span className="text-[var(--color-earth-500)] text-xs mr-1">
                      {category.parent_name} /
                    </span>
                  )}
                  {category.name}
                </p>
                <p className="text-[11px] text-[var(--color-earth-500)] m-0 font-mono truncate">
                  /{category.slug}
                </p>
              </div>
              <span className="text-xs text-[var(--color-earth-700)]">
                {category.suggested_tax_rate_name ?? (
                  <span className="italic text-[var(--color-earth-500)]">sin sugerencia</span>
                )}
              </span>
              <span className="text-xs text-[var(--color-earth-700)]">
                {category.product_count} producto{category.product_count === 1 ? "" : "s"}
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-lg font-medium w-fit ${
                  category.is_active
                    ? "bg-[var(--color-leaf-100)] text-[var(--color-leaf-900)]"
                    : "bg-[#F0E9DB] text-[var(--color-earth-700)]"
                }`}
              >
                {category.is_active ? "Activa" : "Inactiva"}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => openEdit(category)}
                  className="text-xs text-[var(--color-leaf-700)] hover:text-[var(--color-leaf-900)] px-2 py-1 rounded"
                  disabled={isPending}
                >
                  Editar
                </button>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(category)}
                    className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded"
                    disabled={isPending}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de crear/editar */}
      {modal.mode !== "closed" && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-medium text-[var(--color-leaf-900)] m-0 mb-4">
              {modal.mode === "create" ? "Nueva categoría" : `Editar: ${modal.category.name}`}
            </h2>

            <form onSubmit={handleSubmit}>
              <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                Nombre *
              </label>
              <input
                name="name"
                type="text"
                required
                maxLength={80}
                defaultValue={modal.mode === "edit" ? modal.category.name : ""}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3 focus:outline-none focus:border-[var(--color-leaf-500)]"
                autoFocus
              />

              <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                Descripción (opcional)
              </label>
              <textarea
                name="description"
                rows={2}
                maxLength={200}
                defaultValue={modal.mode === "edit" ? (modal.category.description ?? "") : ""}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3 focus:outline-none focus:border-[var(--color-leaf-500)] resize-none"
              />

              <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                Categoría padre (para subcategorías)
              </label>
              <select
                name="parent_id"
                defaultValue={modal.mode === "edit" ? (modal.category.parent_id ?? "") : ""}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3 focus:outline-none focus:border-[var(--color-leaf-500)] bg-white"
              >
                <option value="">— Ninguna (categoría principal) —</option>
                {parentCandidates
                  .filter((c) => modal.mode !== "edit" || c.id !== modal.category.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>

              <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                Tarifa IVA sugerida
              </label>
              <select
                name="suggested_tax_rate_id"
                defaultValue={
                  modal.mode === "edit" ? (modal.category.suggested_tax_rate_id ?? "") : ""
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3 focus:outline-none focus:border-[var(--color-leaf-500)] bg-white"
              >
                <option value="">— Sin sugerencia —</option>
                {taxRates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--color-earth-500)] -mt-2 mb-3">
                Se asigna automáticamente a nuevos productos en esta categoría
              </p>

              {modal.mode === "edit" && (
                <label className="flex items-center gap-2 text-sm text-[var(--color-leaf-900)] mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    value="true"
                    defaultChecked={modal.category.is_active}
                    className="w-4 h-4"
                  />
                  Categoría activa (visible en catálogo público)
                </label>
              )}

              {error && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end mt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-[var(--color-earth-700)] hover:bg-[var(--color-earth-100)] rounded-lg"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium bg-[var(--color-leaf-700)] text-white rounded-lg hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : modal.mode === "create" ? "Crear" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {confirm.open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setConfirm({ open: false })}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-base font-medium text-[var(--color-leaf-900)] m-0 mb-2">
              ¿Eliminar categoría?
            </h3>
            <p className="text-sm text-[var(--color-earth-700)] mb-4">
              Esta acción eliminará <strong>{confirm.category.name}</strong> permanentemente. No se puede
              deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirm({ open: false })}
                className="px-4 py-2 text-sm text-[var(--color-earth-700)] hover:bg-[var(--color-earth-100)] rounded-lg"
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
