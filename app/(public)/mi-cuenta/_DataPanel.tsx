"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENT_TYPES, type ContactInput } from "@/lib/checkout/schemas";
import { updateCustomerProfile } from "./actions";

export default function DataPanel({
  initial,
  email,
}: {
  initial: ContactInput;
  email: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [fullName, setFullName] = useState(initial.full_name);
  const [phone, setPhone] = useState(initial.phone);
  const [docType, setDocType] = useState<ContactInput["document_type"]>(
    initial.document_type,
  );
  const [docNumber, setDocNumber] = useState(initial.document_number);
  const [acceptsMarketing, setAcceptsMarketing] = useState(
    initial.accepts_marketing,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const res = await updateCustomerProfile({
        full_name: fullName,
        phone,
        document_type: docType,
        document_number: docNumber,
        accepts_marketing: acceptsMarketing,
      });
      if (!res.ok) {
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      } else {
        setSuccess("Datos actualizados correctamente");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <h3 className="font-serif text-base text-[var(--color-leaf-900)] mb-1">
          Información personal
        </h3>
        <p className="text-xs text-[var(--color-earth-700)]">
          Estos datos los usamos para emitir factura y contactarte sobre tu
          pedido. Tu correo {email} no se puede cambiar desde aquí.
        </p>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-[#FBE7E2] text-[#9A2A1F] text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="px-3 py-2 rounded-lg bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)] text-sm">
          {success}
        </div>
      )}

      <Field label="Nombre completo" required error={fieldErrors.full_name?.[0]}>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
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

      <div className="grid sm:grid-cols-[160px_1fr] gap-3">
        <Field
          label="Tipo de doc."
          required
          error={fieldErrors.document_type?.[0]}
        >
          <select
            value={docType}
            onChange={(e) =>
              setDocType(e.target.value as ContactInput["document_type"])
            }
            required
            className={inputClass}
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.value}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Número de documento"
          required
          error={fieldErrors.document_number?.[0]}
        >
          <input
            type="text"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <label className="flex items-start gap-2 text-sm text-[var(--color-earth-700)] mt-2">
        <input
          type="checkbox"
          checked={acceptsMarketing}
          onChange={(e) => setAcceptsMarketing(e.target.checked)}
          className="mt-0.5 rounded border-[var(--color-earth-100)]"
        />
        <span>
          Quiero recibir ofertas, novedades y recomendaciones por correo. Puedo
          cancelar cuando quiera.
        </span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-[var(--color-earth-100)] bg-white text-sm text-[var(--color-leaf-900)] focus:border-[var(--color-iris-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)]/15";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
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
      {error && (
        <span className="block text-[11px] text-[#9A2A1F] mt-1">{error}</span>
      )}
    </label>
  );
}
