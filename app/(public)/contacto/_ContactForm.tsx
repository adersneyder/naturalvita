"use client";

import { useActionState } from "react";
import { submitContactForm, type ContactFormState } from "./actions";

const initialState: ContactFormState = { kind: "idle" };

export default function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    submitContactForm,
    initialState,
  );

  if (state.kind === "ok") {
    return (
      <div className="p-8 rounded-2xl bg-[var(--color-leaf-100)]/50 border border-[var(--color-leaf-700)]/15 text-center">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-leaf-700)] mb-4"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mb-2">
          Mensaje enviado
        </h2>
        <p className="text-sm text-[var(--color-earth-700)] leading-relaxed max-w-md mx-auto">
          Recibimos tu mensaje y te contestaremos a tu correo en menos de un día
          hábil. Te enviamos un correo de confirmación; si no lo ves, revisa tu
          bandeja de spam.
        </p>
      </div>
    );
  }

  const fieldErr = (field: string): string | undefined => {
    if (state.kind !== "error") return undefined;
    return state.fieldErrors?.[field]?.[0];
  };

  return (
    <form action={formAction} className="space-y-4">
      {/* Honeypot: campo visualmente oculto que humanos no rellenan pero
          algunos bots sí. Si llega con valor, descartamos. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label htmlFor="website">
          No llenar este campo (anti-spam):
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      {state.kind === "error" && !state.fieldErrors && (
        <div className="px-4 py-3 rounded-lg bg-[#FBE7E2] text-[#9A2A1F] text-sm">
          {state.message}
        </div>
      )}

      <Field
        label="Nombre completo"
        name="name"
        required
        type="text"
        autoComplete="name"
        error={fieldErr("name")}
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <Field
          label="Correo"
          name="email"
          required
          type="email"
          autoComplete="email"
          error={fieldErr("email")}
        />
        <Field
          label="Teléfono (opcional)"
          name="phone"
          type="tel"
          autoComplete="tel"
          error={fieldErr("phone")}
        />
      </div>

      <Field
        label="Asunto"
        name="subject"
        required
        type="text"
        placeholder="Ej. Pregunta sobre un producto, problema con un pedido…"
        error={fieldErr("subject")}
      />

      <FieldTextarea
        label="Mensaje"
        name="message"
        required
        rows={6}
        placeholder="Cuéntanos en qué te podemos ayudar"
        error={fieldErr("message")}
      />

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Enviando…" : "Enviar mensaje"}
        </button>
        <p className="mt-3 text-[11px] text-[var(--color-earth-500)] leading-relaxed">
          Al enviar este formulario aceptas nuestra{" "}
          <a
            href="/legal/privacidad"
            className="text-[var(--color-iris-700)] hover:underline"
          >
            política de tratamiento de datos
          </a>
          . Usaremos tu información solo para responderte.
        </p>
      </div>
    </form>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-[var(--color-earth-100)] bg-white text-sm text-[var(--color-leaf-900)] focus:border-[var(--color-iris-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)]/15";

function Field({
  label,
  name,
  type,
  required,
  autoComplete,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-[var(--color-leaf-900)] mb-1">
        {label}
        {required && <span className="text-[#9A2A1F] ml-0.5">*</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={inputClass}
      />
      {error && (
        <span className="block text-[11px] text-[#9A2A1F] mt-1">{error}</span>
      )}
    </label>
  );
}

function FieldTextarea({
  label,
  name,
  required,
  rows,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  required?: boolean;
  rows?: number;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-[var(--color-leaf-900)] mb-1">
        {label}
        {required && <span className="text-[#9A2A1F] ml-0.5">*</span>}
      </span>
      <textarea
        name={name}
        required={required}
        rows={rows ?? 5}
        placeholder={placeholder}
        className={`${inputClass} resize-y min-h-[120px]`}
      />
      {error && (
        <span className="block text-[11px] text-[#9A2A1F] mt-1">{error}</span>
      )}
    </label>
  );
}
