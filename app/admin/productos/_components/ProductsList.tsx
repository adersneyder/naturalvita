"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  bulkSetCategory,
  bulkSetTaxRate,
  bulkSetStatus,
  bulkAddToCollection,
  bulkRemoveFromCollection,
  bulkSetAttributeValue,
  bulkRemoveAttribute,
  type BulkAttributePayload,
} from "../actions";

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  status: string;
  needs_review: boolean;
  price_cop: number;
  source_price_cop: number | null;
  stock: number;
  invima_number: string | null;
  presentation: string | null;
  presentation_type: string | null;
  content_value: number | null;
  content_unit: string | null;
  is_featured: boolean;
  laboratory_id: string;
  laboratory_name: string;
  category_id: string | null;
  category_name: string | null;
  tax_rate_id: string | null;
  tax_rate_name: string | null;
  tax_rate_percent: number | null;
  primary_image_url: string | null;
  image_count: number;
  last_synced_at: string | null;
};

export type FilterAttributeOption = { id: string; value: string };
export type FilterAttribute = {
  id: string;
  name: string;
  attribute_type: string;
  is_filterable: boolean;
  options: FilterAttributeOption[];
};

export type FilterOptions = {
  laboratories: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  tax_rates: { id: string; name: string; rate_percent: number }[];
  collections: { id: string; name: string }[];
  attributes: FilterAttribute[];
};

type Props = {
  products: ProductRow[];
  filterOptions: FilterOptions;
  counts: { all: number; draft: number; active: number; archived: number };
  currentParams: {
    q?: string;
    status?: string;
    laboratory?: string;
    category?: string;
    presentation_type?: string;
    collection?: string;
    attribute_option?: string;
    missing?: string;
    page?: string;
  };
  pagination: { page: number; page_size: number; total: number; total_pages: number };
};

const PRESENTATION_OPTIONS = [
  { value: "powder", label: "Polvo" },
  { value: "granulated", label: "Granulado" },
  { value: "drops", label: "Gotas" },
  { value: "syrup", label: "Jarabe" },
  { value: "suspension", label: "Suspensión" },
  { value: "tablets", label: "Tabletas" },
  { value: "capsules", label: "Cápsulas" },
  { value: "softgels", label: "Softgels" },
  { value: "sublingual", label: "Sublingual" },
  { value: "other", label: "Otro" },
];

