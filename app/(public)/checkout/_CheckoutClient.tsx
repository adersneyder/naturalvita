"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown, AlertCircle } from "lucide-react";
import { useCart } from "@/lib/cart/use-cart";
import {
  ContactSchema,
  AddressSchema,
  DOCUMENT_TYPES,
  type ContactInput,
  type AddressInput,
} from "@/lib/checkout/schemas";
import {
  listDepartmentNames,
  citiesOfDepartment,
} from "@/lib/checkout/divipola-data";
import { saveContactInfo, saveAddress } from "./actions";
import OrderSummarySidebar from "./_OrderSummarySidebar";
import type { SavedAddress } from "./page";

type Props = {
  customerId: string;
  customerEmail: string;
  initialContact: ContactInput;
  savedAddresses: SavedAddress[];
};

type FieldErrors = Record<string, string[] | undefined>;

const OTHER_CITY = "__other__";

export default function CheckoutClient({
  customerEmail,
  initialContact,
  savedAddresses,
}: Props) {
  const router = useRouter();
  const cart = useCart();
  const [isPending, startTransition] = useTransition();

  // Estado: usar dirección guardada o nueva
  const [addressMode, setAddressMode] = useState<"saved" | "new">(
    savedAddresses.length > 0 ? "saved" : "new",
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    savedAddresses.find((a) => a.is_default)?.id ?? savedAddresses[0]?.id ?? null,
  );

  // Estado de contacto
  const [contact, setContact] = useState<ContactInput>(initialContact);
  const [contactSaved, setContactSaved] = useState(
    Boolean(initialContact.full_name && initialContact.phone && initialContact.document_number),
  );
  const [contactErrors, setContactErrors] = useState<FieldErrors>({});

  // Estado de dirección nueva
  const [address, setAddress] = useState<AddressInput>({
    recipient_name: initialContact.full_name || "",
    phone: initialContact.phone || "",
    department: "",
    city: "",
    street: "",
    details: "",
    postal_code: "",
    label: "",
    is_default: savedAddresses.length === 0,
  });
  const [addressErrors, setAddressErrors] = useState<FieldErrors>({});
  const [citySelectMode, setCitySelectMode] = useState<"select" | "custom">(
    "select",
  );
  const [citySelectValue, setCitySelectValue] = useState<string>("");

  // Mensaje general de error (no de campo)
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Carrito vacío: redirigir
  useEffect(() => {
    if (cart.items.length === 0) {
      router.replace("/carrito");
    }
  }, [cart.items.length, router]);

  // Cuando cambia departamento, resetear ciudad
  useEffect(() => {
    setCitySelectValue("");
    setAddress((a) => ({ ...a, city: "" }));
  }, [address.department]);

  const departments = useMemo(() => listDepartmentNames(), []);
  const cities = useMemo(
    () => citiesOfDepartment(address.department),
    [address.department],
  );

  function updateContact<K extends keyof ContactInput>(
    field: K,
    value: ContactInput[K],
  ) {
    setContact((c) => ({ ...c, [field]: value }));
    setContactErrors((e) => ({ ...e, [field]: undefined }));
    setContactSaved(false);
  }

  function updateAddress<K extends keyof AddressInput>(
    field: K,
    value: AddressInput[K],
  ) {
    setAddress((a) => ({ ...a, [field]: value }));
    setAddressErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleCitySelectChange(value: string) {
    setCitySelectValue(value);
    if (value === OTHER_CITY) {
      setCitySelectMode("custom");
      setAddress((a) => ({ ...a, city: "" }));
    } else {
      setAddress((a) => ({ ...a, city: value }));
    }
  }

  function handleSelectSavedAddress(id: string) {
    setSelectedAddressId(id);
  }

  function handleSwitchToNewAddress() {
    setAddressMode("new");
    setSelectedAddressId(null);
  }

  function handleSwitchToSaved() {
    setAddressMode("saved");
    if (!selectedAddressId && savedAddresses[0]) {
      setSelectedAddressId(savedAddresses[0].id);
    }
  }

  // Submit handlers
  async function handleSaveContact() {
    setGlobalError(null);
    setContactErrors({});

    const parsed = ContactSchema.safeParse(contact);
    if (!parsed.success) {
      setContactErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const res = await saveContactInfo(parsed.data);
      if (!res.ok) {
        setContactErrors(res.fieldErrors ?? {});
        setGlobalError(res.message ?? "No pudimos guardar tus datos");
        return;
      }
      setContactSaved(true);
    });
  }

  async function handleSaveAddress() {
    setGlobalError(null);
    setAddressErrors({});

    // Pre-llenar con teléfono del contacto si está vacío
    const candidate: AddressInput = {
      ...address,
      phone: address.phone || contact.phone,
      recipient_name: address.recipient_name || contact.full_name,
    };

    const parsed = AddressSchema.safeParse(candidate);
    if (!parsed.success) {
      setAddressErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const res = await saveAddress(parsed.data, null);
      if (!res.ok) {
        setAddressErrors(res.fieldErrors ?? {});
        setGlobalError(res.message ?? "No pudimos guardar la dirección");
        return;
      }
      // Cambiar a modo "saved" con la nueva dirección seleccionada
      setSelectedAddressId(res.data.id);
      setAddressMode("saved");
      router.refresh();
    });
  }

  // Estado derivado: ¿está listo para confirmar?
  const hasContactReady = contactSaved && !!contact.full_name && !!contact.document_number;
  const hasAddressReady =
    (addressMode === "saved" && !!selectedAddressId) || false;
  const canConfirm = hasContactReady && hasAddressReady;

  if (cart.items.length === 0) {
    return null; // El useEffect ya está redirigiendo
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8">
      {/* Columna izquierda: secciones del checkout */}
      <div className="space-y-6">
        {globalError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2">
            <AlertCircle size={18} className="text-red-700 shrink-0 mt-0.5" />
            <p className="text-sm text-red-900">{globalError}</p>
          </div>
        )}

        {/* SECCIÓN 1: CONTACTO */}
        <section className="rounded-2xl bg-white border border-[var(--color-earth-100)] p-5 sm:p-6">
          <SectionHeader
            number={1}
            title="Datos de contacto"
            done={contactSaved}
          />

          <p className="text-xs text-[var(--color-earth-700)] mb-4">
            Te escribimos a{" "}
            <span className="font-medium text-[var(--color-leaf-900)]">
              {customerEmail}
            </span>
            . Para cambiar el correo, cierra sesión e inicia con otro.
          </p>

          <div className="space-y-3">
            <Field
              label="Nombre completo"
              error={contactErrors.full_name?.[0]}
              required
            >
              <input
                type="text"
                value={contact.full_name}
                onChange={(e) => updateContact("full_name", e.target.value)}
                autoComplete="name"
                className={inputClass(!!contactErrors.full_name)}
              />
            </Field>

            <Field
              label="Teléfono"
              hint="Móvil de 10 dígitos o fijo de 7"
              error={contactErrors.phone?.[0]}
              required
            >
              <input
                type="tel"
                value={contact.phone}
                onChange={(e) => updateContact("phone", e.target.value)}
                autoComplete="tel"
                placeholder="3001234567"
                className={inputClass(!!contactErrors.phone)}
              />
            </Field>

            <div className="grid sm:grid-cols-[160px_1fr] gap-3">
              <Field
                label="Tipo de doc."
                error={contactErrors.document_type?.[0]}
                required
              >
                <select
                  value={contact.document_type}
                  onChange={(e) =>
                    updateContact(
                      "document_type",
                      e.target.value as ContactInput["document_type"],
                    )
                  }
                  className={inputClass(!!contactErrors.document_type)}
                >
                  {DOCUMENT_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.value}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Número de documento"
                error={contactErrors.document_number?.[0]}
                required
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={contact.document_number}
                  onChange={(e) =>
                    updateContact("document_number", e.target.value.replace(/\D/g, ""))
                  }
                  className={inputClass(!!contactErrors.document_number)}
                />
              </Field>
            </div>

            <label className="flex items-start gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={contact.accepts_marketing}
                onChange={(e) =>
                  updateContact("accepts_marketing", e.target.checked)
                }
                className="mt-1"
              />
              <span className="text-xs text-[var(--color-earth-700)] leading-relaxed">
                Quiero recibir ofertas, novedades y recomendaciones por correo.
                Puedo cancelar cuando quiera.
              </span>
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleSaveContact}
              disabled={isPending}
              className="px-5 py-2.5 rounded-lg bg-[var(--color-leaf-900)] text-white text-sm font-medium hover:bg-[var(--color-leaf-700)] disabled:opacity-50"
            >
              {contactSaved ? "Actualizar datos" : "Guardar y continuar"}
            </button>
          </div>
        </section>

        {/* SECCIÓN 2: DIRECCIÓN DE ENVÍO */}
        <section
          className={`rounded-2xl bg-white border p-5 sm:p-6 transition-opacity ${
            contactSaved
              ? "border-[var(--color-earth-100)]"
              : "border-[var(--color-earth-100)] opacity-60 pointer-events-none"
          }`}
          aria-disabled={!contactSaved}
        >
          <SectionHeader
            number={2}
            title="Dirección de envío"
            done={hasAddressReady}
          />

          {savedAddresses.length > 0 && (
            <div className="mb-4 inline-flex rounded-lg bg-[var(--color-earth-50)] p-1 text-xs">
              <button
                type="button"
                onClick={handleSwitchToSaved}
                className={`px-3 py-1.5 rounded-md ${
                  addressMode === "saved"
                    ? "bg-white text-[var(--color-leaf-900)] shadow-sm font-medium"
                    : "text-[var(--color-earth-700)]"
                }`}
              >
                Direcciones guardadas
              </button>
              <button
                type="button"
                onClick={handleSwitchToNewAddress}
                className={`px-3 py-1.5 rounded-md ${
                  addressMode === "new"
                    ? "bg-white text-[var(--color-leaf-900)] shadow-sm font-medium"
                    : "text-[var(--color-earth-700)]"
                }`}
              >
                Nueva dirección
              </button>
            </div>
          )}

          {addressMode === "saved" && savedAddresses.length > 0 ? (
            <ul className="space-y-2">
              {savedAddresses.map((a) => (
                <li key={a.id}>
                  <label
                    className={`block p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAddressId === a.id
                        ? "border-[var(--color-iris-700)] bg-[var(--color-iris-100)]/30"
                        : "border-[var(--color-earth-100)] hover:border-[var(--color-earth-700)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="saved-address"
                        checked={selectedAddressId === a.id}
                        onChange={() => handleSelectSavedAddress(a.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-[var(--color-leaf-900)]">
                            {a.recipient_name}
                          </span>
                          {a.label && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-earth-100)] text-[var(--color-earth-700)]">
                              {a.label}
                            </span>
                          )}
                          {a.is_default && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]">
                              Predeterminada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-earth-700)] mt-0.5">
                          {a.street}
                          {a.details ? `, ${a.details}` : ""}
                        </p>
                        <p className="text-xs text-[var(--color-earth-700)]">
                          {a.city}, {a.department}
                          {a.postal_code ? ` · ${a.postal_code}` : ""}
                        </p>
                        <p className="text-xs text-[var(--color-earth-500)] mt-0.5">
                          Tel: {a.phone}
                        </p>
                      </div>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3">
              <Field label="Quien recibe" error={addressErrors.recipient_name?.[0]} required>
                <input
                  type="text"
                  value={address.recipient_name}
                  onChange={(e) => updateAddress("recipient_name", e.target.value)}
                  autoComplete="name"
                  className={inputClass(!!addressErrors.recipient_name)}
                />
              </Field>
              <Field label="Teléfono de contacto" error={addressErrors.phone?.[0]} required>
                <input
                  type="tel"
                  value={address.phone}
                  onChange={(e) => updateAddress("phone", e.target.value)}
                  autoComplete="tel"
                  placeholder="3001234567"
                  className={inputClass(!!addressErrors.phone)}
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field
                  label="Departamento"
                  error={addressErrors.department?.[0]}
                  required
                >
                  <select
                    value={address.department}
                    onChange={(e) => updateAddress("department", e.target.value)}
                    className={inputClass(!!addressErrors.department)}
                  >
                    <option value="">Selecciona...</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Ciudad / municipio"
                  error={addressErrors.city?.[0]}
                  required
                >
                  {!address.department ? (
                    <input
                      type="text"
                      disabled
                      placeholder="Selecciona departamento primero"
                      className={inputClass(false) + " opacity-60"}
                    />
                  ) : citySelectMode === "custom" ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={address.city}
                        onChange={(e) => updateAddress("city", e.target.value)}
                        placeholder="Escribe el nombre del municipio"
                        className={inputClass(!!addressErrors.city)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCitySelectMode("select");
                          setCitySelectValue("");
                          updateAddress("city", "");
                        }}
                        className="px-2 text-xs text-[var(--color-iris-700)] hover:underline whitespace-nowrap"
                      >
                        Lista
                      </button>
                    </div>
                  ) : (
                    <select
                      value={citySelectValue}
                      onChange={(e) => handleCitySelectChange(e.target.value)}
                      className={inputClass(!!addressErrors.city)}
                    >
                      <option value="">Selecciona...</option>
                      {cities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value={OTHER_CITY}>Otro municipio…</option>
                    </select>
                  )}
                </Field>
              </div>

              <Field
                label="Dirección"
                hint="Calle, número, edificio"
                error={addressErrors.street?.[0]}
                required
              >
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => updateAddress("street", e.target.value)}
                  autoComplete="street-address"
                  placeholder="Calle 100 # 10-20"
                  className={inputClass(!!addressErrors.street)}
                />
              </Field>

              <Field
                label="Detalles adicionales"
                hint="Apto, torre, color de fachada, indicaciones"
                error={addressErrors.details?.[0]}
              >
                <input
                  type="text"
                  value={address.details ?? ""}
                  onChange={(e) => updateAddress("details", e.target.value)}
                  className={inputClass(!!addressErrors.details)}
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field
                  label="Código postal"
                  hint="Opcional, 6 dígitos"
                  error={addressErrors.postal_code?.[0]}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={address.postal_code ?? ""}
                    onChange={(e) =>
                      updateAddress(
                        "postal_code",
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    className={inputClass(!!addressErrors.postal_code)}
                  />
                </Field>
                <Field label="Etiqueta" hint='Opcional, ej. "Casa", "Oficina"'>
                  <input
                    type="text"
                    value={address.label ?? ""}
                    onChange={(e) => updateAddress("label", e.target.value)}
                    className={inputClass(!!addressErrors.label)}
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={address.is_default}
                  onChange={(e) => updateAddress("is_default", e.target.checked)}
                  disabled={savedAddresses.length === 0}
                />
                <span className="text-xs text-[var(--color-earth-700)]">
                  Marcar como dirección predeterminada
                </span>
              </label>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-lg bg-[var(--color-leaf-900)] text-white text-sm font-medium hover:bg-[var(--color-leaf-700)] disabled:opacity-50"
                >
                  Guardar dirección
                </button>
              </div>
            </div>
          )}
        </section>

        {/* SECCIÓN 3: REVISIÓN Y CONFIRMACIÓN */}
        <section
          className={`rounded-2xl bg-white border p-5 sm:p-6 transition-opacity ${
            canConfirm
              ? "border-[var(--color-earth-100)]"
              : "border-[var(--color-earth-100)] opacity-60 pointer-events-none"
          }`}
          aria-disabled={!canConfirm}
        >
          <SectionHeader number={3} title="Revisar y pagar" done={false} />

          <p className="text-sm text-[var(--color-earth-700)] mb-4">
            Verifica tus datos antes de proceder al pago seguro con Bold.
          </p>

          <div className="rounded-lg bg-[var(--color-earth-50)] p-4 mb-4 text-sm">
            <p className="text-[var(--color-earth-700)] text-xs uppercase tracking-wider mb-1">
              Resumen del pedido
            </p>
            <p className="text-[var(--color-leaf-900)]">
              {cart.quantity} {cart.quantity === 1 ? "producto" : "productos"}{" "}
              · revísalos en la barra lateral.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="w-full px-5 py-3 rounded-lg bg-[var(--color-earth-100)] text-[var(--color-earth-500)] text-sm font-medium cursor-not-allowed"
            title="El pago se habilita cuando integremos Bold (Hito 1.7 Sesión C)"
          >
            Confirmar y pagar
          </button>
          <p className="text-xs text-center text-[var(--color-earth-500)] mt-3">
            Pago seguro por Bold · próximamente en esta sesión
          </p>
        </section>

        <Link
          href="/carrito"
          className="inline-block text-sm text-[var(--color-iris-700)] hover:underline"
        >
          ← Volver al carrito
        </Link>
      </div>

      {/* Columna derecha: resumen sticky */}
      <OrderSummarySidebar />
    </div>
  );
}

// ─── Helpers de UI ─────────────────────────────────────────────

function SectionHeader({
  number,
  title,
  done,
}: {
  number: number;
  title: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
          done
            ? "bg-[var(--color-leaf-700)] text-white"
            : "bg-[var(--color-earth-100)] text-[var(--color-leaf-900)]"
        }`}
      >
        {done ? <Check size={14} strokeWidth={2.5} /> : number}
      </span>
      <h2 className="font-serif text-lg text-[var(--color-leaf-900)]">{title}</h2>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider font-semibold text-[var(--color-earth-700)] mb-1">
        {label}
        {required && <span className="text-red-700 ml-0.5">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="block text-[11px] text-[var(--color-earth-500)] mt-1">
          {hint}
        </span>
      )}
      {error && (
        <span className="block text-[11px] text-red-700 mt-1">{error}</span>
      )}
    </label>
  );
}

function inputClass(hasError: boolean): string {
  return [
    "w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-[var(--color-leaf-900)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)] focus:border-transparent",
    hasError
      ? "border-red-300 bg-red-50/50"
      : "border-[var(--color-earth-100)]",
  ].join(" ");
}
