"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateProduct,
  setProductStatus,
  deleteProductImage,
  setMainImage,
} from "../../actions";

export type ProductImage = {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  status: string;
  needs_review: boolean;
  is_featured: boolean;
  short_description: string | null;
  description: string | null;
  ingredients: string | null;
  usage_instructions: string | null;
  warnings: string | null;
  price_cop: number;
  compare_at_price_cop: number | null;
  source_price_cop: number | null;
  source_price_updated_at: string | null;
  cost_cop: number | null;
  stock: number;
  track_stock: boolean;
  invima_number: string | null;
  presentation: string | null;
  presentation_type: string | null;
  content_value: number | null;
  content_unit: string | null;
  weight_grams: number | null;
  laboratory_id: string;
  laboratory_name: string;
  category_id: string | null;
  category_name: string | null;
  tax_rate_id: string | null;
  tax_rate_name: string | null;
  tax_rate_percent: number | null;
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  source_url: string | null;
  last_synced_at: string | null;
  scraped_at: string | null;
  images: ProductImage[];
  collection_ids: string[];
  attribute_values: Array<{
    attribute_id: string;
    option_id: string | null;
    text_value: string | null;
  }>;
};

export type PresentationTypeOption = {
  id: string;
  code: string;
  name: string;
  default_unit: string;
  unit_family: string;
};

export type ContentUnitOption = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  unit_family: string;
};

export type CollectionOption = {
  id: string;
  name: string;
  slug: string;
};

export type AttributeOption = {
  id: string;
  name: string;
  slug: string;
  attribute_type: string; // boolean | select | multi_select | text
  options: Array<{ id: string; value: string; slug: string }>;
};

export type EditorOptions = {
  categories: { id: string; name: string }[];
  tax_rates: { id: string; name: string; rate_percent: number; tax_type: string }[];
  laboratories: { id: string; name: string }[];
  presentation_types: PresentationTypeOption[];
  content_units: ContentUnitOption[];
  collections: CollectionOption[];
  attributes: AttributeOption[];
};

