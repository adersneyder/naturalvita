import { createClient } from "@/lib/supabase/server";
import {
  computeStockBadge,
  type PublicProductDetail,
  type PublicProductSummary,
} from "./types";

/**
 * Filtro común: producto activo, publicado, con imagen primaria.
 * Sin imagen no se publica al catálogo público (decisión de negocio).
 *
 * No usamos el campo `status` porque la regla de visibilidad del admin se basa
 * en `is_active`. La RLS pública también filtra por `is_active = true`.
 */
const PUBLIC_PRODUCT_SELECT = `
  id, slug, name, short_description, presentation,
  price_cop, compare_at_price_cop, stock, track_stock,
  category:categories!category_id(slug, name),
  laboratory:laboratories!laboratory_id(slug, name),
  images:product_images!product_id(url, alt_text, is_primary)
`;

type RawProductRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  presentation: string | null;
  price_cop: number;
  compare_at_price_cop: number | null;
  stock: number;
  track_stock: boolean;
  category: Array<{ slug: string; name: string }> | { slug: string; name: string } | null;
  laboratory: Array<{ slug: string; name: string }> | { slug: string; name: string };
  images: Array<{ url: string; alt_text: string | null; is_primary: boolean }> | null;
};

function unwrapRelation<T>(rel: T | T[] | null): T | null {
  if (rel === null || rel === undefined) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function toSummary(row: RawProductRow): PublicProductSummary | null {
  const images = row.images ?? [];
  const primary = images.find((img) => img.is_primary) ?? images[0];
  if (!primary) return null; // Sin imagen → no se publica

  const lab = unwrapRelation(row.laboratory);
  if (!lab) return null;

  const cat = unwrapRelation(row.category);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    short_description: row.short_description,
    presentation: row.presentation,
    price_cop: row.price_cop,
    compare_at_price_cop: row.compare_at_price_cop,
    stock_badge: computeStockBadge(row.stock, row.track_stock),
    primary_image: {
      url: primary.url,
      alt: primary.alt_text,
      is_primary: true,
    },
    category: cat,
    laboratory: lab,
  };
}

/**
 * Carga la ficha completa de un producto por slug.
 * Devuelve null si no existe, no está activo, o no tiene imagen.
 *
 * Esta query trae todo lo necesario para renderizar /producto/[slug] sin queries
 * adicionales: imágenes, atributos visibles, colecciones, productos relacionados.
 */
export async function getProductBySlug(slug: string): Promise<PublicProductDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, slug, name, short_description, full_description, composition_use,
      dosage, warnings, presentation, invima_number,
      price_cop, compare_at_price_cop, stock, track_stock,
      category:categories!category_id(slug, name),
      laboratory:laboratories!laboratory_id(slug, name),
      images:product_images!product_id(url, alt_text, is_primary, sort_order),
      attributes:product_attribute_values!product_id(
        attribute:product_attributes!attribute_id(slug, name, attribute_type, show_in_card),
        option:product_attribute_options!option_id(value)
      ),
      collections:product_collections!product_id(
        collection:collections!collection_id(slug, name, is_active)
      )
    `,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  // Resolver relaciones (Supabase a veces las devuelve como array, a veces como objeto)
  const lab = unwrapRelation(data.laboratory) as { slug: string; name: string } | null;
  if (!lab) return null;

  const cat = unwrapRelation(data.category) as { slug: string; name: string } | null;

  // Imágenes ordenadas
  const rawImages = (data.images ?? []) as Array<{
    url: string;
    alt_text: string | null;
    is_primary: boolean;
    sort_order: number | null;
  }>;
  if (rawImages.length === 0) return null; // Sin imagen → no se publica

  const sortedImages = [...rawImages].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order ?? 999) - (b.sort_order ?? 999);
  });

  const primary = sortedImages[0];

  // Atributos visibles en la ficha
  const rawAttrs = (data.attributes ?? []) as Array<{
    attribute:
      | { slug: string; name: string; attribute_type: string; show_in_card: boolean }
      | Array<{ slug: string; name: string; attribute_type: string; show_in_card: boolean }>;
    option: { value: string } | Array<{ value: string }> | null;
  }>;

  const attributes = rawAttrs
    .map((av) => {
      const attr = unwrapRelation(av.attribute);
      const opt = unwrapRelation(av.option);
      if (!attr) return null;
      return {
        slug: attr.slug,
        label: attr.name,
        value: attr.attribute_type === "boolean" ? true : (opt?.value ?? ""),
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  // Colecciones activas
  const rawCols = (data.collections ?? []) as Array<{
    collection:
      | { slug: string; name: string; is_active: boolean }
      | Array<{ slug: string; name: string; is_active: boolean }>;
  }>;
  const collections = rawCols
    .map((c) => unwrapRelation(c.collection))
    .filter((c): c is { slug: string; name: string; is_active: boolean } => !!c && c.is_active)
    .map(({ slug, name }) => ({ slug, name }));

  // Productos relacionados (top 4 misma categoría, excluyendo este)
  let related: PublicProductSummary[] = [];
  if (cat) {
    const { data: relatedData } = await supabase
      .from("products")
      .select(PUBLIC_PRODUCT_SELECT)
      .eq("is_active", true)
      .eq("category_id", (await getCategoryIdBySlug(cat.slug)) ?? "")
      .neq("id", data.id)
      .limit(8); // pedimos 8 para tener margen al filtrar los sin imagen

    related = ((relatedData ?? []) as RawProductRow[])
      .map(toSummary)
      .filter((p): p is PublicProductSummary => p !== null)
      .slice(0, 4);
  }

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    short_description: data.short_description,
    full_description: data.full_description,
    composition_use: data.composition_use,
    dosage: data.dosage,
    warnings: data.warnings,
    presentation: data.presentation,
    invima_number: data.invima_number,
    price_cop: data.price_cop,
    compare_at_price_cop: data.compare_at_price_cop,
    stock_badge: computeStockBadge(data.stock, data.track_stock),
    primary_image: {
      url: primary.url,
      alt: primary.alt_text,
      is_primary: true,
    },
    images: sortedImages.map((img) => ({
      url: img.url,
      alt: img.alt_text,
      is_primary: img.is_primary,
    })),
    category: cat,
    laboratory: lab,
    attributes,
    collections,
    related,
  };
}

async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id").eq("slug", slug).single();
  return data?.id ?? null;
}

/**
 * Lista de slugs de productos activos. Útil para `generateStaticParams` en /producto/[slug]
 * y para el sitemap.xml. Solo productos con imagen.
 */
export async function listActiveProductSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("slug, images:product_images!product_id(id)")
    .eq("is_active", true);

  if (!data) return [];

  return data
    .filter((p) => {
      const imgs = (p.images ?? []) as Array<unknown>;
      return imgs.length > 0;
    })
    .map((p) => p.slug);
}
