"use client";

import { useState, useTransition } from "react";
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
};

export type EditorOptions = {
  categories: { id: string; name: string }[];
  tax_rates: { id: string; name: string; rate_percent: number; tax_type: string }[];
  laboratories: { id: string; name: string }[];
};

const PRESENTATIONS = [
  { value: "powder", label: "Polvo", unit: "g" as const },
  { value: "granulated", label: "Granulado", unit: "g" as const },
  { value: "drops", label: "Gotas", unit: "ml" as const },
  { value: "syrup", label: "Jarabe", unit: "ml" as const },
  { value: "suspension", label: "Suspensión", unit: "ml" as const },
  { value: "tablets", label: "Tabletas", unit: "units" as const },
  { value: "capsules", label: "Cápsulas", unit: "units" as const },
  { value: "softgels", label: "Softgels", unit: "units" as const },
  { value: "sublingual", label: "Sublingual", unit: "units" as const },
  { value: "other", label: "Otro", unit: "other" as const },
];

const UNIT_LABELS: Record<string, string> = {
  g: "gramos",
  ml: "mililitros",
  units: "unidades",
  other: "otro",
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

  const selectedPresentation = PRESENTATIONS.find((p) => p.value === presentationType);
  const expectedUnit = selectedPresentation?.unit ?? null;

  // Calcular precio público estimado (con IVA)
  const [previewPrice, setPreviewPrice] = useState(product.price_cop);
  const [previewTaxId, setPreviewTaxId] = useState(product.tax_rate_id ?? "");
  const previewTax = options.tax_rates.find((t) => t.id === previewTaxId);
  const ivaPercent = previewTax?.rate_percent ?? 0;
  const isIncluded = previewTax?.tax_type === "included";
  const priceWithTax = isIncluded
    ? Math.round(previewPrice * (1 + ivaPercent / 100))
    : previewPrice;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);

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
                  {PRESENTATIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>
                  Cantidad{" "}
                  {expectedUnit && (
                    <span className="text-[var(--color-earth-500)] font-normal">
                      ({UNIT_LABELS[expectedUnit]})
                    </span>
                  )}
                </Label>
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
                    defaultValue={product.content_unit ?? expectedUnit ?? ""}
                    className="max-w-[80px]"
                    disabled={!presentationType}
                  >
                    {expectedUnit ? (
                      <option value={expectedUnit}>{expectedUnit}</option>
                    ) : (
                      <>
                        <option value="">—</option>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="units">u</option>
                        <option value="other">otro</option>
                      </>
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
                Sin imágenes · próximamente: subir desde el editor
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
                    <img src={img.url} alt={img.alt_text ?? ""} className="w-full h-full object-cover" />
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
            <Label>Precio de venta * (sin IVA si lab es responsable)</Label>
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
                <p className="text-[10px] text-[var(--color-earth-700)] m-0">Precio público estimado:</p>
                <p className="font-serif text-base font-medium text-[var(--color-leaf-900)] m-0">
                  {formatCOP(priceWithTax)}
                  {isIncluded && (
                    <span className="text-[10px] font-sans font-normal text-[var(--color-earth-700)]">
                      {" "}(incluye {ivaPercent}% IVA)
                    </span>
                  )}
                </p>
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle>Inventario</SectionTitle>
            <Label>Stock disponible</Label>
            <Input
              name="stock"
              type="number"
              min="0"
              defaultValue={product.stock}
            />
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

            <Label className="mt-3">Categoría</Label>
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

            <Label className="mt-3">Tags (separados por coma)</Label>
            <Input
              name="tags"
              defaultValue={product.tags.join(", ")}
              placeholder="vegano, sin gluten, natural"
            />
          </Card>

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
    <label className={`block text-[11px] font-medium text-[var(--color-earth-700)] mb-1 ${className}`}>
      {children}
    </label>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.15)] bg-white text-[var(--color-leaf-900)] focus:outline-none focus:border-[var(--color-leaf-500)] disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.15)] bg-white text-[var(--color-leaf-900)] focus:outline-none focus:border-[var(--color-leaf-500)] resize-vertical ${props.className ?? ""}`}
    />
  );
}

function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.15)] bg-white text-[var(--color-leaf-900)] focus:outline-none focus:border-[var(--color-leaf-500)] disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}
