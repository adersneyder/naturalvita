import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Breadcrumbs from "../../_components/Breadcrumbs";
import PriceTag from "../../_components/PriceTag";
import StockBadge from "../../_components/StockBadge";
import AddToCartButtons from "../../_components/AddToCartButtons";
import MarkdownRenderer from "../../_components/MarkdownRenderer";
import RelatedProducts from "./_RelatedProducts";

type Params = Promise<{ slug: string }>;

/**
 * Carga datos completos del producto + categoría + laboratorio + imágenes + atributos.
 * Solo trae productos activos con al menos una imagen (regla de visibilidad pública).
 */
async function getProductBySlug(slug: string) {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      `id, slug, name, sku, status, is_featured,
       short_description, full_description, composition_use, dosage, warnings,
       price_cop, compare_at_price_cop, stock, track_stock,
       invima_number, presentation, presentation_type,
       category:categories!category_id(id, name, slug),
       laboratory:laboratories!laboratory_id(id, name, slug),
       images:product_images(url, alt_text, is_primary, sort_order),
       attributes:product_attribute_values(
         attribute:product_attributes(name, slug, attribute_type, show_in_card),
         option:product_attribute_options(value)
       )`,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error) {
    // Loggeamos para diagnosticar 404 silenciosos. No tirar el error porque
    // single() con 0 rows también devuelve error code "PGRST116" y eso es
    // un not-found legítimo, no un bug.
    if (error.code !== "PGRST116") {
      console.error(`[/producto/${slug}] Supabase error:`, error.message, error.code);
    }
    return null;
  }
  if (!product) return null;

  const images = (product.images ?? []).slice().sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  // Regla de visibilidad: producto sin imagen no se muestra al público
  if (images.length === 0) return null;

  const cat = Array.isArray(product.category) ? product.category[0] : product.category;
  const lab = Array.isArray(product.laboratory) ? product.laboratory[0] : product.laboratory;

  return {
    ...product,
    images,
    category: cat,
    laboratory: lab,
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return { title: "Producto no encontrado", robots: { index: false, follow: false } };
  }

  const title = product.name;
  const description =
    product.short_description ??
    `${product.name}${product.presentation ? ` · ${product.presentation}` : ""}`;
  const ogImage = product.images[0]?.url;

  return {
    title,
    description,
    alternates: {
      canonical: `https://naturalvita.co/producto/${product.slug}`,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: `https://naturalvita.co/producto/${product.slug}`,
      images: ogImage ? [{ url: ogImage, alt: product.name }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const isAvailable = !product.track_stock || product.stock > 0;
  const primaryImage = product.images[0];

  // Recolectar atributos para badges visibles (los que tienen show_in_card=true)
  const visibleAttributes = (product.attributes ?? [])
    .map((av) => {
      const attr = Array.isArray(av.attribute) ? av.attribute[0] : av.attribute;
      const opt = Array.isArray(av.option) ? av.option[0] : av.option;
      return { attr, opt };
    })
    .filter((x) => x.attr?.show_in_card);

  // JSON-LD schema.org Product para SEO enriquecido en Google
  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.short_description ?? "",
    image: product.images.map((img) => img.url),
    sku: product.sku ?? undefined,
    brand: product.laboratory
      ? { "@type": "Brand", name: product.laboratory.name }
      : undefined,
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      url: `https://naturalvita.co/producto/${product.slug}`,
      priceCurrency: "COP",
      price: product.price_cop,
      availability: isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Tienda",
        item: "https://naturalvita.co/tienda",
      },
      product.category && {
        "@type": "ListItem",
        position: 2,
        name: product.category.name,
        item: `https://naturalvita.co/categoria/${product.category.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
      },
    ].filter(Boolean),
  };

  const breadcrumbsItems = [
    { label: "Tienda", href: "/tienda" },
    ...(product.category
      ? [{ label: product.category.name, href: `/categoria/${product.category.slug}` }]
      : []),
    { label: product.name },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <Breadcrumbs items={breadcrumbsItems} />

        {/* HERO: imagen + info de compra */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 mt-6">
          {/* Galería */}
          <div className="space-y-3">
            <div className="aspect-square bg-[var(--color-earth-50)] rounded-2xl overflow-hidden">
              {primaryImage && (
                <Image
                  src={primaryImage.url}
                  alt={primaryImage.alt_text ?? product.name}
                  width={800}
                  height={800}
                  className="w-full h-full object-contain"
                  priority
                  unoptimized
                />
              )}
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.slice(0, 5).map((img, idx) => (
                  <div
                    key={idx}
                    className="aspect-square bg-[var(--color-earth-50)] rounded-lg overflow-hidden"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt_text ?? product.name}
                      width={150}
                      height={150}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info de compra */}
          <div className="lg:py-4">
            {product.laboratory && (
              <Link
                href={`/laboratorio/${product.laboratory.slug}`}
                className="text-xs uppercase tracking-wider text-[var(--color-earth-700)] hover:text-[var(--color-iris-700)] font-medium"
              >
                {product.laboratory.name}
              </Link>
            )}
            <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] mt-2 mb-2 leading-tight">
              {product.name}
            </h1>
            {product.presentation && (
              <p className="text-sm text-[var(--color-earth-700)] m-0 mb-4">
                {product.presentation}
              </p>
            )}

            <div className="flex items-center gap-3 mb-4">
              <StockBadge stock={product.stock} trackStock={product.track_stock} />
              {visibleAttributes.map(({ attr, opt }, i) => (
                <span
                  key={i}
                  className="inline-flex px-2.5 py-1 rounded-full bg-[var(--color-leaf-50)] text-[var(--color-leaf-700)] text-xs font-medium"
                >
                  {attr?.attribute_type === "boolean" ? attr.name : opt?.value ?? attr?.name}
                </span>
              ))}
            </div>

            <div className="mb-6">
              <PriceTag
                price={product.price_cop}
                compareAtPrice={product.compare_at_price_cop}
                size="lg"
              />
            </div>

            {/* Short description con énfasis */}
            {product.short_description && (
              <p className="text-base text-[var(--color-earth-900)] leading-relaxed mb-6 italic">
                {product.short_description}
              </p>
            )}

            <AddToCartButtons
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                presentation: product.presentation,
                price_cop: product.price_cop,
                image_url: primaryImage?.url ?? null,
                stock: product.stock,
                track_stock: product.track_stock,
              }}
            />

            {product.invima_number && (
              <p className="text-xs text-[var(--color-earth-500)] mt-6 m-0">
                Registro INVIMA: <span className="font-mono">{product.invima_number}</span>
              </p>
            )}
          </div>
        </div>

        {/* SECCIONES DE CONTENIDO EDITORIAL */}
        <div className="mt-14 lg:mt-20 max-w-3xl space-y-10">
          {product.full_description && (
            <section>
              <h2 className="font-serif text-2xl text-[var(--color-leaf-900)] mb-3 m-0">
                Descripción
              </h2>
              <MarkdownRenderer text={product.full_description} size="md" />
            </section>
          )}

          {product.composition_use && (
            <section>
              <h2 className="font-serif text-2xl text-[var(--color-leaf-900)] mb-3 m-0">
                Composición
              </h2>
              <MarkdownRenderer text={product.composition_use} size="md" />
            </section>
          )}

          {product.dosage && (
            <section>
              <h2 className="font-serif text-2xl text-[var(--color-leaf-900)] mb-3 m-0">
                Modo de uso
              </h2>
              <MarkdownRenderer text={product.dosage} size="md" />
            </section>
          )}

          {product.warnings && (
            <section>
              <h2 className="font-serif text-2xl text-[var(--color-leaf-900)] mb-3 m-0">
                Advertencias
              </h2>
              <MarkdownRenderer text={product.warnings} size="md" />
            </section>
          )}
        </div>

        {/* PRODUCTOS RELACIONADOS */}
        {product.category && (
          <RelatedProducts
            currentProductId={product.id}
            categoryId={product.category.id}
            categoryName={product.category.name}
          />
        )}
      </div>
    </>
  );
}
