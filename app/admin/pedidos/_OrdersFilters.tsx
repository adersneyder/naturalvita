"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "paid", label: "Pagado" },
  { value: "processing", label: "En preparación" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "refunded", label: "Reembolsado" },
];

const PAYMENT_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "paid", label: "Pagado" },
  { value: "failed", label: "Fallido" },
  { value: "refunded", label: "Reembolsado" },
  { value: "partially_refunded", label: "Reemb. parcial" },
];

export default function OrdersFilters({
  initialSearch,
  initialStatus,
  initialPayment,
}: {
  initialSearch: string;
  initialStatus: string;
  initialPayment: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);

  function pushWith(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page"); // resetear paginación al cambiar filtro
    startTransition(() => {
      router.push(`/admin/pedidos${next.toString() ? `?${next}` : ""}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushWith({ q: search.trim() || null });
  }

  return (
    <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-3 mb-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <label className="block">
            <span className="sr-only">Buscar</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número, email o nombre…"
              className="w-full px-3 py-1.5 rounded-lg text-sm border border-[rgba(47,98,56,0.15)] focus:border-[var(--color-iris-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)]/15"
            />
          </label>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={initialStatus}
            onChange={(e) => pushWith({ status: e.target.value })}
            className="px-3 py-1.5 rounded-lg text-sm border border-[rgba(47,98,56,0.15)] bg-white focus:border-[var(--color-iris-700)] focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                Estado: {s.label}
              </option>
            ))}
          </select>
          <select
            value={initialPayment}
            onChange={(e) => pushWith({ payment_status: e.target.value })}
            className="px-3 py-1.5 rounded-lg text-sm border border-[rgba(47,98,56,0.15)] bg-white focus:border-[var(--color-iris-700)] focus:outline-none"
          >
            {PAYMENT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                Pago: {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
