"use client";

import { useMemo, useState } from "react";
import {
  useQueryState,
  useQueryStates,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
} from "nuqs";
import { X, SlidersHorizontal, Check, ChevronDown } from "lucide-react";
import { formatCop } from "@/lib/format/currency";
import type { FilterableAttribute } from "@/lib/catalog/listing-queries";

type Props = {
  /** Categorías visibles en el sidebar. Solo se muestran cuando NO estamos
   *  ya en una página de categoría (donde el slug fija el contexto). */
  categories?: Array<{
    slug: string;
    name: string;
    children: Array<{ slug: string; name: string }>;
  }>;
  /** Colecciones disponibles. Se ocultan en la página de colección. */
  collections?: Array<{ slug: string; name: string }>;
  /** Laboratorios disponibles. Se ocultan en la página de laboratorio. */
  laboratories?: Array<{ slug: string; name: string }>;
  /** Atributos filtrables y sus opciones. */
  attributes: FilterableAttribute[];
  /** Rango global de precios en COP. */
  priceRange: { min: number; max: number };
  /** Total de resultados actuales (se muestra en el botón "Aplicar" mobile). */
  totalResults: number;
  /** Si el contexto fija una categoría/colección/laboratorio (URL /categoria/[slug]
   *  etc.), no mostramos el filtro correspondiente. */
  hideCategories?: boolean;
  hideCollections?: boolean;
  hideLaboratories?: boolean;
};

/**
 * FilterSidebar con URL como source-of-truth.
 *
 * Comportamiento:
 *   - Desktop: panel lateral fijo en columna izquierda (lg:block).
 *   - Mobile: botón "Filtrar" que abre el panel como bottom sheet (slide-up).
 *   - Cada cambio actualiza la URL inmediatamente (nuqs).
 *   - "Limpiar todo" resetea todos los filtros excepto el contexto de la URL.
 *   - Cualquier cambio resetea `p` a 1.
 *   - Cada grupo es accordion. Categoría y Laboratorio abiertos por defecto,
 *     el resto cerrado. El estado de apertura es local (no se persiste).
 */
