"use client";

import { useEffect } from "react";
import { track } from "@/lib/savia/tracker";

/**
 * Dispara el evento `product_view` al montar la ficha. Se ejecuta una
 * vez por navegación a la ruta — Next.js desmonta y vuelve a montar al
 * cambiar de slug, así que esto es naturalmente correcto.
 *
 * No deduplicamos: en analytics es normal contar como "vista" cada
 * entrada a la ficha (back/forward, abrir desde el catálogo, refresh).
 * Eso refleja interés real.
 */
export default function ProductViewTracker({
  productId,
  slug,
  name,
  priceCop,
  categorySlug,
}: {
  productId: string;
  slug: string;
  name: string;
  priceCop: number;
  categorySlug: string | null;
}) {
  useEffect(() => {
    track("product_view", {
      product_id: productId,
      product_slug: slug,
      product_name: name,
      price_cop: priceCop,
      category_slug: categorySlug,
    });
  }, [productId, slug, name, priceCop, categorySlug]);

  return null;
}
