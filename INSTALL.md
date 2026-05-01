# NaturalVita · Hito 1.6 Sesión B + infra fusionada

Entrega que cierra el listado público del catálogo (rutas, ProductCard, filtros
con URL como source-of-truth, paginación, JSON-LD) **y** la infra que faltaba
del Hito 1.6 (analítica, rate-limit, headers OWASP, bundle analyzer, Microsoft
Clarity opcional). Compila limpio: 21 páginas, 0 errores TS, build de 23 s en
sandbox.

---

## 0. Prerrequisitos

- Estás en el repo `naturalvita`, rama de trabajo nueva:
  ```bash
  git checkout -b hito-1.6-sesion-b
  ```
- Versión actual del repo es la del ZIP `naturalvita-main.zip` que subiste el
  1-mayo-2026. Si has cambiado algo después, revisa los conflictos con `git
  status` antes de pisar archivos.

---

## 1. Aplicar este paquete

Descomprime el ZIP en una carpeta `nv-hito-1.6-sesion-b/` y copia su contenido
sobre la raíz del repo. Los archivos nuevos se crean; los existentes se
**sobrescriben**:

```bash
cp -r nv-hito-1.6-sesion-b/. ./
```

Archivos que se sobrescriben (ya existían y fueron actualizados):
- `app/layout.tsx` — agrega `Providers`, `SiteAnalytics`, `metadataBase`.
- `next.config.ts` — headers seguridad, AVIF/WEBP, remotePatterns extendidos,
  bundle analyzer, `poweredByHeader: false`.
- `package.json` — añade nuevas dependencias.
- `.env.local.example` — añade variables Clarity y Upstash.

Archivos nuevos:
- `app/providers.tsx`
- `app/_components/SiteAnalytics.tsx`
- `app/(public)/loading.tsx`
- `app/(public)/_components/ProductCard.tsx`
- `app/(public)/_components/ProductGrid.tsx`
- `app/(public)/_components/Pagination.tsx`
- `app/(public)/_components/FilterSidebar.tsx`
- `app/(public)/_components/SortBar.tsx`
- `app/(public)/tienda/page.tsx`
- `app/(public)/categoria/[slug]/page.tsx`
- `app/(public)/coleccion/[slug]/page.tsx`
- `app/(public)/laboratorio/[slug]/page.tsx`
- `lib/catalog/listing-queries.ts`
- `lib/catalog/search-params.ts`
- `lib/ratelimit.ts`

---

## 2. Instalar dependencias

```bash
npm install
```

Dependencias nuevas que entran en `node_modules`:

| Paquete                       | Función                                          |
|-------------------------------|--------------------------------------------------|
| `nuqs`                        | Filtros con URL como source-of-truth             |
| `lucide-react`                | Iconos del FilterSidebar (X, sliders, check)     |
| `@vercel/analytics`           | Pageviews y eventos custom                       |
| `@vercel/speed-insights`      | Core Web Vitals reales                           |
| `@upstash/ratelimit`          | Rate limit para futuras API públicas             |
| `@upstash/redis`              | Cliente Redis de Upstash                         |
| `@next/bundle-analyzer` (dev) | Auditoría de bundle con `npm run analyze`        |

---

## 3. Variables de entorno

Abre `.env.local` (NO el `.example`) y agrega las dos secciones nuevas:

```bash
# Microsoft Clarity (gratis; opcional, si lo dejas vacío el script no se carga)
NEXT_PUBLIC_CLARITY_ID=

# Upstash Redis (gratis hasta 10k cmds/día)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Cómo obtenerlas:
- **Clarity**: <https://clarity.microsoft.com> → crear proyecto NaturalVita,
  sitio `https://naturalvita.co`, copiar el ID que aparece en el snippet.
- **Upstash**: <https://console.upstash.com> → Create Database → región
  `us-east-1` o `sa-east-1` → pestaña REST → copiar URL y Token.

Replica las tres variables en Vercel: **Project Settings → Environment
Variables**, marcando Production y Preview.

> Si por ahora no quieres lidiar con Clarity ni Upstash, **déjalas vacías**.
> La app compila y funciona sin ellas; Clarity simplemente no se carga, y
> Upstash queda dormido hasta que se exponga una API pública que lo use.

---

## 4. Build local

```bash
npm run build
```

Espera ver:

```
Route (app)
├ ƒ /tienda                                132 B         120 kB
├ ƒ /categoria/[slug]                      132 B         120 kB
├ ƒ /coleccion/[slug]                      131 B         120 kB
├ ƒ /laboratorio/[slug]                    131 B         120 kB
```

