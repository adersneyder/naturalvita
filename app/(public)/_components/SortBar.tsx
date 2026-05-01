"use client";

import { useQueryState, parseAsStringEnum, parseAsInteger } from "nuqs";

const SORT_OPTIONS = [
  { value: "relevance", label: "Destacados" },
  { value: "newest", label: "Más recientes" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "name_asc", label: "Nombre A-Z" },
] as const;

type Props = {
  total: number;
};

export default function SortBar({ total }: Props) {
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringEnum([
      "relevance",
      "price_asc",
      "price_desc",
      "newest",
      "name_asc",
    ] as const)
      .withDefault("relevance")
      .withOptions({ shallow: false, history: "push" }),
  );
  const [, setPage] = useQueryState(
    "p",
    parseAsInteger.withDefault(1).withOptions({ shallow: false, history: "push" }),
  );

  return (
    <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-[var(--color-earth-100)]">
      <p className="text-sm text-[var(--color-earth-700)] tabular-nums">
        {total === 0
          ? "Sin resultados"
          : total === 1
            ? "1 producto"
            : `${total.toLocaleString("es-CO")} productos`}
      </p>
      <label className="flex items-center gap-2 text-sm">
        <span className="hidden sm:inline text-[var(--color-earth-700)]">
          Ordenar:
        </span>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as typeof sort);
            setPage(null);
          }}
          className="px-3 py-1.5 rounded-lg border border-[var(--color-earth-100)] text-sm bg-white text-[var(--color-leaf-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)]"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
