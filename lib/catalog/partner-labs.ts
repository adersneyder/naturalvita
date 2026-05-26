import { createClient } from "@/lib/supabase/server";

/**
 * lib/catalog/partner-labs.ts
 *
 * Lee los laboratorios aliados que tienen catálogo vivo, para la sección
 * "Laboratorios aliados" del Home.
 *
 * Regla: solo mostramos laboratorios con al menos un producto activo
 * (is_active = true, status = 'active'). Mostrar un aliado sin productos
 * detrás resta credibilidad en vez de sumarla. Cuando un laboratorio nuevo
 * (p. ej. Healthy America) cargue catálogo, entra solo — la lista es dinámica.
 *
 * Ordenados por cantidad de productos activos (el aliado con más surtido va
 * primero). Devuelve nombre + slug + conteo, para enlazar a /tienda?lab=slug.
 */

export interface PartnerLab {
  slug: string;
  name: string;
  productCount: number;
}

export async function getPartnerLabs(): Promise<PartnerLab[]> {
  const supabase = await createClient();

  // Traemos los productos activos con su laboratorio embebido y contamos en JS.
  // Es un dataset pequeño (cientos de filas), así que es más simple y portable
  // que una RPC, y no depende de tipos generados.
  const { data, error } = await supabase
    .from("products")
    .select("laboratory:laboratories!laboratory_id(slug, name)")
    .eq("is_active", true)
    .eq("status", "active");

  if (error || !data) return [];

  const counts = new Map<string, PartnerLab>();
  for (const row of data as Array<Record<string, unknown>>) {
    const labRel = row.laboratory as
      | { slug: string; name: string }
      | Array<{ slug: string; name: string }>
      | null;
    const lab = Array.isArray(labRel) ? labRel[0] : labRel;
    if (!lab || !lab.slug) continue;

    const existing = counts.get(lab.slug);
    if (existing) {
      existing.productCount += 1;
    } else {
      counts.set(lab.slug, {
        slug: lab.slug,
        name: lab.name,
        productCount: 1,
      });
    }
  }

  return Array.from(counts.values()).sort(
    (a, b) => b.productCount - a.productCount,
  );
}
