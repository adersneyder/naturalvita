"use client";

import { useTransition } from "react";
import { toggleCoupon } from "../actions";

export default function ToggleButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    const verb = active ? "desactivar" : "activar";
    if (!confirm(`¿Seguro que quieres ${verb} este cupón?`)) return;
    startTransition(async () => {
      await toggleCoupon(id, !active);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-50 ${
        active
          ? "border-[var(--color-earth-300)] text-[var(--color-earth-900)] hover:bg-[var(--color-earth-50)]"
          : "border-[var(--color-leaf-700)] text-[var(--color-leaf-700)] hover:bg-[var(--color-leaf-100)]"
      }`}
    >
      {pending ? "…" : active ? "Desactivar" : "Activar"}
    </button>
  );
}
