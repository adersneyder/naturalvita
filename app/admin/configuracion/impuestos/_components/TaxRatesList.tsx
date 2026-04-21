"use client";

import { useState, useTransition } from "react";
import { createTaxRate, updateTaxRate, setDefaultTaxRate } from "../actions";

export type TaxRateRow = {
  id: string;
  code: string;
  name: string;
  rate_percent: number;
  tax_type: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  products_count: number;
};

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; tax: TaxRateRow };

const TYPE_LABELS: Record<string, string> = {
  included: "Se cobra IVA",
  excluded: "Excluido del impuesto",
  exempt: "Exento (tarifa 0%)",
  zero_rated: "Tarifa cero (exportación)",
};

const TYPE_EXPLAIN: Record<string, string> = {
  included:
    "Se cobra IVA al cliente. El precio público = precio base + IVA. Aparece discriminado en factura.",
  excluded:
    "No es objeto del impuesto. No aparece línea de IVA en la factura. Típico de suplementos dietarios.",
  exempt:
    "Sujeto pero con tarifa 0%. Aparece como 'IVA 0%' en factura. Medicamentos con INVIMA.",
  zero_rated: "Productos exportados u otros casos especiales. Tarifa 0%.",
};

export default function TaxRatesList({ taxRates }: { taxRates: TaxRateRow[] }) {
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setError(null);
    setModal({ mode: "create" });
  }

  function openEdit(tax: TaxRateRow) {
    setError(null);
    setModal({ mode: "edit", tax });
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
          ? await updateTaxRate(modal.tax.id, formData)
          : modal.mode === "create"
            ? await createTaxRate(formData)
            : { success: false, error: "Modo inválido" };

      if (!result.success) {
        setError(result.error ?? "Error desconocido");
        return;
      }
      closeModal();
    });
  }

  function handleSetDefault(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await setDefaultTaxRate(id);
      if (!result.success) setError(result.error ?? "Error");
    });
  }

  return (
    <>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Tarifas de impuesto
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
            {taxRates.length} tarifa{taxRates.length === 1 ? "" : "s"} · la marcada como
            predeterminada se asigna automáticamente a productos nuevos
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[var(--color-leaf-700)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--color-leaf-900)] transition-colors"
        >
          + Nueva tarifa
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        {taxRates.map((tax) => (
          <div
            key={tax.id}
            className={`px-5 py-4 border-b border-[#F0E9DB] last:border-b-0 ${
              isPending ? "opacity-70" : ""
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
                    {tax.name}
                  </p>
                  <span className="font-mono text-xs text-[var(--color-earth-500)]">
                    {tax.code}
                  </span>
                  {tax.is_default && (
                    <span className="text-[10px] font-medium bg-[var(--color-leaf-100)] text-[var(--color-leaf-900)] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Predeterminada
                    </span>
                  )}
                  {!tax.is_active && (
                    <span className="text-[10px] font-medium bg-[#F0E9DB] text-[var(--color-earth-700)] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Inactiva
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--color-earth-700)] mb-1">
                  <span className="font-mono text-sm text-[var(--color-leaf-700)] font-medium">
                    {tax.rate_percent}%
                  </span>
                  <span>·</span>
                  <span>{TYPE_LABELS[tax.tax_type] ?? tax.tax_type}</span>
                  <span>·</span>
                  <span>
                    {tax.products_count} producto{tax.products_count === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-earth-500)] m-0">
                  {tax.description ?? TYPE_EXPLAIN[tax.tax_type]}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {!tax.is_default && tax.is_active && (
                  <button
                    onClick={() => handleSetDefault(tax.id)}
                    className="text-xs text-[var(--color-leaf-700)] hover:text-[var(--color-leaf-900)] px-2 py-1"
                    disabled={isPending}
                  >
                    Hacer predeterminada
                  </button>
                )}
                <button
                  onClick={() => openEdit(tax)}
                  className="text-xs text-[var(--color-leaf-700)] hover:text-[var(--color-leaf-900)] px-2 py-1"
                  disabled={isPending}
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 bg-[var(--color-leaf-100)] rounded-xl p-4 text-xs text-[var(--color-leaf-900)]">
        <p className="font-medium m-0 mb-1">Acerca de las tarifas</p>
        <p className="m-0 text-[var(--color-earth-700)]">
          El porcentaje y código no se pueden editar después de creados para preservar la
          integridad de productos existentes. Si necesitas cambiar una tarifa, créa una nueva
          y reasigna los productos.
        </p>
      </div>

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
              {modal.mode === "create" ? "Nueva tarifa" : `Editar: ${modal.tax.name}`}
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
                defaultValue={modal.mode === "edit" ? modal.tax.name : ""}
                placeholder="ej. IVA 19%"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3 focus:outline-none focus:border-[var(--color-leaf-500)]"
                autoFocus
              />

              {modal.mode === "create" ? (
                <>
                  <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                    Porcentaje *
                  </label>
                  <input
                    name="rate_percent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    placeholder="19"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3 focus:outline-none focus:border-[var(--color-leaf-500)]"
                  />

                  <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                    Tipo de tarifa *
                  </label>
                  <select
                    name="tax_type"
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3 focus:outline-none focus:border-[var(--color-leaf-500)] bg-white"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Selecciona un tipo...
                    </option>
                    <option value="included">Se cobra IVA (incluido)</option>
                    <option value="excluded">Excluido del impuesto</option>
                    <option value="exempt">Exento (tarifa 0%)</option>
                    <option value="zero_rated">Tarifa cero</option>
                  </select>
                </>
              ) : (
                <div className="mb-3 p-3 bg-[var(--color-earth-50)] rounded-lg text-xs text-[var(--color-earth-700)]">
                  <span className="font-medium">{modal.tax.rate_percent}%</span>{" "}
                  {TYPE_LABELS[modal.tax.tax_type]}
                  <p className="m-0 mt-1 text-[var(--color-earth-500)]">
                    El porcentaje y tipo no se pueden editar
                  </p>
                </div>
              )}

              <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                Descripción (opcional)
              </label>
              <textarea
                name="description"
                rows={2}
                maxLength={200}
                defaultValue={modal.mode === "edit" ? (modal.tax.description ?? "") : ""}
                placeholder="Cuándo aplica esta tarifa..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3 focus:outline-none focus:border-[var(--color-leaf-500)] resize-none"
              />

              {modal.mode === "edit" && (
                <label className="flex items-center gap-2 text-sm text-[var(--color-leaf-900)] mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    value="true"
                    defaultChecked={modal.tax.is_active}
                    className="w-4 h-4"
                  />
                  Tarifa activa (disponible para asignar a productos)
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
                  {isPending ? "Guardando..." : modal.mode === "create" ? "Crear" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
