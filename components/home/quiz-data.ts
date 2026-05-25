/**
 * components/home/quiz-data.ts
 *
 * Define la estructura del Quiz-Hero del Home.
 *
 * Sprint 2 Sesión A. El quiz tiene dos pasos:
 *   1. ¿Para quién? (etapa de vida)
 *   2. ¿Qué quieres mejorar? (objetivo de salud)
 *
 * Cada combinación etapa+objetivo alimenta el matching IA (Haiku 4.5) que
 * selecciona 3 productos del catálogo con una razón por cada uno.
 *
 * El pre-filtro server-side usa los `keywords` (para FTS sobre search_vector)
 * y `categorySlugs` (para acotar por categoría) de cada opción antes de
 * pasar los candidatos a Haiku. Esto reduce tokens y latencia.
 */

import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Blocks,
  GraduationCap,
  User,
  HeartPulse,
  Flower2,
  Shield,
  Zap,
  Moon,
  Soup,
  Brain,
  Sparkles,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface StageOption {
  id: string;
  label: string;
  /** Texto descriptivo corto que aparece bajo el label */
  hint: string;
  icon: LucideIcon;
  /** Estilo de la card: humano (con foto) o abstracto (con ícono grande) */
  visual: "human" | "abstract";
  /** Keywords en español para el pre-filtro FTS sobre search_vector */
  keywords: string[];
  /** Slugs de categorías relevantes para acotar el pre-filtro */
  categorySlugs: string[];
}

export interface GoalOption {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  keywords: string[];
  /** Etapas para las que esta meta NO aplica (se ocultan dinámicamente) */
  hideForStages?: string[];
}

export interface QuizSelection {
  etapa: string;
  objetivo: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Paso 1 · Etapas de vida
// ─────────────────────────────────────────────────────────────────────────────

export const STAGES: StageOption[] = [
  {
    id: "adulto",
    label: "Para mí",
    hint: "Adultos 18–59",
    icon: User,
    visual: "abstract",
    keywords: ["adulto", "energía", "bienestar", "diario", "multivitamínico"],
    categorySlugs: ["vitaminas-y-minerales", "fitoterapeuticos", "proteinas"],
  },
  {
    id: "bebe",
    label: "Para un bebé",
    hint: "0–2 años",
    icon: Baby,
    visual: "human",
    keywords: ["bebé", "infantil", "gotas", "vitamina d", "hierro", "defensas"],
    categorySlugs: ["vitaminas-y-minerales", "alimentos-y-suplementos"],
  },
  {
    id: "nino",
    label: "Para un niño",
    hint: "3–12 años",
    icon: Blocks,
    visual: "human",
    keywords: ["niño", "infantil", "crecimiento", "defensas", "concentración", "vitaminas"],
    categorySlugs: ["vitaminas-y-minerales", "alimentos-y-suplementos", "fitoterapeuticos"],
  },
  {
    id: "adolescente",
    label: "Para un adolescente",
    hint: "13–17 años",
    icon: GraduationCap,
    visual: "abstract",
    keywords: ["adolescente", "concentración", "energía", "estudio", "piel", "acné"],
    categorySlugs: ["vitaminas-y-minerales", "dermocosmetica", "fitoterapeuticos"],
  },
  {
    id: "embarazo",
    label: "En embarazo",
    hint: "Gestación y lactancia",
    icon: HeartPulse,
    visual: "human",
    keywords: ["embarazo", "prenatal", "ácido fólico", "hierro", "gestación", "lactancia", "omega"],
    categorySlugs: ["vitaminas-y-minerales", "alimentos-y-suplementos"],
  },
  {
    id: "adulto-mayor",
    label: "Adulto mayor",
    hint: "60+ años",
    icon: Flower2,
    visual: "human",
    keywords: ["adulto mayor", "articulaciones", "huesos", "memoria", "calcio", "colágeno", "movilidad"],
    categorySlugs: ["vitaminas-y-minerales", "fitoterapeuticos", "alimentos-y-suplementos"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Paso 2 · Objetivos de salud
// ─────────────────────────────────────────────────────────────────────────────

export const GOALS: GoalOption[] = [
  {
    id: "defensas",
    label: "Reforzar defensas",
    hint: "Sistema inmune",
    icon: Shield,
    keywords: ["defensas", "inmune", "vitamina c", "zinc", "equinácea", "propóleo"],
  },
  {
    id: "energia",
    label: "Más energía",
    hint: "Vitalidad y enfoque",
    icon: Zap,
    keywords: ["energía", "vitalidad", "cansancio", "fatiga", "vitamina b", "ginseng", "hierro"],
    hideForStages: ["bebe"],
  },
  {
    id: "sueno",
    label: "Dormir mejor",
    hint: "Descanso y relajación",
    icon: Moon,
    keywords: ["sueño", "dormir", "descanso", "relajación", "melatonina", "valeriana", "estrés"],
    hideForStages: ["bebe"],
  },
  {
    id: "digestion",
    label: "Mejorar digestión",
    hint: "Salud digestiva",
    icon: Soup,
    keywords: ["digestión", "digestivo", "probiótico", "intestinal", "fibra", "estómago"],
  },
  {
    id: "animo",
    label: "Equilibrio y ánimo",
    hint: "Bienestar emocional",
    icon: Brain,
    keywords: ["ánimo", "estrés", "ansiedad", "emocional", "esencias florales", "magnesio", "relajación"],
    hideForStages: ["bebe"],
  },
  {
    id: "general",
    label: "Bienestar general",
    hint: "Cuidado integral",
    icon: Sparkles,
    keywords: ["bienestar", "general", "multivitamínico", "completo", "diario", "salud"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getStage(id: string): StageOption | undefined {
  return STAGES.find((s) => s.id === id);
}

export function getGoal(id: string): GoalOption | undefined {
  return GOALS.find((g) => g.id === id);
}

/** Devuelve los objetivos visibles para una etapa dada */
export function goalsForStage(stageId: string): GoalOption[] {
  return GOALS.filter((g) => !g.hideForStages?.includes(stageId));
}

/** Clave determinística para el caché del matching */
export function cacheKeyFor(etapa: string, objetivo: string): string {
  return `${etapa}:${objetivo}`;
}

/** Etiqueta legible de una combinación, para emails y resultados */
export function selectionLabel(etapa: string, objetivo: string): string {
  const s = getStage(etapa);
  const g = getGoal(objetivo);
  return `${s?.label ?? etapa} · ${g?.label ?? objetivo}`;
}