function formatCOP(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

export default function ProductEditor({
  product,
  options,
}: {
  product: ProductDetail;
  options: EditorOptions;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado controlado de presentación para selector condicional
  const [presentationType, setPresentationType] = useState<string>(
    product.presentation_type ?? "",
  );

  const selectedPresentation = useMemo(
    () => options.presentation_types.find((p) => p.code === presentationType),
    [options.presentation_types, presentationType],
  );
  const expectedUnitFamily = selectedPresentation?.unit_family ?? null;
  const compatibleUnits = useMemo(() => {
    if (!expectedUnitFamily) return options.content_units;
    return options.content_units.filter((u) => u.unit_family === expectedUnitFamily);
  }, [options.content_units, expectedUnitFamily]);

  // Precio público estimado
  const [previewPrice, setPreviewPrice] = useState(product.price_cop);
  const [previewTaxId, setPreviewTaxId] = useState(product.tax_rate_id ?? "");
  const previewTax = options.tax_rates.find((t) => t.id === previewTaxId);
  const ivaPercent = previewTax?.rate_percent ?? 0;
  const isIncluded = previewTax?.tax_type === "included";

  // Como el precio que el admin captura ES el precio final al cliente
  // (ya incluye IVA si la categoría es gravada), discriminamos hacia atrás
  // para mostrar la base imponible y el IVA discriminado.
  const ivaAmount = isIncluded && previewPrice > 0
    ? Math.round(previewPrice - previewPrice / (1 + ivaPercent / 100))
    : 0;
  const baseAmount = previewPrice - ivaAmount;

  // Colecciones seleccionadas
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    () => new Set(product.collection_ids),
  );

  function toggleCollection(id: string) {
    setSelectedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Atributos: estructura {attribute_id: {boolean: bool} | {option_id: string} | {option_ids: string[]} | {text: string}}
  type AttrValue =
    | { type: "boolean"; checked: boolean }
    | { type: "select"; option_id: string | null }
    | { type: "multi_select"; option_ids: Set<string> }
    | { type: "text"; text: string };

  const initialAttrState = useMemo(() => {
    const m = new Map<string, AttrValue>();
    for (const attr of options.attributes) {
      const existing = product.attribute_values.filter((v) => v.attribute_id === attr.id);
      if (attr.attribute_type === "boolean") {
        m.set(attr.id, { type: "boolean", checked: existing.length > 0 });
      } else if (attr.attribute_type === "select") {
        m.set(attr.id, { type: "select", option_id: existing[0]?.option_id ?? null });
      } else if (attr.attribute_type === "multi_select") {
        m.set(attr.id, {
          type: "multi_select",
          option_ids: new Set(
            existing.map((e) => e.option_id).filter((x): x is string => !!x),
          ),
        });
      } else {
        m.set(attr.id, { type: "text", text: existing[0]?.text_value ?? "" });
      }
    }
    return m;
  }, [options.attributes, product.attribute_values]);

  const [attrValues, setAttrValues] = useState<Map<string, AttrValue>>(initialAttrState);

  function setAttr(id: string, value: AttrValue) {
    setAttrValues((prev) => {
      const next = new Map(prev);
      next.set(id, value);
      return next;
    });
  }

  // Serializar atributos al payload final
  function serializeAttributes(): string {
    const out: Array<{
      attribute_id: string;
      option_ids: string[];
      text_value: string | null;
    }> = [];
    for (const [attrId, val] of attrValues.entries()) {
      if (val.type === "boolean") {
        if (val.checked) out.push({ attribute_id: attrId, option_ids: [], text_value: null });
      } else if (val.type === "select") {
        if (val.option_id) {
          out.push({ attribute_id: attrId, option_ids: [val.option_id], text_value: null });
        }
      } else if (val.type === "multi_select") {
        if (val.option_ids.size > 0) {
          out.push({
            attribute_id: attrId,
            option_ids: Array.from(val.option_ids),
            text_value: null,
          });
        }
      } else if (val.type === "text") {
        if (val.text.trim()) {
          out.push({ attribute_id: attrId, option_ids: [], text_value: val.text.trim() });
        }
      }
    }
    return JSON.stringify(out);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);

    // Inyectar colecciones y atributos serializados
    formData.set("collection_ids_json", JSON.stringify(Array.from(selectedCollections)));
    formData.set("attribute_values_json", serializeAttributes());

    startTransition(async () => {
      const result = await updateProduct(product.id, formData);
      if (!result.success) {
        setError(result.error ?? "Error al guardar");
        return;
      }
      setSuccess("Cambios guardados");
      setTimeout(() => setSuccess(null), 3000);
      router.refresh();
    });
  }

  function handleStatusChange(newStatus: "active" | "draft" | "archived") {
    setError(null);
    startTransition(async () => {
      const result = await setProductStatus(product.id, newStatus);
      if (!result.success) {
        setError(result.error ?? "Error al cambiar estado");
        return;
      }
      router.refresh();
    });
  }

  function handleDeleteImage(imageId: string) {
    if (!confirm("¿Eliminar esta imagen permanentemente?")) return;
    startTransition(async () => {
      const result = await deleteProductImage(imageId);
      if (!result.success) setError(result.error ?? "Error");
      else router.refresh();
    });
  }

  function handleSetMain(imageId: string) {
    startTransition(async () => {
      await setMainImage(product.id, imageId);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Topbar de acciones */}
      <div className="flex justify-between items-start mb-5 sticky top-0 bg-[var(--color-earth-50)] py-2 z-10 -mx-6 px-6 border-b border-[rgba(47,98,56,0.08)]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/productos"
            className="text-xs text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)]"
          >
            ← Volver
          </Link>
          <div>
            <h1 className="font-serif text-lg font-medium text-[var(--color-leaf-900)] m-0 line-clamp-1">
              {product.name}
            </h1>
            <p className="text-[11px] text-[var(--color-earth-500)] m-0 font-mono">
              {product.slug}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {product.status === "active" ? (
            <button
              type="button"
              onClick={() => handleStatusChange("draft")}
              disabled={isPending}
              className="text-xs font-medium text-[var(--color-earth-700)] border border-[rgba(47,98,56,0.2)] bg-white px-3 py-2 rounded-lg hover:bg-[var(--color-earth-100)]"
            >
              Despublicar
            </button>
          ) : product.status === "archived" ? (
            <button
              type="button"
              onClick={() => handleStatusChange("draft")}
              disabled={isPending}
              className="text-xs font-medium text-[var(--color-earth-700)] border border-[rgba(47,98,56,0.2)] bg-white px-3 py-2 rounded-lg"
            >
              Restaurar a borrador
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleStatusChange("archived")}
                disabled={isPending}
                className="text-xs font-medium text-[var(--color-earth-700)] hover:text-red-700 px-2 py-2"
              >
                Archivar
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("active")}
                disabled={isPending}
                className="text-xs font-medium bg-[var(--color-leaf-700)] text-white px-3 py-2 rounded-lg hover:bg-[var(--color-leaf-900)]"
              >
                Publicar al catálogo
              </button>
            </>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="text-xs font-medium bg-[var(--color-leaf-900)] text-white px-4 py-2 rounded-lg hover:bg-black disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 p-3 bg-[var(--color-leaf-100)] border border-[var(--color-leaf-500)] rounded-lg text-xs text-[var(--color-leaf-900)]">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* COLUMNA IZQUIERDA · contenido editable */}
        <div className="space-y-4">
          <Card>
            <Label>Nombre del producto *</Label>
            <Input name="name" defaultValue={product.name} required maxLength={200} />

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label>SKU (código interno)</Label>
                <Input
                  name="sku"
                  defaultValue={product.sku ?? ""}
                  placeholder="ej. NV-001"
                />
              </div>
              <div>
                <Label>Slug URL</Label>
                <Input value={product.slug} disabled className="bg-[var(--color-earth-50)]" />
                <p className="text-[10px] text-[var(--color-earth-500)] mt-1 m-0">
                  Auto-generado del nombre
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>Descripción</SectionTitle>
            <Label>Descripción corta · se muestra en tarjetas del catálogo</Label>
            <Textarea
              name="short_description"
              defaultValue={product.short_description ?? ""}
              rows={2}
              maxLength={300}
              placeholder="Una frase atractiva para mostrar en el catálogo"
            />
            <Label className="mt-3">Descripción completa</Label>
            <Textarea
              name="description"
              defaultValue={product.description ?? ""}
              rows={6}
              placeholder="Descripción detallada del producto..."
            />
          </Card>

          <Card>
            <SectionTitle>Información del producto</SectionTitle>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label>Tipo de presentación</Label>
                <Select
                  name="presentation_type"
                  value={presentationType}
                  onChange={(e) => setPresentationType(e.target.value)}
                >
                  <option value="">— Sin definir —</option>
                  {options.presentation_types.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <p className="text-[10px] text-[var(--color-earth-500)] mt-1 m-0">
                  ¿Falta uno?{" "}
                  <Link
                    href="/admin/configuracion/presentaciones"
                    className="text-[var(--color-leaf-700)] underline"
                  >
                    Editar tipos
                  </Link>
                </p>
              </div>
              <div>
                <Label>Cantidad y unidad</Label>
                <div className="flex gap-2">
                  <Input
                    name="content_value"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={product.content_value ?? ""}
                    placeholder="ej. 60"
                    disabled={!presentationType}
                  />
                  <Select
                    name="content_unit"
                    defaultValue={
                      product.content_unit ?? selectedPresentation?.default_unit ?? ""
                    }
                    className="max-w-[100px]"
                    disabled={!presentationType}
                  >
                    {compatibleUnits.length === 0 ? (
                      <option value="">—</option>
                    ) : (
                      compatibleUnits.map((u) => (
                        <option key={u.id} value={u.code}>
                          {u.symbol}
                        </option>
                      ))
                    )}
                  </Select>
                </div>
              </div>
            </div>

            <Label>Número de registro INVIMA</Label>
            <Input
              name="invima_number"
              defaultValue={product.invima_number ?? ""}
              placeholder="ej. RSA-003202-2017"
              className="font-mono"
            />
            {!product.invima_number && (
              <p className="text-[11px] text-[#854F0B] mt-1 m-0">
                ⚠ Sin INVIMA · obligatorio para productos de salud en Colombia
              </p>
            )}
          </Card>

          <Card>
            <SectionTitle>Composición y uso</SectionTitle>
            <Label>Composición / Ingredientes</Label>
            <Textarea
              name="ingredients"
              defaultValue={product.ingredients ?? ""}
              rows={4}
              placeholder="Lista de ingredientes activos y su concentración..."
            />
            <Label className="mt-3">Modo de uso / Posología</Label>
            <Textarea
              name="usage_instructions"
              defaultValue={product.usage_instructions ?? ""}
              rows={3}
              placeholder="Cómo se debe consumir, frecuencia, dosis..."
            />
            <Label className="mt-3">Advertencias y contraindicaciones</Label>
            <Textarea
              name="warnings"
              defaultValue={product.warnings ?? ""}
              rows={3}
              placeholder="Quién no debe consumirlo, efectos secundarios posibles..."
            />
          </Card>

          <Card>
            <SectionTitle>Imágenes ({product.images.length})</SectionTitle>
            {product.images.length === 0 ? (
              <p className="text-sm text-[var(--color-earth-700)] italic m-0 py-4 text-center">
                Sin imágenes · usa el botón &ldquo;Re-descargar imágenes&rdquo; en Fuentes de datos
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {product.images.map((img) => (
                  <div
                    key={img.id}
                    className={`relative aspect-square bg-[var(--color-earth-100)] rounded-lg overflow-hidden border-2 ${
                      img.is_primary
                        ? "border-[var(--color-leaf-700)]"
                        : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt_text ?? ""}
                      className="w-full h-full object-cover"
                    />
                    {img.is_primary && (
                      <span className="absolute top-1 left-1 text-[9px] bg-[var(--color-leaf-700)] text-white px-1.5 py-0.5 rounded font-medium">
                        Principal
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1 py-1">
                      {!img.is_primary && (
                        <button
                          type="button"
                          onClick={() => handleSetMain(img.id)}
                          disabled={isPending}
                          className="text-[10px] text-white hover:underline"
                          title="Marcar como principal"
                        >
                          Principal
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        disabled={isPending}
                        className="text-[10px] text-red-300 hover:text-red-100"
                        title="Eliminar"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle>SEO</SectionTitle>
            <Label>Meta title (Google · max 60 caracteres)</Label>
            <Input
              name="meta_title"
              defaultValue={product.meta_title ?? ""}
              maxLength={60}
              placeholder={`${product.name} | NaturalVita`}
            />
            <Label className="mt-3">Meta description (Google · max 160 caracteres)</Label>
            <Textarea
              name="meta_description"
              defaultValue={product.meta_description ?? ""}
              rows={2}
              maxLength={160}
              placeholder="Descripción que aparece en resultados de búsqueda..."
            />
          </Card>
        </div>

        {/* COLUMNA DERECHA · publicación, precio, taxonomía */}
        <div className="space-y-4">
          <Card>
            <SectionTitle>Estado</SectionTitle>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-[10px] px-2 py-1 rounded-lg font-medium ${
                  product.status === "active"
                    ? "bg-[var(--color-leaf-100)] text-[var(--color-leaf-900)]"
                    : product.status === "archived"
                      ? "bg-[#F1EFE8] text-[#444441]"
                      : "bg-[var(--color-earth-100)] text-[var(--color-earth-700)]"
                }`}
              >
                {product.status === "active"
                  ? "Activo"
                  : product.status === "archived"
                    ? "Archivado"
                    : "Borrador"}
              </span>
              {product.needs_review && (
                <span className="text-[10px] bg-[#FAEEDA] text-[#854F0B] px-2 py-1 rounded-lg font-medium">
                  Requiere revisión
                </span>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--color-leaf-900)] cursor-pointer">
              <input
                type="checkbox"
                name="is_featured"
                value="true"
                defaultChecked={product.is_featured}
                className="w-4 h-4"
              />
              Destacar en home (más vendidos)
            </label>
          </Card>

          <Card>
            <SectionTitle>Precio</SectionTitle>
            <Label>Precio de venta * (final al cliente, IVA incluido)</Label>
            <Input
              name="price_cop"
              type="number"
              min="0"
              step="100"
              defaultValue={product.price_cop}
              required
              onChange={(e) => setPreviewPrice(parseInt(e.target.value) || 0)}
            />
            {product.source_price_cop !== null && (
              <p className="text-[10px] text-[var(--color-earth-500)] mt-1 m-0">
                Precio del lab: {formatCOP(product.source_price_cop)}
                {product.source_price_cop !== product.price_cop && " (editado manualmente)"}
              </p>
            )}

            <Label className="mt-3">Precio comparativo (tachado · opcional)</Label>
            <Input
              name="compare_at_price_cop"
              type="number"
              min="0"
              step="100"
              defaultValue={product.compare_at_price_cop ?? ""}
              placeholder="Para mostrar descuento"
            />

            {previewTax && previewPrice > 0 && (
              <div className="mt-3 p-2 bg-[var(--color-leaf-50)] rounded">
                <p className="text-[10px] text-[var(--color-earth-700)] m-0">
                  Precio público al cliente:
                </p>
                <p className="font-serif text-base font-medium text-[var(--color-leaf-900)] m-0">
                  {formatCOP(previewPrice)}
                </p>
                {isIncluded && ivaPercent > 0 && (
                  <div className="mt-1.5 text-[10px] text-[var(--color-earth-700)] space-y-0.5">
                    <p className="m-0 flex justify-between">
                      <span>Base imponible:</span>
                      <span className="font-mono">{formatCOP(baseAmount)}</span>
                    </p>
                    <p className="m-0 flex justify-between">
                      <span>IVA {ivaPercent}%:</span>
                      <span className="font-mono">{formatCOP(ivaAmount)}</span>
                    </p>
                  </div>
                )}
                {!isIncluded && previewTax && (
                  <p className="text-[10px] text-[var(--color-earth-700)] mt-1 m-0">
                    Sin IVA discriminado ({previewTax.name})
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle>Inventario</SectionTitle>
            <Label>Stock disponible</Label>
            <Input name="stock" type="number" min="0" defaultValue={product.stock} />
            <label className="flex items-center gap-2 text-xs text-[var(--color-leaf-900)] cursor-pointer mt-2">
              <input
                type="checkbox"
                name="track_stock"
                value="true"
                defaultChecked={product.track_stock}
                className="w-4 h-4"
              />
              Controlar stock
            </label>
          </Card>

          <Card>
            <SectionTitle>Categorización</SectionTitle>
            <Label>Laboratorio</Label>
            <Input
              value={product.laboratory_name}
              disabled
              className="bg-[var(--color-earth-50)]"
            />

            <Label className="mt-3">Categoría (taxonomía única, define IVA)</Label>
            <Select name="category_id" defaultValue={product.category_id ?? ""}>
              <option value="">— Sin categoría —</option>
              {options.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Label className="mt-3">Tarifa de IVA *</Label>
            <Select
              name="tax_rate_id"
              value={previewTaxId}
              onChange={(e) => setPreviewTaxId(e.target.value)}
              required
            >
              <option value="">— Selecciona —</option>
              {options.tax_rates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>

            <Label className="mt-3">Tags internos (operación, separados por coma)</Label>
            <Input
              name="tags"
              defaultValue={product.tags.join(", ")}
              placeholder="promo-marzo, stock-critico"
            />
            <p className="text-[10px] text-[var(--color-earth-500)] mt-1 m-0">
              Para uso interno · no se muestran al cliente
            </p>
          </Card>

          {options.collections.length > 0 && (
            <Card>
              <SectionTitle>Colecciones (marketing y SEO)</SectionTitle>
              <p className="text-[10px] text-[var(--color-earth-500)] mt-0 m-0 mb-2">
                Agrupaciones temáticas. Un producto puede estar en varias.
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {options.collections.map((col) => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 text-xs text-[var(--color-leaf-900)] cursor-pointer hover:bg-[var(--color-earth-50)] px-1.5 py-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCollections.has(col.id)}
                      onChange={() => toggleCollection(col.id)}
                      className="w-3.5 h-3.5"
                    />
                    <span>{col.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-[var(--color-earth-500)] mt-2 m-0">
                <Link
                  href="/admin/configuracion/colecciones"
                  className="text-[var(--color-leaf-700)] underline"
                >
                  Gestionar colecciones
                </Link>
              </p>
            </Card>
          )}

          {options.attributes.length > 0 && (
            <Card>
              <SectionTitle>Atributos (filtros del catálogo)</SectionTitle>
              <p className="text-[10px] text-[var(--color-earth-500)] mt-0 m-0 mb-2">
                Características objetivas para que el cliente filtre.
              </p>
              <div className="space-y-2.5">
                {options.attributes.map((attr) => {
                  const val = attrValues.get(attr.id);
                  if (!val) return null;
                  if (val.type === "boolean") {
                    return (
                      <label
                        key={attr.id}
                        className="flex items-center gap-2 text-xs text-[var(--color-leaf-900)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={val.checked}
                          onChange={(e) =>
                            setAttr(attr.id, { type: "boolean", checked: e.target.checked })
                          }
                          className="w-3.5 h-3.5"
                        />
                        <span>{attr.name}</span>
                      </label>
                    );
                  }
                  if (val.type === "select") {
                    return (
                      <div key={attr.id}>
                        <Label>{attr.name}</Label>
                        <Select
                          value={val.option_id ?? ""}
                          onChange={(e) =>
                            setAttr(attr.id, {
                              type: "select",
                              option_id: e.target.value || null,
                            })
                          }
                        >
                          <option value="">— Sin asignar —</option>
                          {attr.options.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.value}
                            </option>
                          ))}
                        </Select>
                      </div>
                    );
                  }
                  if (val.type === "multi_select") {
                    return (
                      <div key={attr.id}>
                        <Label>{attr.name}</Label>
                        <div className="space-y-1">
                          {attr.options.map((opt) => (
                            <label
                              key={opt.id}
                              className="flex items-center gap-2 text-xs text-[var(--color-leaf-900)] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={val.option_ids.has(opt.id)}
                                onChange={(e) => {
                                  const next = new Set(val.option_ids);
                                  if (e.target.checked) next.add(opt.id);
                                  else next.delete(opt.id);
                                  setAttr(attr.id, { type: "multi_select", option_ids: next });
                                }}
                                className="w-3.5 h-3.5"
                              />
                              <span>{opt.value}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  // text
                  return (
                    <div key={attr.id}>
                      <Label>{attr.name}</Label>
                      <Input
                        value={val.text}
                        onChange={(e) =>
                          setAttr(attr.id, { type: "text", text: e.target.value })
                        }
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-[var(--color-earth-500)] mt-3 m-0">
                <Link
                  href="/admin/configuracion/atributos"
                  className="text-[var(--color-leaf-700)] underline"
                >
                  Gestionar atributos
                </Link>
              </p>
            </Card>
          )}

          {product.source_url && (
            <Card>
              <SectionTitle>Origen del dato</SectionTitle>
              <p className="text-[11px] text-[var(--color-earth-700)] m-0 mb-1">
                Última sincronización: {formatDate(product.last_synced_at)}
              </p>
              <a
                href={product.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--color-leaf-700)] hover:underline break-all"
              >
                Ver en {product.laboratory_name} ↗
              </a>
            </Card>
          )}
        </div>
      </div>
    </form>
  );
}

// =====================================================
// COMPONENTES DE FORMULARIO
// =====================================================

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-sm font-medium text-[var(--color-leaf-900)] m-0 mb-3">
      {children}
    </h2>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <label
      className={`block text-[11px] font-medium text-[var(--color-earth-700)] mb-1 ${className}`}
    >
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.15)] bg-white text-[var(--color-leaf-900)] focus:outline-none focus:border-[var(--color-leaf-500)] disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.15)] bg-white text-[var(--color-leaf-900)] focus:outline-none focus:border-[var(--color-leaf-500)] resize-vertical ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.15)] bg-white text-[var(--color-leaf-900)] focus:outline-none focus:border-[var(--color-leaf-500)] disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}
