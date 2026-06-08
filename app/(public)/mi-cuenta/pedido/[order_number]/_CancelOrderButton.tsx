"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMyPendingOrder } from "../../_actions/orders";

/**
 * Botón para cancelar un pedido pendiente de pago. Doble paso (confirmación
 * inline) para evitar cancelaciones accidentales. Solo se renderiza desde el
 * server cuando el pedido es realmente cancelable.
 */
export default function CancelOrderButton({
  orderNumber,
}: {
  orderNumber: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelMyPendingOrder(orderNumber);
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm text-[var(--color-earth-700)] underline underline-offset-2 hover:text-[#B23A1F]"
        >
          Cancelar este pedido
        </button>
        {error && (
          <p className="text-xs text-[#B23A1F] mt-2">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-earth-100)] bg-[var(--color-earth-50)] p-4">
      <p className="text-sm text-[var(--color-leaf-900)] font-medium mb-1">
        ¿Cancelar el pedido {orderNumber}?
      </p>
      <p className="text-xs text-[var(--color-earth-700)] mb-3">
        Esta acción no se puede deshacer. Si cambiaste de opinión, puedes hacer
        un nuevo pedido cuando quieras.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-[#B23A1F] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Cancelando…" : "Sí, cancelar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="px-4 py-2 rounded-lg border border-[var(--color-earth-200)] text-[var(--color-earth-700)] text-sm font-medium hover:bg-white"
        >
          No, conservar
        </button>
      </div>
      {error && <p className="text-xs text-[#B23A1F] mt-2">{error}</p>}
    </div>
  );
}
