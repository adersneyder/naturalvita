/**
 * Tipos del catálogo público.
 *
 * Estos son los shapes que consumen las páginas públicas (`/tienda`, `/producto/[slug]`,
 * `/categoria/[slug]`, etc.) y los componentes de UI compartidos. Son distintos a los tipos
 * del admin: aquí solo viven campos visibles al cliente, en lenguaje de negocio.
 */

/** Stock cualitativo. El cliente no necesita saber el número exacto. */
export type StockBadge = "available" | "out";

export type PublicProductImage = {
  url: string;
  alt: string | null;
  is_primary: boolean;
};

export type PublicProductAttribute = {
  /** Slug del atributo: "vegano", "sin-gluten", "sabor", etc. */
  slug: string;
  /** Nombre visible: "Vegano", "Sin gluten", "Sabor". */
  label: string;
  /** Para boolean: true. Para select/multi: valor de la opción. */
  value: string | boolean;
};

/**
 * Resumen mínimo de producto para grilla, listados y carrito.
 * No incluye descripciones largas: las cargamos solo en /producto/[slug].
 */
export type PublicProductSummary = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  presentation: string | null;
  price_cop: number;
  /** Precio antes de descuento. Si está poblado y > price_cop, se muestra tachado. */
  compare_at_price_cop: number | null;
  stock_badge: StockBadge;
  primary_image: PublicProductImage | null;
  category: { slug: string; name: string } | null;
  laboratory: { slug: string; name: string };
};

/**
 * Producto completo para `/producto/[slug]`.
 * Incluye todo lo necesario para renderizar la ficha y el JSON-LD de Schema.org.
 */
export type PublicProductDetail = PublicProductSummary & {
  full_description: string | null;
  composition_use: string | null;
  dosage: string | null;
  warnings: string | null;
  invima_number: string | null;
  attributes: PublicProductAttribute[];
  images: PublicProductImage[];
  collections: Array<{ slug: string; name: string }>;
  /** Productos relacionados de la misma categoría (excluyendo este). Top 4. */
  related: PublicProductSummary[];
};

/**
 * Calcula el stock_badge a partir de los campos del admin.
 * Decisión de negocio: si track_stock es false, asumimos siempre disponible.
 * Si track_stock es true, "available" cuando stock > 0, "out" cuando stock <= 0.
 */
export function computeStockBadge(stock: number, trackStock: boolean): StockBadge {
  if (!trackStock) return "available";
  return stock > 0 ? "available" : "out";
}

/**
 * Format de precio en COP. Sin decimales, separador de miles con punto.
 * Ejemplo: 45000 → "$45.000".
 */
export function formatCop(cop: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cop);
}