export default function FilterSidebar({
  categories,
  collections,
  laboratories,
  attributes,
  priceRange,
  totalResults,
  hideCategories,
  hideCollections,
  hideLaboratories,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Botón mobile que abre el panel */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-earth-100)] text-sm font-medium text-[var(--color-leaf-900)] bg-white hover:bg-[var(--color-earth-50)]"
        >
          <SlidersHorizontal size={16} />
          Filtrar
        </button>
      </div>

      {/* Panel desktop */}
      <aside className="hidden lg:block">
        <FilterPanel
          categories={categories}
          collections={collections}
          laboratories={laboratories}
          attributes={attributes}
          priceRange={priceRange}
          hideCategories={hideCategories}
          hideCollections={hideCollections}
          hideLaboratories={hideLaboratories}
        />
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 animate-fade-in"
          onClick={() => setMobileOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Filtros"
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-[var(--color-earth-100)] px-5 py-3 flex items-center justify-between">
              <h2 className="font-serif text-lg text-[var(--color-leaf-900)]">
                Filtrar
              </h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
                aria-label="Cerrar filtros"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <FilterPanel
                categories={categories}
                collections={collections}
                laboratories={laboratories}
                attributes={attributes}
                priceRange={priceRange}
                hideCategories={hideCategories}
                hideCollections={hideCollections}
                hideLaboratories={hideLaboratories}
              />
            </div>
            <div className="sticky bottom-0 bg-white border-t border-[var(--color-earth-100)] p-4">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="w-full px-4 py-3 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)]"
              >
                Ver {totalResults} {totalResults === 1 ? "producto" : "productos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterPanel({
  categories,
  collections,
  laboratories,
  attributes,
  priceRange,
  hideCategories,
  hideCollections,
  hideLaboratories,
}: Omit<Props, "totalResults">) {
  // Estado URL — cada cambio dispara push a la URL.
  // shallow:false hace que Next refetch RSC, lo que recarga el listado.
  const opts = { shallow: false, history: "push" as const };

  const [cat, setCat] = useQueryState("cat", parseAsString.withOptions(opts));
  const [col, setCol] = useQueryState(
    "col",
    parseAsArrayOf(parseAsString).withDefault([]).withOptions(opts),
  );
  const [lab, setLab] = useQueryState(
    "lab",
    parseAsArrayOf(parseAsString).withDefault([]).withOptions(opts),
  );
  const [attrs, setAttrs] = useQueryState(
    "attrs",
    parseAsArrayOf(parseAsString).withDefault([]).withOptions(opts),
  );
  const [{ min, max }, setPrice] = useQueryStates(
    {
      min: parseAsInteger,
      max: parseAsInteger,
    },
    { shallow: false, history: "push" },
  );
  const [instock, setInstock] = useQueryState(
    "instock",
    parseAsBoolean.withDefault(false).withOptions(opts),
  );

  // Cualquier cambio de filtro resetea `p` a 1.
  const [, setPage] = useQueryState(
    "p",
    parseAsInteger.withDefault(1).withOptions(opts),
  );
  const resetPage = () => setPage(null);

  function toggleArray(current: string[], value: string): string[] {
    return current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
  }

  // Particionamos atributos en binarios (1 opción) y multi-opción.
  // Los binarios típicos son las restricciones dietarias (Vegano, Sin gluten,
  // Sin azúcar, etc.) — un atributo con un solo valor "Sí". Los agrupamos
  // bajo una sección común "Características" para no llenar el sidebar de
  // headers gigantes con un checkbox debajo.
  const { binaryAttrs, multiAttrs } = useMemo(() => {
    const binaryAttrs: FilterableAttribute[] = [];
    const multiAttrs: FilterableAttribute[] = [];
    for (const a of attributes) {
      if (a.options.length === 1) binaryAttrs.push(a);
      else if (a.options.length > 1) multiAttrs.push(a);
    }
    return { binaryAttrs, multiAttrs };
  }, [attributes]);

  const hasAnyFilter =
    !!cat ||
    col.length > 0 ||
    lab.length > 0 ||
    attrs.length > 0 ||
    min != null ||
    max != null ||
    instock;

  function clearAll() {
    setCat(null);
    setCol(null);
    setLab(null);
    setAttrs(null);
    setPrice({ min: null, max: null });
    setInstock(null);
    setPage(null);
  }

  return (
    <div className="space-y-1">
      {hasAnyFilter && (
        <div className="pb-3">
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-[var(--color-iris-700)] hover:text-[var(--color-iris-600)] font-medium underline underline-offset-4"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* 1 · Categoría — abierto por defecto */}
      {!hideCategories && categories && categories.length > 0 && (
        <FilterGroup title="Categoría" defaultOpen>
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Checkbox
                  label={c.name}
                  checked={cat === c.slug}
                  onChange={() => {
                    setCat(cat === c.slug ? null : c.slug);
                    resetPage();
                  }}
                />
                {c.children.length > 0 && cat === c.slug && (
                  <ul className="pl-6 mt-2 space-y-2 border-l border-[var(--color-earth-100)]">
                    {c.children.map((child) => (
                      <li key={child.slug}>
                        <Checkbox
                          label={child.name}
                          checked={cat === child.slug}
                          onChange={() => {
                            setCat(cat === child.slug ? c.slug : child.slug);
                            resetPage();
                          }}
                          size="sm"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}

      {/* 2 · Laboratorio — abierto por defecto */}
      {!hideLaboratories && laboratories && laboratories.length > 0 && (
        <FilterGroup title="Laboratorio" defaultOpen>
          <ul className="space-y-2">
            {laboratories.map((l) => (
              <li key={l.slug}>
                <Checkbox
                  label={l.name}
                  checked={lab.includes(l.slug)}
                  onChange={() => {
                    setLab(toggleArray(lab, l.slug));
                    resetPage();
                  }}
                />
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}

      {/* 3 · Colecciones */}
      {!hideCollections && collections && collections.length > 0 && (
        <FilterGroup title="Colecciones">
          <ul className="space-y-2">
            {collections.map((c) => (
              <li key={c.slug}>
                <Checkbox
                  label={c.name}
                  checked={col.includes(c.slug)}
                  onChange={() => {
                    setCol(toggleArray(col, c.slug));
                    resetPage();
                  }}
                />
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}

      {/* 4 · Características — agrupa atributos binarios (Vegano, Sin gluten…) */}
      {binaryAttrs.length > 0 && (
        <FilterGroup title="Características">
          <ul className="space-y-2">
            {binaryAttrs.map((attr) => {
              const opt = attr.options[0]; // único por definición
              return (
                <li key={attr.slug}>
                  <Checkbox
                    label={attr.name}
                    checked={attrs.includes(opt.slug)}
                    onChange={() => {
                      setAttrs(toggleArray(attrs, opt.slug));
                      resetPage();
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      )}

      {/* 5 · Atributos con múltiples opciones — uno por grupo (ej. Sabor) */}
      {multiAttrs.map((attr) => (
        <FilterGroup key={attr.slug} title={attr.name}>
          <ul className="space-y-2">
            {attr.options.map((o) => (
              <li key={o.slug}>
                <Checkbox
                  label={o.value}
                  checked={attrs.includes(o.slug)}
                  onChange={() => {
                    setAttrs(toggleArray(attrs, o.slug));
                    resetPage();
                  }}
                />
              </li>
            ))}
          </ul>
        </FilterGroup>
      ))}

      {/* 6 · Disponibilidad */}
      <FilterGroup title="Disponibilidad">
        <Checkbox
          label="Solo productos disponibles"
          checked={instock}
          onChange={() => {
            setInstock(!instock);
            resetPage();
          }}
        />
      </FilterGroup>

      {/* 7 · Precio — comportamiento original (inputs min/max) */}
      <FilterGroup title="Precio">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder={formatCop(priceRange.min)}
            value={min ?? ""}
            onChange={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              setPrice({ min: Number.isFinite(v as number) ? v : null, max });
              resetPage();
            }}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-earth-100)] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)]"
            aria-label="Precio mínimo"
          />
          <span className="text-[var(--color-earth-500)] text-xs">a</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder={formatCop(priceRange.max)}
            value={max ?? ""}
            onChange={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              setPrice({ min, max: Number.isFinite(v as number) ? v : null });
              resetPage();
            }}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-earth-100)] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)]"
            aria-label="Precio máximo"
          />
        </div>
      </FilterGroup>
    </div>
  );
}

// ─── Helpers de UI ─────────────────────────────────────────────

/**
 * Acordeón de filtro. Mantiene el estado abierto/cerrado localmente.
 * Header como botón con chevron animado, contenido con `hidden` cuando
 * cerrado (mejor accesibilidad y rendimiento que max-height).
 */
function FilterGroup({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `filter-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="border-b border-[var(--color-earth-100)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="w-full flex items-center justify-between py-3 text-xs uppercase tracking-wider font-semibold text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)] transition-colors"
      >
        <span>{title}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div id={id} hidden={!open} className="pb-4">
        {children}
      </div>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
  size = "md",
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  size?: "sm" | "md";
}) {
  return (
    <label
      className={`flex items-center gap-2.5 cursor-pointer ${
        size === "sm" ? "text-xs" : "text-sm"
      } text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)]`}
    >
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
          checked
            ? "bg-[var(--color-iris-700)] border-[var(--color-iris-700)]"
            : "border-[var(--color-earth-100)] bg-white"
        }`}
      >
        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span>{label}</span>
    </label>
  );
}
