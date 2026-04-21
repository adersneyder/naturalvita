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

function parseWeight(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|gramos?|kg|lbs?|libras?|oz|onzas?|ml|l)\b/i);
  if (!match) return null;
  const value = parseFloat(match[1].replace(",", "."));
  const unit = match[2].toLowerCase();
  if (unit.startsWith("kg")) return Math.round(value * 1000);
  if (unit.startsWith("lb") || unit.startsWith("libra")) return Math.round(value * 453.592);
  if (unit.startsWith("oz") || unit.startsWith("onza")) return Math.round(value * 28.35);
  if (unit === "l") return Math.round(value * 1000);
  return Math.round(value);
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
    // Normalizar: si catalog_url es de un subdominio (ej. tienda.sistemanatural.com)
    // usar ese; si no, usar base_url.
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
    const presentation = extractSection(shortDesc, [
      "presentación",
      "presentacion",
    ]);

    // Convertir precio de minor units a pesos enteros
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
      presentation: presentation,
      weight_grams: parseWeight(item.weight) ?? parseWeight(item.name),
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
