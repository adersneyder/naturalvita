/**
 * Invalida las páginas públicas del catálogo cuando se muta data que
 * afecta lo que se muestra al visitante (productos, laboratorios,
 * colecciones, categorías).
 *
 * Llámalo desde toda server action o endpoint admin que:
 *   - Cree, edite, active, desactive o elimine un producto.
 *   - Cree, edite o elimine un laboratorio.
 *   - Asocie/desasocie un producto a una colección.
 *
 * No hace falta llamarlo para mutaciones que solo afectan al admin
 * (ej. notas internas, asignación de owner, etc.).
 *
 * Cubre tanto las rutas estáticas (/tienda, /laboratorio) como las
 * dinámicas (`/laboratorio/[slug]`, `/categoria/[slug]`,
 * `/coleccion/[slug]`). Para rutas dinámicas usamos `'page'` como tipo
 * para que Next invalide TODAS las instancias generadas.
 */
import { revalidatePath } from "next/cache";

export function revalidatePublicCatalog(): void {
  // Índices estáticos
  revalidatePath("/");
  revalidatePath("/tienda");
  revalidatePath("/laboratorio");

  // Páginas dinámicas: 'page' invalida todas las variantes del slug.
  revalidatePath("/laboratorio/[slug]", "page");
  revalidatePath("/categoria/[slug]", "page");
  revalidatePath("/coleccion/[slug]", "page");
}

/**
 * Cuando solo cambió un producto puntual (edición de descripción,
 * imágenes, etc.) revalidamos su ficha pública además del índice.
 */
export function revalidatePublicProduct(slug: string | null | undefined): void {
  revalidatePublicCatalog();
  if (slug) revalidatePath(`/producto/${slug}`);
}
