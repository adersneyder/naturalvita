"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type Tab = {
  key: string;
  label: string;
  badge?: number;
};

const TABS: Tab[] = [
  { key: "resumen", label: "Resumen" },
  { key: "pedidos", label: "Pedidos" },
  { key: "favoritos", label: "Favoritos" },
  { key: "reseñas", label: "Reseñas" },
  { key: "direcciones", label: "Direcciones" },
  { key: "datos", label: "Mis datos" },
];

export default function AccountTabs({
  pedidosCount,
  direccionesCount,
}: {
  pedidosCount: number;
  direccionesCount: number;
}) {
  const params = useSearchParams();
  const activeTab = params.get("tab") ?? "resumen";

  function badgeFor(tab: string): number | undefined {
    if (tab === "pedidos") return pedidosCount;
    if (tab === "direcciones") return direccionesCount;
    return undefined;
  }

  return (
    <nav
      aria-label="Secciones de la cuenta"
      className="border-b border-[var(--color-earth-100)] -mx-4 sm:mx-0 sm:rounded-t-2xl bg-white sticky top-0 z-10"
    >
      <ul className="flex overflow-x-auto no-scrollbar px-4 sm:px-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const badge = badgeFor(tab.key);
          return (
            <li key={tab.key} className="flex-shrink-0">
              <Link
                href={tab.key === "resumen" ? "/mi-cuenta" : `/mi-cuenta?tab=${tab.key}`}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm transition-colors border-b-2 ${
                  isActive
                    ? "border-[var(--color-leaf-700)] text-[var(--color-leaf-900)] font-medium"
                    : "border-transparent text-[var(--color-earth-700)] hover:text-[var(--color-leaf-700)]"
                }`}
              >
                {tab.label}
                {badge !== undefined && badge > 0 && (
                  <span
                    className={`inline-flex items-center justify-center text-[10px] font-medium min-w-[18px] h-[18px] rounded-full px-1.5 ${
                      isActive
                        ? "bg-[var(--color-leaf-700)] text-white"
                        : "bg-[var(--color-earth-100)] text-[var(--color-earth-700)]"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AccountPanel({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white sm:rounded-b-2xl sm:rounded-tr-2xl border border-t-0 sm:border-t border-[var(--color-earth-100)] -mx-4 sm:mx-0 px-4 sm:px-6 py-6 sm:py-8">
      {children}
    </div>
  );
}
