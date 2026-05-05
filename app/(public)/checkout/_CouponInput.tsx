"use client";

import { useState, useTransition } from "react";
import { previewCouponAction } from "./_actions/coupon";
import { formatCop } from "@/lib/format/currency";

type Props = {
  /** Subtotal con IVA del carrito en COP */
  subtotalCop: number;
  /** Notifica al sidebar cuando se aplicó un cupón válido */
  onApply: (code: string, discountCop: number) => void;
  /** Notifica cuando el cliente quita el cupón */
  onRemove: () => void;
};

/**
 * Input para aplicar un código de cupón en el checkout.
 *
 * Flujo UX:
 *   1. Estado colapsado: muestra solo el link "¿Tienes un cupón?"
 *   2. Click expande input + botón "Aplicar"
 *   3. Al aplicar válido: muestra estado de éxito con código + descuento
 *      y botón "Quitar"
 *   4. Al aplicar inválido: muestra mensaje de error inline, mantiene el
 *      input para corregir
 *
 * El descuento mostrado aquí es preview server-side. La aplicación real
 * pasa al confirmar el pedido en createPendingOrder() que re-valida.
 */
export default function CouponInput({ subtotalCop, onApply, onRemove }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{
    code: string;
    discount_cop: number;
    description: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleApply = () => {
    setError(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Ingresa un código");
      return;
    }
    startTransition(async () => {
      const result = await previewCouponAction(trimmed, subtotalCop);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setApplied({
        code: result.code,
        discount_cop: result.discount_cop,
        description: result.description,
      });
      setCode("");
      onApply(result.code, result.discount_cop);
    });
  };

  const handleRemove = () => {
    setApplied(null);
    setError(null);
    onRemove();
  };

  // Estado: cupón aplicado correctamente
  if (applied) {
    return (
      <div className="rounded-lg bg-[var(--color-leaf-100)] border border-[var(--color-leaf-700)]/30 p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[var(--color-leaf-900)] flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-mono">{applied.code}</span>
            </p>
            <p className="text-xs text-[var(--color-leaf-700)] mt-0.5">
              Ahorras {formatCop(applied.discount_cop)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-[var(--color-earth-700)] hover:text-[var(--color-earth-900)] underline shrink-0"
          >
            Quitar
          </button>
        </div>
      </div>
    );
  }

  // Estado colapsado: solo link
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="text-xs text-[var(--color-iris-700)] hover:text-[var(--color-iris-600)] underline"
      >
        ¿Tienes un cupón de descuento?
      </button>
    );
  }

  // Estado expandido: input + botón
  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
          }}
          placeholder="Código"
          autoComplete="off"
          autoCapitalize="characters"
          disabled={isPending}
          className="flex-1 px-3 py-2 rounded-lg bg-white border border-[var(--color-earth-200)] text-sm font-mono uppercase tracking-wider text-[var(--color-leaf-900)] focus:outline-none focus:border-[var(--color-iris-700)] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={isPending || !code.trim()}
          className="px-4 py-2 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "..." : "Aplicar"}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
