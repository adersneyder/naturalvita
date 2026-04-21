import type { Scraper, ScraperConfig } from "./types";
import { WooCommerceScraper } from "./woocommerce";

/**
 * Factory que devuelve el scraper apropiado según la estrategia.
 * Para agregar nuevas plataformas (Shopify, Magento, custom), añadir aquí.
 */
export function getScraper(config: ScraperConfig): Scraper {
  switch (config.scraper_strategy) {
    case "woocommerce":
      return new WooCommerceScraper(config);
    case "shopify":
      throw new Error("Estrategia 'shopify' aún no implementada");
    case "magento":
      throw new Error(
        "Estrategia 'magento' requiere navegador headless. No disponible en este hito.",
      );
    case "custom_html":
      throw new Error("Estrategia 'custom_html' aún no implementada");
    case "headless_browser":
      throw new Error("Estrategia 'headless_browser' aún no implementada");
    default:
      throw new Error(`Estrategia desconocida: ${config.scraper_strategy}`);
  }
}
