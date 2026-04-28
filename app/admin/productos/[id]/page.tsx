import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin-auth";
import ProductEditor, {
  type ProductDetail,
  type EditorOptions,
  type AttributeOption,
} from "./_components/ProductEditor";

export default async function ProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getAdminUser();
  const { id } = await params;

  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      `id, name, slug, sku, status, needs_review, is_featured,
       short_description, description, ingredients, usage_instructions, warnings,
       price_cop, compare_at_price_cop, source_price_cop, source_price_updated_at,
       cost_cop, stock, track_stock,
       invima_number, presentation, presentation_type, content_value, content_unit, weight_grams,
       laboratory_id, category_id, tax_rate_id, tags,
       meta_title, meta_description,
       source_url, last_synced_at, scraped_at,
       last_image_error, last_image_attempt_at,
       laboratory:laboratories!laboratory_id(name, slug),
       category:categories!category_id(name),
       tax_rate:tax_rates!tax_rate_id(name, rate_percent),
       images:product_images!product_id(id, url, alt_text, sort_order, is_primary),
       product_collections!product_id(collection_id),
       product_attribute_values!product_id(attribute_id, option_id, text_value)`,
    )
    .eq("id", id)
    .single();

  if (error || !product) {
    notFound();
  }

  if (!product.id) redirect("/admin/productos");

  const lab = Array.isArray(product.laboratory) ? product.laboratory[0] : product.laboratory;
  const cat = Array.isArray(product.category) ? product.category[0] : product.category;
  const tax = Array.isArray(product.tax_rate) ? product.tax_rate[0] : product.tax_rate;
  const images = Array.isArray(product.images)
    ? [...product.images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : [];

  const collectionIds: string[] = Array.isArray(product.product_collections)
    ? product.product_collections.map((pc: { collection_id: string }) => pc.collection_id)
    : [];

  const attributeValues = Array.isArray(product.product_attribute_values)
    ? product.product_attribute_values.map(
        (av: {
          attribute_id: string;
          option_id: string | null;
          text_value: string | null;
        }) => ({
          attribute_id: av.attribute_id,
          option_id: av.option_id,
          text_value: av.text_value,
        }),
      )
    : [];

  const detail: ProductDetail = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    status: product.status,
    needs_review: product.needs_review,
    is_featured: product.is_featured,
    short_description: product.short_description,
    description: product.description,
    ingredients: product.ingredients,
    usage_instructions: product.usage_instructions,
    warnings: product.warnings,
    price_cop: product.price_cop,
    compare_at_price_cop: product.compare_at_price_cop,
    source_price_cop: product.source_price_cop,
    source_price_updated_at: product.source_price_updated_at,
    cost_cop: product.cost_cop,
    stock: product.stock,
    track_stock: product.track_stock,
    invima_number: product.invima_number,
    presentation: product.presentation,
    presentation_type: product.presentation_type,
    content_value: product.content_value ? parseFloat(String(product.content_value)) : null,
    content_unit: product.content_unit,
    weight_grams: product.weight_grams,
    laboratory_id: product.laboratory_id,
    laboratory_name: lab?.name ?? "—",
    category_id: product.category_id,
    category_name: cat?.name ?? null,
    tax_rate_id: product.tax_rate_id,
    tax_rate_name: tax?.name ?? null,
    tax_rate_percent: tax?.rate_percent ?? null,
    tags: product.tags ?? [],
    meta_title: product.meta_title,
    meta_description: product.meta_description,
    source_url: product.source_url,
    last_synced_at: product.last_synced_at,
    scraped_at: product.scraped_at,
    last_image_error: product.last_image_error ?? null,
    last_image_attempt_at: product.last_image_attempt_at ?? null,
    images: images.map(
      (img: {
        id: string;
        url: string;
        alt_text: string | null;
        sort_order: number | null;
        is_primary: boolean | null;
      }) => ({
        id: img.id,
        url: img.url,
        alt_text: img.alt_text,
        sort_order: img.sort_order ?? 0,
        is_primary: img.is_primary ?? false,
      }),
    ),
    collection_ids: collectionIds,
    attribute_values: attributeValues,
  };

  // Opciones para los selectores (todo en paralelo)
  const [
    { data: cats },
    { data: taxes },
    { data: labs },
    { data: presTypes },
    { data: units },
    { data: cols },
    { data: attrs },
  ] = await Promise.all([
    supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order"),
    supabase
      .from("tax_rates")
      .select("id, name, rate_percent, tax_type")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("laboratories").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("presentation_types")
      .select("id, code, name, default_unit, unit_family")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("content_units")
      .select("id, code, name, symbol, unit_family")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("collections")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("product_attributes")
      .select(
        "id, name, slug, attribute_type, sort_order, options:product_attribute_options(id, value, slug, sort_order)",
      )
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const attributes: AttributeOption[] = (attrs ?? []).map(
    (a: {
      id: string;
      name: string;
      slug: string;
      attribute_type: string;
      options: Array<{ id: string; value: string; slug: string; sort_order: number | null }>;
    }) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      attribute_type: a.attribute_type,
      options: (a.options ?? [])
        .slice()
        .sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0))
        .map((opt) => ({ id: opt.id, value: opt.value, slug: opt.slug })),
    }),
  );

  const options: EditorOptions = {
    categories: cats ?? [],
    tax_rates: taxes ?? [],
    laboratories: labs ?? [],
    presentation_types: presTypes ?? [],
    content_units: units ?? [],
    collections: cols ?? [],
    attributes,
  };

  return <ProductEditor product={detail} options={options} />;
}