Para auditoría de bundle (opcional):

```bash
npm run analyze
```

---

## 5. Probar en local

```bash
npm run dev
```

Rutas a verificar:

| URL                                      | Qué validar                                 |
|------------------------------------------|---------------------------------------------|
| `/tienda`                                | Grilla, sidebar, paginación, ordenamiento   |
| `/tienda?cat=fitoterapeuticos`           | Filtro por categoría desde URL             |
| `/tienda?lab=naturfar&instock=true`      | Combinación de filtros                     |
| `/tienda?sort=price_desc&p=2`            | Orden + paginación                         |
| `/categoria/fitoterapeuticos`            | Hero + filtros (sin filtro de categoría)   |
| `/coleccion/<slug>`                      | Hero editorial con cover image             |
| `/laboratorio/naturfar`                  | Hero con logo                               |

En mobile (DevTools 375px) prueba el botón **Filtrar** que abre el bottom
sheet, los checkboxes, el botón **Ver N productos**, y el cierre del drawer.

---

## 6. Despliegue

```bash
git add .
git commit -m "feat(hito-1.6/B): catalogo publico /tienda /categoria /coleccion /laboratorio + filtros nuqs + analitica + ratelimit + headers seguridad"
git push origin hito-1.6-sesion-b
```

Vercel lanza Preview Deploy automático. Verifica:
- Que el preview compila sin errores.
- Que el header `Strict-Transport-Security` aparece en Network tab.
- Que `/tienda` carga, navega y filtra en preview.
- Si pusiste el ID de Clarity, que el script `clarity.ms/tag/...` aparece en
  Network.

Cuando esté verde, abre PR a `main`. Después del merge, despliegue automático
a producción.

---

## 7. Pendiente bloqueante para el lanzamiento

`ai_generation_log` está en cero: las **299 fichas IA siguen sin generarse**.
Las páginas de listado funcionan sin ellas (mostramos `name`, `presentation`,
`short_description` cruda). Pero la página individual `/producto/[slug]` se ve
mejor con descripción IA. Antes de lanzar al público:

1. Entra a `/admin/productos`.
2. Selecciona todos los productos (ajusta page_size a 300 si quieres uno solo).
3. Acción bulk → "Generar fichas faltantes con IA" → confirmar.
4. Espera ~30 minutos. Costo aproximado $5-6 USD.

---

## 8. Lo que cierra y lo que sigue

**Cierra Sesión B del Hito 1.6**:
- ✅ Rutas `/tienda`, `/categoria/[slug]`, `/coleccion/[slug]`, `/laboratorio/[slug]`
- ✅ ProductCard reutilizable, ProductGrid responsive, Pagination
- ✅ FilterSidebar mobile + desktop con URL source-of-truth (nuqs)
- ✅ SortBar
- ✅ Skeletons (loading.tsx)
- ✅ JSON-LD BreadcrumbList por página
- ✅ Headers OWASP, AVIF/WEBP, Vercel Analytics + Speed Insights
- ✅ Rate limiter Upstash listo (durmiente hasta hito que exponga APIs)

**Sesión C** (próxima): búsqueda Postgres FTS con índice GIN, sitemap.xml
dinámico, robots.txt, canonical strategy, landing /tienda enriquecida con
destacados y colecciones featured.

**Sesión D**: QA mobile completo, primer despliegue público sin checkout,
banner de cookies (Habeas Data ley 1581) si activas GA4.

**Hito 1.7**: carrito persistente con sesión, checkout Bold, Resend SMTP,
política de envíos, factura electrónica.

---

## 9. Notas técnicas para mantenimiento

- `nuqs` requiere `<NuqsAdapter>` en root. Está en `app/providers.tsx`.
- `FilterSidebar` es un Client Component. Las páginas de listado son Server
  Components que usan `loadCatalogSearchParams` (parser de nuqs/server) para
  leer `searchParams` de forma tipada en el servidor.
- Cuando se agreguen filtros nuevos: extender `lib/catalog/search-params.ts`,
  el tipo `CatalogFilters` en `listing-queries.ts`, y el FilterSidebar.
- La query principal `listProducts` filtra por `status='active'` (canónico).
  No usar `is_active` en queries nuevas; el schema lo marca como derivado.
- Productos sin imagen primaria nunca aparecen en listados (regla de negocio
  consolidada). Sin excepciones.
- Para añadir Algolia/MeiliSearch en el futuro, sustituir el bloque de
  búsqueda ILIKE en `listProducts` por una llamada al cliente externo.
