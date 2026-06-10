/**
 * lib/guias/hero-gallery.ts
 *
 * Galería de imágenes hero disponibles para guías editoriales. Son los
 * assets editoriales del sitio (public/home/*) — on-brand, optimizados y
 * ya servidos por el CDN de Vercel.
 *
 * El generador de guías ofrece estas opciones + las fotos de los productos
 * citados; el admin elige la definitiva. `themes` alimenta la sugerencia
 * automática de la IA (matchea el tema del artículo contra estas etiquetas).
 */

export type HeroGalleryItem = {
  url: string;
  alt: string;
  /** Etiquetas temáticas para la sugerencia automática. */
  themes: string[];
};

export const HERO_GALLERY: HeroGalleryItem[] = [
  {
    url: "/home/hero-calma.webp",
    alt: "Ambiente de calma y descanso con productos naturales",
    themes: ["sueño", "calma", "estrés", "ansiedad", "relajación", "dormir", "magnesio", "melatonina"],
  },
  {
    url: "/home/hero-inmunidad.webp",
    alt: "Suplementos para apoyar las defensas y el sistema inmune",
    themes: ["inmunidad", "defensas", "vitamina c", "vitamina d", "zinc", "resfriado", "gripa"],
  },
  {
    url: "/home/hero-belleza.webp",
    alt: "Productos naturales para piel, cabello y uñas",
    themes: ["belleza", "piel", "cabello", "uñas", "colágeno", "biotina", "antiedad"],
  },
  {
    url: "/home/hero-digestion.webp",
    alt: "Apoyo digestivo con productos naturales",
    themes: ["digestión", "probióticos", "fibra", "intestino", "estreñimiento", "gastritis"],
  },
  {
    url: "/home/hero-fuerza.webp",
    alt: "Suplementos deportivos y de fuerza muscular",
    themes: ["deporte", "fuerza", "músculo", "proteína", "creatina", "bcaa", "entrenamiento", "mujer"],
  },
  {
    url: "/home/hero-movilidad.webp",
    alt: "Apoyo articular y de movilidad",
    themes: ["articulaciones", "movilidad", "glucosamina", "cartílago", "rodillas", "artrosis"],
  },
  {
    url: "/home/hero-metabolismo.webp",
    alt: "Energía y metabolismo con suplementos naturales",
    themes: ["energía", "metabolismo", "peso", "fatiga", "tiroides", "omega"],
  },
  {
    url: "/home/hero-1-naturaleza.webp",
    alt: "Ingredientes naturales y plantas medicinales",
    themes: ["natural", "plantas", "fitoterapia", "general", "invima", "regulación"],
  },
];
