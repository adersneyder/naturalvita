import type {
  Scraper,
  ScrapeBatchResult,
  ScrapedProduct,
  ScrapedImage,
  ScraperConfig,
} from "./types";

/**
 * Extractor robusto de campos especiales de descripciones HTML de WooCommerce.
 * Los laboratorios colombianos suelen meter INVIMA, composición, modo de uso
 * directamente en el HTML del campo description.
 */

const INVIMA_PATTERNS = [
  /(?:registro\s*)?invima[\s:]*([A-Z0-9\-_]+)/i,
  /(?:registro\s*sanitario)[\s:]*([A-Z]{2,4}[A-Z0-9\-_]+)/i,
  /\b([A-Z]{2,3}\d{4}-\d{6,})/,
  /\b(NSO[A-Z]?\d{4,})/i,
  /\b(RSA-\d{6}-\d{4})/i,
  /\b(SD\d{4}-\d{7})/i,
];

function extractInvima(text: string): string | null {
  if (!text) return null;
  const cleanText = text.replace(/<[^>]+>/g, " ");
  for (const pattern of INVIMA_PATTERNS) {
    const match = cleanText.match(pattern);
    if (match?.[1]) return match[1].trim().toUpperCase();
  }
  return null;
}

function extractSection(html: string, sectionTitles: string[]): string | null {
  if (!html) return null;
  for (const title of sectionTitles) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?:<[^>]+>)?\\s*${escaped}\\s*(?:</?[^>]+>)?\\s*[:.]?\\s*([\\s\\S]+?)(?=<(?:h[1-6]|p[^>]*>\\s*<strong)|$)`,
      "i",
    );
    const match = html.match(regex);
    if (match?.[1]) {
      const cleaned = match[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length > 3 && cleaned.length < 2000) return cleaned;
    }
  }
  return null;
}

function stripHtml(html: string | null): string | null {
  if (!html) return null;
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
}

/**
 * Sistema de presentaciones estructurado.
 * Detecta automáticamente desde el nombre del producto + descripción.
 */

export type PresentationType =
  | "powder" | "granulated" | "drops" | "syrup" | "suspension"
  | "tablets" | "capsules" | "softgels" | "sublingual" | "other";

export type ContentUnit = "g" | "ml" | "units" | "other";

export type Presentation = {
  type: PresentationType | null;
  value: number | null;
  unit: ContentUnit | null;
};

// Patrones para detectar presentación. Orden importa: más específicos primero.
const PRESENTATION_PATTERNS: Array<{
  regex: RegExp;
  type: PresentationType;
  unit: ContentUnit;
  multiplier?: number; // para convertir lbs a g, etc.
}> = [
  // === UNIDADES (más específicos primero) ===
  { regex: /(\d+)\s*softgels?/i, type: "softgels", unit: "units" },
  { regex: /(\d+)\s*c[áa]ps(?:ulas?)?\s*blandas?/i, type: "softgels", unit: "units" },
  { regex: /(\d+)\s*c[áa]ps(?:ulas?)?/i, type: "capsules", unit: "units" },
  { regex: /(\d+)\s*tabs?(?:letas?)?\s*sublinguales?/i, type: "sublingual", unit: "units" },
  { regex: /(\d+)\s*comprimidos?\s*sublinguales?/i, type: "sublingual", unit: "units" },
  { regex: /(\d+)\s*tabletas?/i, type: "tablets", unit: "units" },
  { regex: /(\d+)\s*comprimidos?/i, type: "tablets", unit: "units" },
  { regex: /(\d+)\s*caplets?/i, type: "tablets", unit: "units" },
  { regex: /(\d+)\s*lozenges?/i, type: "tablets", unit: "units" },
  { regex: /(\d+)\s*gomas?/i, type: "tablets", unit: "units" },
  { regex: /(\d+)\s*twist[\s-]?caps?/i, type: "softgels", unit: "units" },
  { regex: /(\d+)\s*servicios?/i, type: "powder", unit: "units" }, // como conteo de raciones

  // === VOLUMEN ===
  { regex: /(\d+(?:[.,]\d+)?)\s*fl\.?\s*oz/i, type: "drops", unit: "ml", multiplier: 29.5735 },
  { regex: /(\d+(?:[.,]\d+)?)\s*onzas?\s*l[íi]quidas?/i, type: "drops", unit: "ml", multiplier: 29.5735 },
  { regex: /(\d+(?:[.,]\d+)?)\s*ml\b/i, type: "drops", unit: "ml" },
  { regex: /(\d+(?:[.,]\d+)?)\s*l\b(?!bs?)/i, type: "drops", unit: "ml", multiplier: 1000 },

  // === MASA ===
  { regex: /(\d+(?:[.,]\d+)?)\s*lbs?\b/i, type: "powder", unit: "g", multiplier: 453.592 },
  { regex: /(\d+(?:[.,]\d+)?)\s*libras?\b/i, type: "powder", unit: "g", multiplier: 453.592 },
  { regex: /(\d+(?:[.,]\d+)?)\s*kg\b/i, type: "powder", unit: "g", multiplier: 1000 },
  { regex: /(\d+(?:[.,]\d+)?)\s*kilos?\b/i, type: "powder", unit: "g", multiplier: 1000 },
  { regex: /(\d+(?:[.,]\d+)?)\s*onzas?\b/i, type: "powder", unit: "g", multiplier: 28.3495 },
  { regex: /(\d+(?:[.,]\d+)?)\s*oz\b/i, type: "powder", unit: "g", multiplier: 28.3495 },
  { regex: /(\d+(?:[.,]\d+)?)\s*gr?(?:amos?)?\b/i, type: "powder", unit: "g" },
];

// Hints de presentación basados solo en palabras clave (cuando no hay número detectable)
const TYPE_HINTS: Array<{ regex: RegExp; type: PresentationType }> = [
  { regex: /\b(jarabe|syrup)\b/i, type: "syrup" },
  { regex: /\b(suspensi[óo]n)\b/i, type: "suspension" },
  { regex: /\b(esencia\s*floral|gotas?\s*orales?)\b/i, type: "drops" },
  { regex: /\b(polvo|powder|protein\s*powder)\b/i, type: "powder" },
  { regex: /\b(granulado|granules)\b/i, type: "granulated" },
  { regex: /\b(crema|gel|loci[óo]n|aceite)\b/i, type: "other" },
];

export function extractPresentation(
  name: string,
  descriptions: (string | null)[],
): Presentation {
  const combined = [name, ...descriptions.filter(Boolean)].join(" ");
  if (!combined) return { type: null, value: null, unit: null };

  // Intento 1: detectar valor + tipo desde regex con número
  for (const pattern of PRESENTATION_PATTERNS) {
    const match = combined.match(pattern.regex);
    if (match?.[1]) {
      const rawValue = parseFloat(match[1].replace(",", "."));
      if (isNaN(rawValue) || rawValue <= 0) continue;
      const value = pattern.multiplier
        ? Math.round(rawValue * pattern.multiplier * 100) / 100
        : rawValue;

      // Refinar tipo: si match dice "powder" pero el nombre sugiere "syrup", priorizar el hint
      let finalType = pattern.type;
      for (const hint of TYPE_HINTS) {
        if (hint.regex.test(combined)) {
          // Solo si es coherente con la unidad detectada
          if (
            (pattern.unit === "ml" && (hint.type === "syrup" || hint.type === "suspension" || hint.type === "drops")) ||
            (pattern.unit === "g" && (hint.type === "powder" || hint.type === "granulated"))
          ) {
            finalType = hint.type;
            break;
          }
        }
      }

      return { type: finalType, value, unit: pattern.unit };
    }
  }

  // Intento 2: solo tipo, sin valor
  for (const hint of TYPE_HINTS) {
    if (hint.regex.test(combined)) {
      return { type: hint.type, value: null, unit: null };
    }
  }

  return { type: null, value: null, unit: null };
}

/**
 * Genera un slug único que incluye contenido para diferenciar variantes.
 * "Whey Protein Vainilla 3lbs" y "Whey Protein Vainilla 5lbs"
 * → distintos slugs.
 */
export function buildSlugSuffix(presentation: Presentation): string {
  if (!presentation.value || !presentation.unit) return "";
  const value = Math.round(presentation.value);
  const unit = presentation.unit === "units" ? "u" : presentation.unit;
  return `-${value}${unit}`;
}

/**
 * WooCommerce expone Store API públicamente desde 2020+. No requiere auth.
 * Endpoint: /wp-json/wc/store/v1/products
 */

type StoreApiProduct = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  prices: {
    price: string;
    regular_price: string;
    currency_code: string;
    currency_minor_unit: number;
  };
  images: Array<{ id: number; src: string; alt: string }>;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  is_in_stock: boolean;
  weight: string;
  meta_data?: Array<{ key: string; value: string }>;
};

export class WooCommerceScraper implements Scraper {
  private baseUrl: string;

  constructor(config: ScraperConfig) {
    const url = new URL(config.catalog_url ?? config.base_url);
    this.baseUrl = `${url.protocol}//${url.host}`;
  }

  private get apiUrl(): string {
    return `${this.baseUrl}/wp-json/wc/store/v1/products`;
  }

  async testConnection(): Promise<{
    ok: boolean;
    message: string;
    total_products?: number;
  }> {
    try {
      const response = await fetch(`${this.apiUrl}?per_page=1`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        return {
          ok: false,
          message: `HTTP ${response.status} desde ${this.apiUrl}. ¿Es una tienda WooCommerce con Store API habilitada?`,
        };
      }
      const totalHeader = response.headers.get("x-wp-total");
      const total = totalHeader ? parseInt(totalHeader) : undefined;
      const data = await response.json();
      if (!Array.isArray(data)) {
        return {
          ok: false,
          message: "La respuesta no es un array de productos. Endpoint distinto al esperado.",
        };
      }
      return {
        ok: true,
        message: `Conectado · ${total ?? "?"} productos detectados`,
        total_products: total,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Error de conexión desconocido",
      };
    }
  }

  async fetchBatch(page: number, perPage: number): Promise<ScrapeBatchResult> {
    const url = `${this.apiUrl}?per_page=${perPage}&page=${page}&orderby=date&order=desc`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Scraper falló: HTTP ${response.status} en ${url}`);
    }

    const totalPagesHeader = response.headers.get("x-wp-totalpages");
    const totalPages = totalPagesHeader ? parseInt(totalPagesHeader) : null;

    const items = (await response.json()) as StoreApiProduct[];
    const products: ScrapedProduct[] = items.map((item) => this.adaptProduct(item));

    return {
      products,
      total_pages: totalPages,
      current_page: page,
      has_more: totalPages !== null && page < totalPages,
    };
  }

  private adaptProduct(item: StoreApiProduct): ScrapedProduct {
    const fullDesc = item.description ?? "";
    const shortDesc = item.short_description ?? "";
    const combinedText = `${fullDesc} ${shortDesc}`;

    const invima = extractInvima(combinedText);
    const composition = extractSection(fullDesc, [
      "composición",
      "composicion",
      "ingredientes",
      "fórmula",
      "formula",
    ]);
    const usage = extractSection(fullDesc, [
      "modo de uso",
      "uso sugerido",
      "instrucciones",
      "posología",
      "posologia",
      "dosificación",
      "dosificacion",
    ]);

    // Detectar presentación inteligentemente
    const presentation = extractPresentation(item.name, [shortDesc, fullDesc]);

    // Convertir precio
    const minorUnit = item.prices?.currency_minor_unit ?? 0;
    const priceStr = item.prices?.price ?? "0";
    const priceCop =
      minorUnit > 0
        ? Math.round(parseInt(priceStr) / Math.pow(10, minorUnit))
        : parseInt(priceStr) || null;

    const images: ScrapedImage[] = (item.images ?? []).map((img) => ({
      url: img.src,
      alt: img.alt || null,
    }));

    return {
      external_id: String(item.id),
      external_slug: item.slug,
      name: item.name,
      description: stripHtml(fullDesc),
      short_description: stripHtml(shortDesc),
      source_url: item.permalink,
      source_price_cop: priceCop,
      invima_number: invima,
      // Legacy text field (lo dejamos por compatibilidad)
      presentation: presentation.value && presentation.unit
        ? `${Math.round(presentation.value)} ${presentation.unit}${presentation.unit === "units" ? "" : ""}`
        : null,
      // Nuevos campos estructurados
      presentation_type: presentation.type,
      content_value: presentation.value,
      content_unit: presentation.unit,
      weight_grams: presentation.unit === "g" && presentation.value
        ? Math.round(presentation.value)
        : null,
      composition: composition,
      usage_instructions: usage,
      images,
      categories: (item.categories ?? []).map((c) => c.name),
      tags: (item.tags ?? []).map((t) => t.name),
      in_stock: item.is_in_stock ?? true,
      raw: item as unknown as Record<string, unknown>,
    };
  }
}
