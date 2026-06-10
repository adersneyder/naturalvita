/**
 * lib/guias/registry.ts
 *
 * Índice declarativo de guías editoriales. Cada artículo vive en su
 * propia ruta /guias/[slug] con su componente TSX, pero su metadata
 * resumida vive aquí para que el index /guias y el sitemap.xml puedan
 * listarlas sin importarlas todas.
 */

export type GuiaIndexEntry = {
  slug: string;
  title: string;
  dek: string;
  publishedDate: string;
  updatedDate?: string;
  readingTime: string;
  heroImage: { url: string; alt: string };
};

export const GUIAS_INDEX: GuiaIndexEntry[] = [
  {
    slug: "mejor-magnesio-para-dormir-colombia",
    title: "Mejor magnesio para dormir en Colombia: cómo elegir en 2026",
    dek: "Citrato, cloruro o glicinato — cuál apoya mejor el sueño según la evidencia, qué dosis tomar y qué exigir en la etiqueta antes de comprar.",
    publishedDate: "2026-06-09",
    readingTime: "7 min",
    heroImage: {
      url: "/home/hero-calma.webp",
      alt: "Suplementos de magnesio para apoyar el sueño nocturno",
    },
  },
  {
    slug: "vitamina-d-colombia-como-elegir",
    title: "Vitamina D en Colombia: cómo saber si te falta y qué tomar",
    dek: "Pese al sol, la deficiencia de vitamina D es frecuente en oficinas y zonas urbanas. Cuándo medirla, qué dosis es segura y qué presentaciones hay en el catálogo.",
    publishedDate: "2026-06-09",
    readingTime: "8 min",
    heroImage: {
      url: "/home/hero-inmunidad.webp",
      alt: "Suplementos de vitamina D y luz solar en Colombia",
    },
  },
  {
    slug: "como-verificar-invima-suplemento",
    title: "Cómo verificar el registro INVIMA de un suplemento (paso a paso)",
    dek: "Cualquier suplemento que se venda legalmente en Colombia debe tener registro INVIMA. Te mostramos cómo consultarlo en 2 minutos y qué hacer si no aparece.",
    publishedDate: "2026-06-09",
    readingTime: "5 min",
    heroImage: {
      url: "/home/hero-1-naturaleza.webp",
      alt: "Verificación pública de registros sanitarios INVIMA en Colombia",
    },
  },
  {
    slug: "colageno-hidrolizado-como-elegir",
    title: "Colágeno hidrolizado: cómo elegir uno bueno en Colombia",
    dek: "Tipos de colágeno, qué dosis funciona, por qué la vitamina C importa, y diferencias entre cápsulas, polvos y bebibles del mercado colombiano.",
    publishedDate: "2026-06-09",
    readingTime: "7 min",
    heroImage: {
      url: "/home/hero-belleza.webp",
      alt: "Suplementos de colágeno hidrolizado con vitamina C",
    },
  },
  {
    slug: "multivitaminico-mujer-colombia",
    title: "Multivitamínico para mujer en Colombia: qué buscar y qué evitar",
    dek: "Las dosis recomendadas por etapa, los nutrientes que sí necesitas y los que sobran. Cómo leer una etiqueta y opciones disponibles con INVIMA.",
    publishedDate: "2026-06-09",
    readingTime: "8 min",
    heroImage: {
      url: "/home/hero-fuerza.webp",
      alt: "Mujer adulta tomando multivitamínico con desayuno",
    },
  },
];
