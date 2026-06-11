"use client";

import { useState, useTransition } from "react";
import { createCoupon, updateCoupon } from "./actions";

type Initial = {
  id?: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_cop: number;
  max_discount_cop: number | null;
  max_total_uses: number | null;
  max_uses_per_customer: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  // Input datetime-local quiere "YYYY-MM-DDTHH:MM" sin timezone.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CouponForm({ initial }: { initial: Initial }) {
  const [discountType, setDiscountType] = useState(initial.discount_type);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = initial.id
        ? await updateCoupon(initial.id, formData)
        : await createCoupon(formData);
      // Si la acción redirigió, no llega aquí. Si retornó error, mostramos.
      if (res && "ok" in res && !res.ok) setError(res.error);
    });
  }

  const valueLabel =
    discountType === "percentage" ? "Porcentaje (1-100)" : "Monto fijo (COP)";
  const valueStep = discountType === "percentage" ? 1 : 1000;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Código"
          hint="Lo que el cliente tipea en checkout. Lo guardamos en MAYÚSCULAS."
        >
          <input
            type="text"
            name="code"
            required
            defaultValue={initial.code}
            placeholder="BIENVENIDA10"
            className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm font-mono uppercase focus:outline-none focus:border-[var(--color-iris-700)]"
          />
        </Field>

        <Field
          label="Descripción interna"
          hint="No la ve el cliente — sirve para que el equipo recuerde qué hace el cupón."
        >
          <input
            type="text"
            name="description"
            required
            defaultValue={initial.description}
            placeholder="Bienvenida primera compra"
            className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm focus:outline-none focus:border-[var(--color-iris-700)]"
          />
        </Field>

        <Field label="Tipo de descuento">
          <select
            name="discount_type"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as Initial["discount_type"])}
            className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm bg-white focus:outline-none focus:border-[var(--color-iris-700)]"
          >
            <option value="percentage">Porcentaje</option>
            <option value="fixed">Monto fijo</option>
          </select>
        </Field>

        <Field label={valueLabel}>
          <input
            type="number"
            name="discount_value"
            required
            min={1}
            max={discountType === "percentage" ? 100 : undefined}
            step={valueStep}
            defaultValue={initial.discount_value}
            className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm font-mono focus:outline-none focus:border-[var(--color-iris-700)]"
          />
        </Field>

        {discountType === "percentage" && (
          <Field
            label="Tope de descuento (COP, opcional)"
            hint="El descuento porcentual no excederá este monto, aunque la compra sea grande."
          >
            <input
              type="number"
              name="max_discount_cop"
              min={0}
              step={1000}
              defaultValue={initial.max_discount_cop ?? ""}
              placeholder="Sin tope"
              className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm font-mono focus:outline-none focus:border-[var(--color-iris-700)]"
            />
          </Field>
        )}

        <Field
          label="Compra mínima (COP)"
          hint="0 si no hay mínimo."
        >
          <input
            type="number"
            name="min_order_cop"
            min={0}
            step={1000}
            defaultValue={initial.min_order_cop}
            className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm font-mono focus:outline-none focus:border-[var(--color-iris-700)]"
          />
        </Field>

        <Field
          label="Usos totales (opcional)"
          hint="Tope global de canjes para todos los clientes. Vacío = ilimitado."
        >
          <input
            type="number"
            name="max_total_uses"
            min={1}
            step={1}
            defaultValue={initial.max_total_uses ?? ""}
            placeholder="Sin tope"
            className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm font-mono focus:outline-none focus:border-[var(--color-iris-700)]"
          />
        </Field>

        <Field
          label="Usos por cliente"
          hint="Cuántas veces el mismo email puede usar este cupón. Default 1."
        >
          <input
            type="number"
            name="max_uses_per_customer"
            min={1}
            step={1}
            required
            defaultValue={initial.max_uses_per_customer}
            className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm font-mono focus:outline-none focus:border-[var(--color-iris-700)]"
          />
        </Field>

        <Field
          label="Activo desde (opcional)"
          hint="Vacío = activo desde ya."
        >
          <input
            type="datetime-local"
            name="starts_at"
            defaultValue={toLocalDateTime(initial.starts_at)}
            className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm focus:outline-none focus:border-[var(--color-iris-700)]"
          />
        </Field>

        <Field
          label="Expira (opcional)"
          hint="Vacío = no expira."
        >
          <input
            type="datetime-local"
            name="expires_at"
            defaultValue={toLocalDateTime(initial.expires_at)}
            className="w-full px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] text-sm focus:outline-none focus:border-[var(--color-iris-700)]"
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-earth-100)] cursor-pointer hover:bg-[var(--color-earth-50)]/40">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={initial.is_active}
          className="w-4 h-4 accent-[var(--color-leaf-700)]"
        />
        <div>
          <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
            Activo
          </p>
          <p className="text-xs text-[var(--color-earth-700)] m-0">
            Solo los cupones activos se pueden canjear. Esto se respeta
            independiente de las fechas de inicio/fin.
          </p>
        </div>
      </label>

      {error && (
        <p className="text-[#B23A1F] text-xs m-0 p-2 bg-[#FCE9E5] rounded-lg">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
        >
          {pending
            ? initial.id
              ? "Guardando…"
              : "Creando…"
            : initial.id
              ? "Guardar cambios"
              : "Crear cupón"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-leaf-900)] mb-1">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] text-[var(--color-earth-500)] mt-1 m-0">
          {hint}
        </p>
      )}
    </div>
  );
}
