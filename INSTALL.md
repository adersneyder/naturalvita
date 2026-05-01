# NaturalVita · Hito 1.6 Sesión C

Cierra el catálogo público con búsqueda full-text, sitemap dinámico, robots.txt
y landing /tienda enriquecida con destacados, colecciones y categorías.

Build limpio: 24 rutas, 0 errores TS.

---

## 0. Estado previo asumido

- Sesión B aplicada y desplegada (preview verde en Vercel).
- Repo en rama de trabajo.
- `npm install` ya ejecutado con las deps de Sesión B (no se agregan
  dependencias nuevas en Sesión C).

---

## 1. Migración SQL: ya está aplicada

Ya apliqué la migración `products_fulltext_search_vector` directamente en tu
proyecto de Supabase (`qheynvhdjdnqywyaekpq`) vía MCP. Crea:

- Columna generada `search_vector` (tsvector con pesos A/B/C/D para name,
  short_description, presentation/keywords, full_description).
- Índice GIN sobre `search_vector` (búsqueda en milisegundos incluso con
  decenas de miles de productos).
- Función RPC `search_products(q, page_size, page_offset)` con ranking por
  `ts_rank` (la dejo lista por si en una iteración futura migramos a ranking
  exacto en lugar del orden por relevancia/recientes).

Ya está validada con productos reales: `vitamina c` devuelve "Collagen Plus
Vitamin C" y "Vitamin C 500 mg" con rank 0.99+. Sin acción de tu lado.

> Si necesitas re-aplicar la migración en otro entorno, el SQL completo está
> al final de este documento en la sección **Apéndice A**.

---

## 2. Aplicar este paquete

Desde la raíz del repo:

```bash
cp -r nv-hito-1.6-sesion-c/. ./
```

Archivos nuevos:
- `app/sitemap.ts` — sitemap.xml dinámico con productos, categorías,
  colecciones, laboratorios, home y /tienda.
- `app/robots.ts` — robots.txt que bloquea /admin, /auth, /api y URLs con
  filtros (querystring) para no inflar el crawl budget.
- `app/(public)/buscar/page.tsx` — página de búsqueda con resultados
  full-text y página de "tips" cuando no hay query.
- `app/(public)/_components/SearchBar.tsx` — caja de búsqueda con dos
  variantes (compacta para header, ancha para página).

Archivos modificados (sobrescriben a Sesión B):
- `lib/catalog/listing-queries.ts` — `q` ahora usa `textSearch` con
  `websearch_to_tsquery('spanish', ...)` en lugar de ILIKE; suma queries
  para landing (`listFeaturedCollections`, `listFeaturedProducts`) y para
  el sitemap (`listSitemapEntries`).
- `app/(public)/_components/PublicHeader.tsx` — sustituye el botón de lupa
  inerte por `SearchBar` real (variante "header") con submit a /buscar.
- `app/(public)/tienda/page.tsx` — sin filtros muestra hero + bloques
  curados (categorías, colecciones destacadas, productos destacados) +
  listado completo abajo. Con cualquier filtro/sort/q activo, salta directo
  al listado para no hacer scroll innecesario.

---

## 3. Build local

```bash
npm run build
```

Espera ver:

```
├ ƒ /buscar                              1.74 kB         112 kB
├ ○ /robots.txt                            141 B         102 kB
├ ƒ /sitemap.xml                           141 B         102 kB
├ ƒ /tienda                                132 B         120 kB
```

24 rutas en total.

---

## 4. Probar en local

```bash
npm run dev
```

Verifica las rutas nuevas y mejoradas:

| URL                                | Qué validar                                                    |
|------------------------------------|----------------------------------------------------------------|
| `/tienda` (sin filtros)            | Hero, bloques de categorías, colecciones destacadas, destacados, listado |
| `/tienda?cat=fitoterapeuticos`     | Salta directo al listado (sin bloques curados)                |
| `/buscar`                          | Página de tips con SearchBar, categorías y colecciones featured |
| `/buscar?q=vitamina%20c`           | Resultados FTS reales con productos que matchean              |
| `/buscar?q=algoinexistentexyz`     | Mensaje "Sin resultados" + invitación a navegar               |
| `/sitemap.xml`                     | XML válido con todas las URLs                                 |
| `/robots.txt`                      | Reglas de Allow/Disallow correctas                            |

En `/buscar` prueba operadores web: `colageno -bovino` debe excluir bovino,
`"omega 3"` busca la frase exacta. Funciona porque usamos
`websearch_to_tsquery`.

Mobile: la lupa en el header se expande a una caja de búsqueda inline al
tocarla. El botón "Cerrar" la colapsa.

---

## 5. Despliegue

```bash
git add .
git commit -m "feat(hito-1.6/C): busqueda FTS postgres + sitemap dinamico + robots + landing tienda enriquecida"
git push origin hito-1.6-sesion-b   # o la rama que estés usando
```

Verifica preview de Vercel: `/sitemap.xml` y `/robots.txt` responden bien.
Si pusiste `NEXT_PUBLIC_SITE_URL` en Vercel apuntando a `https://naturalvita.co`,
el sitemap usará ese host. Si no, cae al default `https://naturalvita.co`
hardcodeado.

---

## 6. Lo que cierra

Hito 1.6 entero termina aquí en lo que es código del catálogo público:
- ✅ Sesión A — ficha de producto + carrito localStorage + header/footer.
- ✅ Sesión B — listados con filtros nuqs + ProductCard + paginación + analítica + ratelimit + headers.
- ✅ Sesión C — búsqueda FTS + sitemap + robots + landing curada.

**Pendientes para abrir Sesión D (QA + lanzamiento)**:
- Bulk de generación IA de las 299 fichas (tu acción, ~30 min, ~$5–6 USD).
  Sigue siendo el bloqueador. Sin esto las fichas se ven con texto crudo.
- QA mobile real (no solo DevTools): probar en Android e iOS reales.
- Verificar que Google Search Console recibe el sitemap (registrar el
  dominio si no está, subir `https://naturalvita.co/sitemap.xml`).
- Decidir umbral "Envío gratis desde X" (sugerencia: $200.000 COP).

**Hito 1.7** queda bien definido para entrar después: carrito persistente
con sesión, checkout Bold con 3DS/PSE/Nequi, Resend SMTP para confirmaciones,
política de envíos, banner Habeas Data, footer legal NIT + INVIMA + dirección.

---

## Apéndice A: SQL aplicado en Supabase

Solo para referencia. **Ya está aplicado en producción**, no lo corras de
nuevo a menos que estés clonando el entorno.

```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(short_description, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(presentation, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(search_keywords, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(full_description, '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON public.products USING GIN (search_vector);

CREATE OR REPLACE FUNCTION public.search_products(
  q text,
  page_size int DEFAULT 24,
  page_offset int DEFAULT 0
)
RETURNS TABLE (id uuid, rank real)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id,
    ts_rank(p.search_vector, websearch_to_tsquery('spanish', q)) AS rank
  FROM public.products p
  WHERE
    p.status = 'active'
    AND p.search_vector @@ websearch_to_tsquery('spanish', q)
  ORDER BY rank DESC, p.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
$$;

GRANT EXECUTE ON FUNCTION public.search_products(text, int, int) TO anon, authenticated;
```
