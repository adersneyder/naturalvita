import { redirect } from "next/navigation";

/**
 * Home del sitio: redirige al catálogo público.
 *
 * En la fase actual de NaturalVita, la home `/` no aporta contenido
 * propio — el catálogo `/tienda` es la primera pantalla útil para el
 * cliente. Hasta que diseñemos una landing comercial completa con
 * hero, beneficios, productos destacados, etc. (Hito 2 marketing),
 * mantenemos la regla simple: home → catálogo.
 *
 * Implicación SEO: la canonical para "naturalvita.co" sigue siendo
 * la home pero el cliente nunca la ve estática. El sitemap apunta
 * directamente a /tienda y rutas interiores. Aceptable.
 */
export default function HomePage() {
  redirect("/tienda");
}
