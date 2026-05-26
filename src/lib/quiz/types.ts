// lib/quiz/types.ts
// Tipos compartidos del motor de recomendaciones del quiz NaturalVita.

/** Etapas de vida que el quiz contempla. Coinciden con suitable_stages en BD. */
export type LifeStage =
  | "bebe"
  | "nino"
  | "adolescente"
  | "embarazo"
  | "adulto"
  | "adulto-mayor";

export const LIFE_STAGES: { slug: LifeStage; label: string; hint: string }[] = [
  { slug: "bebe", label: "Bebé", hint: "0 a 2 años" },
  { slug: "nino", label: "Niño", hint: "3 a 12 años" },
  { slug: "adolescente", label: "Adolescente", hint: "13 a 17 años" },
  { slug: "adulto", label: "Adulto", hint: "18 a 59 años" },
  { slug: "adulto-mayor", label: "Adulto mayor", hint: "60 años o más" },
  { slug: "embarazo", label: "Embarazo o lactancia", hint: "Etapa de gestación" },
];

/** Necesidad de salud que ofrece el quiz (fila de quiz_needs). */
export interface QuizNeed {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon: string | null;
}

/** Producto recomendado, ya resuelto para mostrar en el resultado del quiz. */
export interface QuizRecommendedProduct {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  tier: "direct" | "adjuvant";
  score: number;
  reason: string | null;
  averageRating: number | null;
  reviewCount: number;
}

/** Resultado completo de una consulta al quiz. */
export interface QuizResult {
  need: QuizNeed;
  stage: LifeStage;
  products: QuizRecommendedProduct[];
  /** true cuando no hay productos aptos para la combinación (ej. bebé). */
  isEmpty: boolean;
}

/** Parámetros del umbral de salida. Configurables sin tocar la lógica. */
export const QUIZ_THRESHOLD = {
  /** Máximo de recomendaciones directas a mostrar. */
  maxDirect: 2,
  /** Máximo de coadyuvantes a mostrar. */
  maxAdjuvant: 1,
  /** Score mínimo para que una coadyuvante sea elegible. */
  minAdjuvantScore: 45,
  /** Tope absoluto de productos en el resultado. */
  maxTotal: 3,
} as const;
