"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listDepartmentNames,
  citiesOfDepartment,
} from "@/lib/checkout/divipola-data";
import {
  saveAddress,
  deleteAddress,
  setDefaultAddress,
} from "./actions";

export type SavedAddressDTO = {
  id: string;
  recipient_name: string;
  phone: string;
  department: string;
  city: string;
  street: string;
  details: string | null;
  postal_code: string | null;
  label: string | null;
  is_default: boolean;
};

const OTHER_CITY = "__other__";

export default function AddressesPanel({
  addresses: initial,
}: {
  addresses: SavedAddressDTO[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(
    initial.length === 0 ? "new" : null,
  );
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta dirección? Esta acción es permanente.")) return;
    setActionError(null);
    startTransition(async () => {
      const res = await deleteAddress(id);
      if (!res.ok) setActionError(res.error);
      else router.refresh();
    });
  }

  function handleSetDefault(id: string) {
    setActionError(null);
    startTransition(async () => {
      const res = await setDefaultAddress(id);
      if (!res.ok) setActionError(res.error);
      else router.refresh();
    });
  }

  function handleSaved() {
    setEditingId(null);
    router.refresh();
  }

  return (
    <div>
      {actionError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[#FBE7E2] text-[#9A2A1F] text-sm">
          {actionError}
        </div>
      )}

      {/* Lista de direcciones */}
      {initial.length > 0 && (
        <ul className="space-y-3 mb-4">
          {initial.map((addr) => {
            const isEditing = editingId === addr.id;
            return (
              <li key={addr.id}>
                {isEditing ? (
                  <AddressForm
                    initial={addr}
                    onSaved={handleSaved}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <article
                    className={`p-4 rounded-xl border ${
                      addr.is_default
                        ? "border-[var(--color-iris-700)] bg-[#F8F6FC]"
                        : "border-[var(--color-earth-100)] bg-white"
                    }`}
                  >
                    <header className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-leaf-900)]">
                          {addr.label ?? addr.recipient_name}
                        </p>
                        {addr.label && (
                          <p className="text-[12px] text-[var(--color-earth-700)]">
                            {addr.recipient_name}
                          </p>
                        )}
                      </div>
                      {addr.is_default && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-iris-700)] text-white font-medium">
                          Predeterminada
                        </span>
                      )}
                    </header>
                    <p className="text-sm text-[var(--color-earth-700)] leading-relaxed">
                      {addr.street}
                      {addr.details ? `, ${addr.details}` : ""}
                      <br />
                      {addr.city}, {addr.department}
                      {addr.postal_code ? ` · ${addr.postal_code}` : ""}
                      <br />
                      Tel. {addr.phone}
                    </p>
                    <footer className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingId(addr.id)}
                        className="text-xs text-[var(--color-iris-700)] hover:underline"
                      >
                        Editar
                      </button>
                      {!addr.is_default && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(addr.id)}
                          disabled={isPending}
                          className="text-xs text-[var(--color-leaf-700)] hover:underline disabled:opacity-50"
                        >
                          Marcar predeterminada
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(addr.id)}
                        disabled={isPending}
                        className="text-xs text-[var(--color-earth-700)] hover:text-[#9A2A1F] hover:underline disabled:opacity-50 ml-auto"
                      >
                        Eliminar
                      </button>
                    </footer>
                  </article>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Form de nueva dirección */}
      {editingId === "new" ? (
        <AddressForm
          onSaved={handleSaved}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingId("new")}
          className="w-full p-4 rounded-xl border-2 border-dashed border-[var(--color-earth-100)] text-sm text-[var(--color-earth-700)] hover:border-[var(--color-iris-700)] hover:text-[var(--color-iris-700)] transition-colors"
        >
          + Agregar nueva dirección
        </button>
      )}
    </div>
  );
}

function AddressForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: SavedAddressDTO;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [recipientName, setRecipientName] = useState(initial?.recipient_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [cityIsOther, setCityIsOther] = useState(false);
  const [street, setStreet] = useState(initial?.street ?? "");
  const [details, setDetails] = useState(initial?.details ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postal_code ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);

  const departments = listDepartmentNames();
  const cities = department ? citiesOfDepartment(department) : [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const finalCity = cityIsOther ? city : city;
      const res = await saveAddress({
        id: initial?.id,
        recipient_name: recipientName,
        phone,
        department,
        city: finalCity,
        street,
        details: details || "",
        postal_code: postalCode || "",
        label: label || "",
        is_default: isDefault,
      });
      if (!res.ok) {
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      } else {
        onSaved();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 rounded-xl border border-[var(--color-iris-700)] bg-[#FAF8FE] space-y-3"
    >
      <h3 className="font-serif text-base text-[var(--color-leaf-900)]">
        {initial ? "Editar dirección" : "Nueva dirección"}
      </h3>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-[#FBE7E2] text-[#9A2A1F] text-xs">
          {error}
        </div>
      )}

      <FieldRow>
        <Field label="Etiqueta (opcional)" hint="Ej: Casa, Oficina">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={40}
            className={inputClass}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field
          label="Nombre de quien recibe"
          required
          error={fieldErrors.recipient_name?.[0]}
        >
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Teléfono" required error={fieldErrors.phone?.[0]}>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className={inputClass}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Departamento" required error={fieldErrors.department?.[0]}>
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setCity("");
              setCityIsOther(false);
            }}
            required
            className={inputClass}
          >
            <option value="">Selecciona</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ciudad" required error={fieldErrors.city?.[0]}>
          {cityIsOther ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Escribe la ciudad"
                required
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => {
                  setCityIsOther(false);
                  setCity("");
                }}
                className="text-[11px] text-[var(--color-earth-700)] hover:underline whitespace-nowrap px-2"
              >
                Volver
              </button>
            </div>
          ) : (
            <select
              value={city}
              onChange={(e) => {
                if (e.target.value === OTHER_CITY) {
                  setCityIsOther(true);
                  setCity("");
                } else {
                  setCity(e.target.value);
                }
              }}
              required
              disabled={!department}
              className={inputClass}
            >
              <option value="">Selecciona</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={OTHER_CITY}>Otra…</option>
            </select>
          )}
        </Field>
      </FieldRow>

      <Field label="Dirección" required error={fieldErrors.street?.[0]}>
        <input
          type="text"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="Calle, carrera y número"
          required
          className={inputClass}
        />
      </Field>

      <FieldRow>
        <Field label="Detalles (opcional)" hint="Apartamento, piso, conjunto">
          <input
            type="text"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Código postal (opcional)" error={fieldErrors.postal_code?.[0]}>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            maxLength={6}
            className={inputClass}
          />
        </Field>
      </FieldRow>

      <label className="flex items-center gap-2 text-sm text-[var(--color-earth-700)]">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded border-[var(--color-earth-100)]"
        />
        Marcar como predeterminada
      </label>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] disabled:opacity-50"
        >
          {isPending ? "Guardando…" : initial ? "Guardar cambios" : "Agregar dirección"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-[var(--color-earth-100)] bg-white text-sm text-[var(--color-leaf-900)] focus:border-[var(--color-iris-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)]/15";

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-[var(--color-leaf-900)] mb-1">
        {label}
        {required && <span className="text-[#9A2A1F] ml-0.5">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="block text-[11px] text-[var(--color-earth-500)] mt-1">
          {hint}
        </span>
      )}
      {error && (
        <span className="block text-[11px] text-[#9A2A1F] mt-1">{error}</span>
      )}
    </label>
  );
}
