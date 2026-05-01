import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  parseAsBoolean,
  createLoader,
} from "nuqs/server";

/**
 * Parsers de URL para los filtros del catálogo.
 * Centralizados aquí para que cliente y servidor compartan la misma definición.
 *
 * Convenciones:
 *   - `cat` (string) → slug de categoría única
 *   - `col` (array) → slugs de colecciones
 *   - `lab` (array) → slugs de laboratorios
 *   - `attrs` (array) → slugs de opciones de atributo (cualquier atributo)
 *   - `min`, `max` (int) → rango de precio público en COP
 *   - `q` (string) → búsqueda libre
 *   - `instock` (bool) → solo disponibles
 *   - `sort` (enum) → orden de resultados
 *   - `p` (int) → página actual (1-indexed)
 */
export const catalogSearchParams = {
  cat: parseAsString,
  col: parseAsArrayOf(parseAsString).withDefault([]),
  lab: parseAsArrayOf(parseAsString).withDefault([]),
  attrs: parseAsArrayOf(parseAsString).withDefault([]),
  min: parseAsInteger,
  max: parseAsInteger,
  q: parseAsString,
  instock: parseAsBoolean.withDefault(false),
  sort: parseAsStringEnum([
    "relevance",
    "price_asc",
    "price_desc",
    "newest",
    "name_asc",
  ] as const).withDefault("relevance"),
  p: parseAsInteger.withDefault(1),
};

export const loadCatalogSearchParams = createLoader(catalogSearchParams);

/**
 * Construye un querystring limpio para construir hrefs (paginación, "limpiar filtro").
 * Solo emite parámetros que difieren del default.
 */
export function buildSearchParams(params: {
  cat?: string | null;
  col?: string[];
  lab?: string[];
  attrs?: string[];
  min?: number | null;
  max?: number | null;
  q?: string | null;
  instock?: boolean;
  sort?: string;
  p?: number;
}): string {
  const sp = new URLSearchParams();
  if (params.cat) sp.set("cat", params.cat);
  if (params.col && params.col.length) sp.set("col", params.col.join(","));
  if (params.lab && params.lab.length) sp.set("lab", params.lab.join(","));
  if (params.attrs && params.attrs.length)
    sp.set("attrs", params.attrs.join(","));
  if (params.min != null) sp.set("min", String(params.min));
  if (params.max != null) sp.set("max", String(params.max));
  if (params.q) sp.set("q", params.q);
  if (params.instock) sp.set("instock", "true");
  if (params.sort && params.sort !== "relevance") sp.set("sort", params.sort);
  if (params.p && params.p !== 1) sp.set("p", String(params.p));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