function formatCOP(value: number | null): string {
  if (!value) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusPillClass(status: string): string {
  const map: Record<string, string> = {
    draft: "bg-[var(--color-earth-100)] text-[var(--color-earth-700)]",
    pending_review: "bg-[#FAEEDA] text-[#854F0B]",
    active: "bg-[var(--color-leaf-100)] text-[var(--color-leaf-900)]",
    archived: "bg-[#F1EFE8] text-[#444441]",
    out_of_stock: "bg-[#FCEBEB] text-[#791F1F]",
  };
  return map[status] ?? map.draft;
}

function statusLabel(status: string): string {
  return (
    {
      draft: "Borrador",
      pending_review: "Por revisar",
      active: "Activo",
      archived: "Archivado",
      out_of_stock: "Sin stock",
    }[status] ?? status
  );
}

export default function ProductsList({
  products,
  filterOptions,
  counts,
  currentParams,
  pagination,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [view, setView] = useState<"table" | "grid">("table");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  type BulkActionKind =
    | "none"
    | "category"
    | "tax"
    | "publish"
    | "archive"
    | "collection_add"
    | "collection_remove"
    | "attribute_set"
    | "attribute_remove";
  const [bulkAction, setBulkAction] = useState<BulkActionKind>("none");
  const [bulkValue, setBulkValue] = useState<string>(""); // primer selector (id de colección o atributo)
  const [bulkSecondary, setBulkSecondary] = useState<string>(""); // opción del atributo
  const [bulkMultiOptions, setBulkMultiOptions] = useState<Set<string>>(new Set()); // multi_select
  const [bulkText, setBulkText] = useState<string>(""); // text attribute
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(currentParams.q ?? "");

  const selectedAttribute = useMemo(
    () => filterOptions.attributes.find((a) => a.id === bulkValue) ?? null,
    [filterOptions.attributes, bulkValue],
  );

  const allOnPageSelected = useMemo(
    () => products.length > 0 && products.every((p) => selected.has(p.id)),
    [products, selected],
  );

  function setParam(name: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "" || value === "all") {
      params.delete(name);
    } else {
      params.set(name, value);
    }
    if (name !== "page") params.delete("page");
    router.push(`/admin/productos?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setParam("q", searchInput.trim() || null);
  }

  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        products.forEach((p) => next.delete(p.id));
      } else {
        products.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setBulkAction("none");
    setBulkValue("");
    setBulkSecondary("");
    setBulkMultiOptions(new Set());
    setBulkText("");
  }

  function executeBulk() {
    if (bulkAction === "none") return;
    const ids = Array.from(selected);
    setError(null);

    startTransition(async () => {
      let result;
      if (bulkAction === "category") {
        result = await bulkSetCategory(ids, bulkValue || null);
      } else if (bulkAction === "tax") {
        if (!bulkValue) {
          setError("Selecciona una tarifa");
          return;
        }
        result = await bulkSetTaxRate(ids, bulkValue);
      } else if (bulkAction === "publish") {
        result = await bulkSetStatus(ids, "active");
      } else if (bulkAction === "archive") {
        result = await bulkSetStatus(ids, "archived");
      } else if (bulkAction === "collection_add") {
        if (!bulkValue) {
          setError("Selecciona una colección");
          return;
        }
        result = await bulkAddToCollection(ids, bulkValue);
      } else if (bulkAction === "collection_remove") {
        if (!bulkValue) {
          setError("Selecciona una colección");
          return;
        }
        result = await bulkRemoveFromCollection(ids, bulkValue);
      } else if (bulkAction === "attribute_set") {
        if (!bulkValue || !selectedAttribute) {
          setError("Selecciona un atributo");
          return;
        }
        let payload: BulkAttributePayload;
        if (selectedAttribute.attribute_type === "boolean") {
          payload = { kind: "boolean_true" };
        } else if (selectedAttribute.attribute_type === "select") {
          if (!bulkSecondary) {
            setError("Selecciona una opción");
            return;
          }
          payload = { kind: "select", option_id: bulkSecondary };
        } else if (selectedAttribute.attribute_type === "multi_select") {
          if (bulkMultiOptions.size === 0) {
            setError("Selecciona al menos una opción");
            return;
          }
          payload = { kind: "multi_select_add", option_ids: Array.from(bulkMultiOptions) };
        } else if (selectedAttribute.attribute_type === "text") {
          if (!bulkText.trim()) {
            setError("Ingresa un valor");
            return;
          }
          payload = { kind: "text", text_value: bulkText };
        } else {
          setError("Tipo de atributo no soportado en bulk");
          return;
        }
        result = await bulkSetAttributeValue(ids, bulkValue, payload);
      } else if (bulkAction === "attribute_remove") {
        if (!bulkValue) {
          setError("Selecciona un atributo");
          return;
        }
        result = await bulkRemoveAttribute(ids, bulkValue);
      } else {
        return;
      }

      if (!result.success) {
        setError(result.error ?? "Error desconocido");
        return;
      }
      clearSelection();
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Productos
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
            {pagination.total} producto{pagination.total === 1 ? "" : "s"} en total · página{" "}
            {pagination.page} de {pagination.total_pages || 1}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--color-earth-100)] rounded-lg p-0.5">
            <button
              onClick={() => setView("table")}
              className={`text-xs px-3 py-1.5 rounded-md ${
                view === "table" ? "bg-white shadow-sm font-medium" : "text-[var(--color-earth-700)]"
              }`}
            >
              Tabla
            </button>
            <button
              onClick={() => setView("grid")}
              className={`text-xs px-3 py-1.5 rounded-md ${
                view === "grid" ? "bg-white shadow-sm font-medium" : "text-[var(--color-earth-700)]"
              }`}
            >
              Cuadrícula
            </button>
          </div>
        </div>
      </div>

      {/* Tabs por estado */}
      <div className="flex gap-1 mb-3 border-b border-[rgba(47,98,56,0.12)]">
        {[
          { key: "all", label: `Todos · ${counts.all}` },
          { key: "draft", label: `Borrador · ${counts.draft}` },
          { key: "active", label: `Activos · ${counts.active}` },
          { key: "archived", label: `Archivados · ${counts.archived}` },
        ].map((tab) => {
          const active = (currentParams.status ?? "all") === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setParam("status", tab.key === "all" ? null : tab.key)}
              className={`text-xs px-3 py-2 border-b-2 -mb-[1px] transition-colors ${
                active
                  ? "border-[var(--color-leaf-700)] text-[var(--color-leaf-900)] font-medium"
                  : "border-transparent text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, INVIMA, SKU..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.15)] bg-white"
          />
        </form>

        <select
          value={currentParams.laboratory ?? "all"}
          onChange={(e) => setParam("laboratory", e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] bg-white"
        >
          <option value="all">Todos los laboratorios</option>
          {filterOptions.laboratories.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <select
          value={currentParams.category ?? "all"}
          onChange={(e) => setParam("category", e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] bg-white"
        >
          <option value="all">Todas las categorías</option>
          <option value="none">Sin categoría asignada</option>
          {filterOptions.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={currentParams.presentation_type ?? "all"}
          onChange={(e) => setParam("presentation_type", e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] bg-white"
        >
          <option value="all">Todas las presentaciones</option>
          {PRESENTATION_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {filterOptions.collections.length > 0 && (
          <select
            value={currentParams.collection ?? "all"}
            onChange={(e) => setParam("collection", e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] bg-white"
          >
            <option value="all">Todas las colecciones</option>
            {filterOptions.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {filterOptions.attributes.filter((a) => a.is_filterable).length > 0 && (
          <select
            value={currentParams.attribute_option ?? "all"}
            onChange={(e) => setParam("attribute_option", e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] bg-white max-w-[220px]"
          >
            <option value="all">Filtrar por atributo</option>
            {filterOptions.attributes
              .filter((a) => a.is_filterable)
              .map((attr) => {
                if (attr.attribute_type === "boolean") {
                  return (
                    <option key={attr.id} value={`${attr.id}:any`}>
                      {attr.name} (sí)
                    </option>
                  );
                }
                if (attr.options.length === 0) return null;
                return (
                  <optgroup key={attr.id} label={attr.name}>
                    {attr.options.map((opt) => (
                      <option key={opt.id} value={`${attr.id}:${opt.id}`}>
                        {opt.value}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
          </select>
        )}

        <select
          value={currentParams.missing ?? ""}
          onChange={(e) => setParam("missing", e.target.value || null)}
          className="text-xs px-3 py-2 rounded-lg border border-[rgba(47,98,56,0.15)] bg-white"
        >
          <option value="">Filtros rápidos</option>
          <option value="invima">Sin INVIMA</option>
          <option value="images">Sin imágenes</option>
          <option value="category">Sin categoría</option>
        </select>

        {(currentParams.q ||
          currentParams.laboratory ||
          currentParams.category ||
          currentParams.presentation_type ||
          currentParams.collection ||
          currentParams.attribute_option ||
          currentParams.missing) && (
          <button
            onClick={() => router.push("/admin/productos")}
            className="text-xs text-[var(--color-leaf-700)] hover:text-[var(--color-leaf-900)] underline px-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Toolbar selección masiva */}
      {selected.size > 0 && (
        <div className="bg-[var(--color-leaf-100)] border border-[var(--color-leaf-500)] rounded-lg p-3 mb-3 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-[var(--color-leaf-900)]">
            {selected.size} seleccionado{selected.size === 1 ? "" : "s"}
          </span>
          <select
            value={bulkAction}
            onChange={(e) => {
              setBulkAction(e.target.value as BulkActionKind);
              setBulkValue("");
              setBulkSecondary("");
              setBulkMultiOptions(new Set());
              setBulkText("");
              setError(null);
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.2)] bg-white"
          >
            <option value="none">Acción masiva...</option>
            <optgroup label="Catálogo">
              <option value="category">Asignar categoría</option>
              <option value="tax">Asignar tarifa IVA</option>
              <option value="publish">Publicar al catálogo</option>
              <option value="archive">Archivar</option>
            </optgroup>
            <optgroup label="Colecciones">
              <option value="collection_add">Añadir a colección</option>
              <option value="collection_remove">Quitar de colección</option>
            </optgroup>
            <optgroup label="Atributos">
              <option value="attribute_set">Asignar valor de atributo</option>
              <option value="attribute_remove">Quitar atributo</option>
            </optgroup>
          </select>

          {bulkAction === "category" && (
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.2)] bg-white"
            >
              <option value="">— Sin categoría —</option>
              {filterOptions.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {bulkAction === "tax" && (
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.2)] bg-white"
            >
              <option value="">Selecciona tarifa</option>
              {filterOptions.tax_rates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {(bulkAction === "collection_add" || bulkAction === "collection_remove") && (
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.2)] bg-white"
            >
              <option value="">Selecciona colección</option>
              {filterOptions.collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {(bulkAction === "attribute_set" || bulkAction === "attribute_remove") && (
            <select
              value={bulkValue}
              onChange={(e) => {
                setBulkValue(e.target.value);
                setBulkSecondary("");
                setBulkMultiOptions(new Set());
                setBulkText("");
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.2)] bg-white"
            >
              <option value="">Selecciona atributo</option>
              {filterOptions.attributes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}

          {bulkAction === "attribute_set" && selectedAttribute && (
            <>
              {selectedAttribute.attribute_type === "boolean" && (
                <span className="text-[11px] text-[var(--color-earth-700)] italic">
                  Marcará como verdadero
                </span>
              )}
              {selectedAttribute.attribute_type === "select" && (
                <select
                  value={bulkSecondary}
                  onChange={(e) => setBulkSecondary(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.2)] bg-white"
                >
                  <option value="">Selecciona opción</option>
                  {selectedAttribute.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.value}
                    </option>
                  ))}
                </select>
              )}
              {selectedAttribute.attribute_type === "multi_select" && (
                <div className="flex flex-wrap gap-1 max-w-md">
                  {selectedAttribute.options.map((opt) => {
                    const checked = bulkMultiOptions.has(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setBulkMultiOptions((prev) => {
                            const next = new Set(prev);
                            if (next.has(opt.id)) next.delete(opt.id);
                            else next.add(opt.id);
                            return next;
                          })
                        }
                        className={`text-[11px] px-2 py-1 rounded-md border ${
                          checked
                            ? "bg-[var(--color-leaf-700)] text-white border-[var(--color-leaf-700)]"
                            : "bg-white text-[var(--color-leaf-900)] border-[rgba(47,98,56,0.2)]"
                        }`}
                      >
                        {opt.value}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedAttribute.attribute_type === "text" && (
                <input
                  type="text"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Valor"
                  className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.2)] bg-white"
                />
              )}
            </>
          )}

          {bulkAction !== "none" && (
            <button
              onClick={executeBulk}
              disabled={
                isPending ||
                (bulkAction === "tax" && !bulkValue) ||
                (bulkAction === "collection_add" && !bulkValue) ||
                (bulkAction === "collection_remove" && !bulkValue) ||
                ((bulkAction === "attribute_set" || bulkAction === "attribute_remove") && !bulkValue)
              }
              className="text-xs font-medium bg-[var(--color-leaf-700)] text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {isPending ? "Aplicando..." : "Aplicar"}
            </button>
          )}
          <button
            onClick={clearSelection}
            className="text-xs text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)] ml-auto"
          >
            Cancelar
          </button>
        </div>
      )}

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Vista tabla o grid */}
      {view === "table" ? (
        <TableView
          products={products}
          selected={selected}
          allOnPageSelected={allOnPageSelected}
          onToggleAll={toggleSelectAllOnPage}
          onToggle={toggleSelect}
        />
      ) : (
        <GridView
          products={products}
          selected={selected}
          onToggle={toggleSelect}
        />
      )}

      {/* Paginación */}
      {pagination.total_pages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-xs text-[var(--color-earth-700)]">
            Mostrando {(pagination.page - 1) * pagination.page_size + 1}-
            {Math.min(pagination.page * pagination.page_size, pagination.total)} de{" "}
            {pagination.total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setParam("page", String(pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] bg-white disabled:opacity-40"
            >
              ← Anterior
            </button>
            <span className="text-xs px-3 py-1.5 text-[var(--color-leaf-900)] font-medium">
              {pagination.page} / {pagination.total_pages}
            </span>
            <button
              onClick={() => setParam("page", String(pagination.page + 1))}
              disabled={pagination.page >= pagination.total_pages}
              className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] bg-white disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function TableView({
  products,
  selected,
  allOnPageSelected,
  onToggleAll,
  onToggle,
}: {
  products: ProductRow[];
  selected: Set<string>;
  allOnPageSelected: boolean;
  onToggleAll: () => void;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
      <div className="grid grid-cols-[40px_60px_1fr_140px_120px_100px_80px_120px] gap-3 px-4 py-2.5 bg-[var(--color-earth-50)] text-[10px] uppercase tracking-wider font-medium text-[var(--color-earth-700)]">
        <span>
          <input
            type="checkbox"
            checked={allOnPageSelected}
            onChange={onToggleAll}
            className="w-4 h-4 cursor-pointer"
          />
        </span>
        <span></span>
        <span>Producto</span>
        <span>Laboratorio</span>
        <span>Categoría</span>
        <span>IVA</span>
        <span>Precio</span>
        <span>Estado</span>
      </div>

      {products.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--color-earth-700)]">
          No se encontraron productos con esos filtros.
        </div>
      ) : (
        products.map((p) => (
          <div
            key={p.id}
            className={`grid grid-cols-[40px_60px_1fr_140px_120px_100px_80px_120px] gap-3 px-4 py-2.5 items-center border-b border-[#F0E9DB] last:border-b-0 hover:bg-[var(--color-earth-50)] ${
              selected.has(p.id) ? "bg-[var(--color-leaf-50)]" : ""
            }`}
          >
            <span>
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => onToggle(p.id)}
                className="w-4 h-4 cursor-pointer"
              />
            </span>
            <span>
              {p.primary_image_url ? (
                <img
                  src={p.primary_image_url}
                  alt={p.name}
                  className="w-10 h-10 object-cover rounded-md bg-[var(--color-earth-100)]"
                />
              ) : (
                <span className="block w-10 h-10 bg-[var(--color-earth-100)] rounded-md text-[9px] flex items-center justify-center text-[var(--color-earth-500)]">
                  s/img
                </span>
              )}
            </span>
            <Link
              href={`/admin/productos/${p.id}`}
              className="min-w-0 hover:text-[var(--color-leaf-700)]"
            >
              <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0 truncate">
                {p.name}
              </p>
              <p className="text-[10px] text-[var(--color-earth-500)] m-0 truncate">
                {p.invima_number ? (
                  <span className="text-[var(--color-leaf-700)] font-mono">
                    {p.invima_number}
                  </span>
                ) : (
                  <span className="italic">sin INVIMA</span>
                )}
                {p.presentation && <> · {p.presentation}</>}
              </p>
            </Link>
            <span className="text-xs text-[var(--color-earth-700)] truncate">
              {p.laboratory_name}
            </span>
            <span className="text-xs text-[var(--color-earth-700)] truncate">
              {p.category_name ?? <span className="italic text-[var(--color-earth-500)]">sin asignar</span>}
            </span>
            <span className="text-xs text-[var(--color-earth-700)] truncate">
              {p.tax_rate_name ?? "—"}
            </span>
            <span className="text-xs text-[var(--color-leaf-900)] font-medium">
              {formatCOP(p.price_cop)}
            </span>
            <span>
              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${statusPillClass(p.status)}`}>
                {statusLabel(p.status)}
              </span>
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function GridView({
  products,
  selected,
  onToggle,
}: {
  products: ProductRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.length === 0 ? (
        <div className="col-span-full py-12 text-center text-sm text-[var(--color-earth-700)]">
          No se encontraron productos.
        </div>
      ) : (
        products.map((p) => (
          <div
            key={p.id}
            className={`bg-white rounded-xl overflow-hidden border ${
              selected.has(p.id)
                ? "border-[var(--color-leaf-700)] ring-2 ring-[var(--color-leaf-100)]"
                : "border-[rgba(47,98,56,0.1)]"
            }`}
          >
            <div className="relative aspect-square bg-[var(--color-earth-100)] flex items-center justify-center">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => onToggle(p.id)}
                className="absolute top-2 left-2 w-4 h-4 cursor-pointer z-10"
              />
              {p.primary_image_url ? (
                <img src={p.primary_image_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-[var(--color-earth-500)] uppercase tracking-wider">
                  sin imagen
                </span>
              )}
              <span
                className={`absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded-lg font-medium ${statusPillClass(p.status)}`}
              >
                {statusLabel(p.status)}
              </span>
            </div>
            <Link href={`/admin/productos/${p.id}`} className="block p-3">
              <p className="text-xs text-[var(--color-earth-500)] uppercase tracking-wider m-0 mb-0.5">
                {p.laboratory_name}
              </p>
              <p className="font-serif text-sm text-[var(--color-leaf-900)] font-medium m-0 mb-1 line-clamp-2 min-h-[2.5em]">
                {p.name}
              </p>
              <p className="text-[10px] text-[var(--color-earth-500)] m-0 mb-1">
                {p.presentation ?? <span className="italic">sin presentación</span>}
              </p>
              <p className="font-serif text-base text-[var(--color-leaf-900)] font-medium m-0">
                {formatCOP(p.price_cop)}
              </p>
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
