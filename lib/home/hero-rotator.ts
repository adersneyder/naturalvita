/**
 * lib/home/hero-rotator.ts
 *
 * Datos del rotador del hero del Home: 8 slots sincronizados que rotan
 * cada 3.25s (loop total 26s). Cada slot pinta una palabra, una imagen
 * de fondo y 3 productos recomendados.
 *
 * Los productos se calculan con la misma función `resolve_quiz` que usa
 * el resultado del quiz IA, fijando la etapa en "adulto" (la mayor parte
 * del tráfico y la que tiene mejor cobertura del catálogo). Cuando el
 * visitante usa el quiz puede pedir recomendaciones para otra etapa;
 * el hero solo muestra "lo más representativo" como teaser.
 *
 * Server-only: este módulo no debe importarse en componentes cliente.
 */

import { resolveQuiz } from "@/lib/quiz/queries";
import type { LifeStage } from "@/lib/quiz/types";

/** Etapa por defecto para el hero. La mayor parte del tráfico es "adulto". */
const HERO_STAGE: LifeStage = "adulto";

/** Tres productos como teaser; coincide con el tope del quiz (max 3). */
const PRODUCTS_PER_SLOT = 3;

export interface HeroProduct {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  price: number | null;
  tier: "direct" | "adjuvant";
}

export interface HeroSlot {
  /** Palabra visible (singular, concuerda con "Mejoramos tu"). */
  word: string;
  /** Slug de la necesidad en quiz_needs. */
  needSlug: string;
  /** Nombre del archivo de imagen en /public/home/. */
  imageFile: string;
  /** Hasta 3 productos para mostrar como teaser bajo la imagen. */
  products: HeroProduct[];
}

/**
 * Definición estática de los 8 slots. Orden = orden de rotación.
 * La palabra es lo que aparece en el rotador.
 * needSlug debe coincidir con quiz_needs.slug.
 * imageFile debe existir en /public/home/.
 */
const SLOT_DEFINITIONS: Omit<HeroSlot, "products">[] = [
  { word: "Energía",     needSlug: "energia",          imageFile: "hero-1-naturaleza.webp" },
  { word: "Calma",       needSlug: "calma",            imageFile: "hero-calma.webp" },
  { word: "Belleza",     needSlug: "belleza",          imageFile: "hero-belleza.webp" },
  { word: "Inmunidad",   needSlug: "defensas",         imageFile: "hero-inmunidad.webp" },
  { word: "Digestión",   needSlug: "digestion",        imageFile: "hero-digestion.webp" },
  { word: "Movilidad",   needSlug: "articulaciones",   imageFile: "hero-movilidad.webp" },
  { word: "Fuerza",      needSlug: "huesos-musculos",  imageFile: "hero-fuerza.webp" },
  { word: "Metabolismo", needSlug: "peso-metabolismo", imageFile: "hero-metabolismo.webp" },
];

/**
 * Resuelve los 8 slots del hero en paralelo (un resolve_quiz por slot)
 * y devuelve un array listo para serializar al cliente.
 *
 * Defensivo: si algún slot falla, sigue con productos vacíos (el slot
 * se sigue mostrando con imagen + palabra, sin teaser de productos).
 */
export async function getHeroSlots(): Promise<HeroSlot[]> {
  const results = await Promise.all(
    SLOT_DEFINITIONS.map(async (def) => {
      const products: HeroProduct[] = [];
      try {
        const res = await resolveQuiz(def.needSlug, HERO_STAGE);
        if (res && !res.isEmpty) {
          for (const p of res.products.slice(0, PRODUCTS_PER_SLOT)) {
            products.push({
              productId: p.productId,
              name: p.name,
              slug: p.slug,
              imageUrl: p.imageUrl,
              price: p.price,
              tier: p.tier,
            });
          }
        }
      } catch (err) {
        console.error(`[hero-rotator] resolveQuiz fallo para ${def.needSlug}:`, err);
      }
      return { ...def, products };
    }),
  );
  return results;
}
