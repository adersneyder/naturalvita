/**
 * Tipos para el sistema de scraping.
 * Cada estrategia (woocommerce, magento, etc.) implementa la interfaz Scraper
 * y devuelve productos en el formato ScrapedProduct estandarizado.
 */

export type ScrapedImage = {
  url: string;
  alt?: string | null;
};

export type ScrapedProduct = {
  external_id: string;
  external_slug?: string | null;
  name: string;
  description: string | null;
  short_description: string | null;
  source_url: string;
  source_price_cop: number | null;
  invima_number: string | null;
  presentation: string | null;
  weight_grams: number | null;
  composition: string | null;
  usage_instructions: string | null;
  images: ScrapedImage[];
  categories: string[];
  tags: string[];
  in_stock: boolean;
  raw: Record<string, unknown>;
};

export type ScrapeBatchResult = {
  products: ScrapedProduct[];
  total_pages: number | null;
  current_page: number;
  has_more: boolean;
};

export type ScraperConfig = {
  base_url: string;
  catalog_url: string | null;
  scraper_strategy: string;
  scraper_config: Record<string, unknown>;
};

export interface Scraper {
  /**
   * Trae un lote de productos. El scraper es responsable de paginar.
   */
  fetchBatch(page: number, perPage: number): Promise<ScrapeBatchResult>;

  /**
   * Verifica si la fuente está accesible. Útil para "test connection".
   */
  testConnection(): Promise<{ ok: boolean; message: string; total_products?: number }>;
}
