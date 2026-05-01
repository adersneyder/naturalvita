"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useConsent, writeConsent } from "@/lib/cart/use-consent";

/**
 * Banner de consentimiento Habeas Data (ley 1581/2012 Colombia).
 *
 * Aparece sticky bottom si el usuario aún no ha decidido. Se cierra
 * cuando el usuario acepta todo, rechaza todo, o configura preferencias.
 *
 * Hasta que se acepte `analytics`, NO se carga Microsoft Clarity.
 * Vercel Analytics y Speed Insights siguen activos siempre porque son
 * anónimos y no recolectan PII (categoría "essential").
 */
export default function HabeasDataBanner() {
  const { state, isLoaded } = useConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  // No renderizar hasta saber el estado real (evita flash en SSR)
  if (!isLoaded) return null;
  // Ya decidió: no mostramos
  if (state) return null;

  function acceptAll() {
    writeConsent({ analytics: true, marketing: true });
  }
  function rejectAll() {
    writeConsent({ analytics: false, marketing: false });
  }
  function saveCustom() {
    writeConsent({ analytics, marketing });
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-earth-100)] bg-white shadow-lg animate-slide-in-up"
      role="dialog"
      aria-label="Consentimiento de cookies y datos"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {!showSettings ? (
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <p className="font-serif text-base text-[var(--color-leaf-900)] mb-1">
                Tu privacidad importa
              </p>
              <p className="text-xs sm:text-sm text-[var(--color-earth-700)] leading-relaxed">
                Usamos cookies estrictamente necesarias para que el sitio
                funcione (sesión y carrito). Con tu consentimiento, también
                usamos herramientas de analítica y marketing para mejorar la
                experiencia. Puedes cambiar tus preferencias cuando quieras.{" "}
                <Link
                  href="/legal/privacidad"
                  className="text-[var(--color-iris-700)] hover:underline"
                >
                  Política de tratamiento de datos
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)]"
              >
                Personalizar
              </button>
              <button
                type="button"
                onClick={rejectAll}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--color-earth-100)] text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)]"
              >
                Solo necesarias
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-[var(--color-iris-700)] text-white hover:bg-[var(--color-iris-600)]"
              >
                Aceptar todo
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-serif text-base text-[var(--color-leaf-900)]">
                  Configura tus preferencias
                </p>
                <p className="text-xs text-[var(--color-earth-700)] mt-1">
                  Activa solo las categorías que estés dispuesto a permitir.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="p-1 rounded text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
                aria-label="Cerrar configuración"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <ConsentRow
                title="Estrictamente necesarias"
                description="Sesión, carrito, idioma. No se pueden desactivar."
                checked
                disabled
              />
              <ConsentRow
                title="Analítica"
                description="Microsoft Clarity (heatmaps + session replay) para entender cómo navegas y mejorar la experiencia. Los datos son agregados, no compartimos PII con terceros."
                checked={analytics}
                onChange={() => setAnalytics((v) => !v)}
              />
              <ConsentRow
                title="Marketing"
                description="Eventos a Klaviyo para enviarte recomendaciones relevantes y emails con ofertas. Solo si te suscribes voluntariamente."
                checked={marketing}
                onChange={() => setMarketing((v) => !v)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={rejectAll}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--color-earth-100)] text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)]"
              >
                Solo necesarias
              </button>
              <button
                type="button"
                onClick={saveCustom}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-[var(--color-iris-700)] text-white hover:bg-[var(--color-iris-600)]"
              >
                Guardar preferencias
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConsentRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange?: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 ${
        disabled ? "opacity-60" : "cursor-pointer"
      }`}
    >
      <span
        className={`mt-0.5 w-9 h-5 rounded-full relative transition-colors shrink-0 ${
          checked
            ? "bg-[var(--color-iris-700)]"
            : "bg-[var(--color-earth-100)]"
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--color-leaf-900)]">
          {title}
        </p>
        <p className="text-xs text-[var(--color-earth-700)] mt-0.5">
          {description}
        </p>
      </div>
    </label>
  );
}
