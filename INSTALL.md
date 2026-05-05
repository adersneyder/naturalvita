# NaturalVita · Hito 2 · Sesión C — Wishlist y Reviews

Build verde · 50 rutas (sin cambio) · 0 errores TS · 12 archivos.

---

## Migraciones SQL

YA APLICADAS en producción vía MCP. No necesitas correrlas.

**`wishlist_and_reviews`**: crea 2 tablas + 1 vista.

`wishlist_items` — favoritos por cliente:
- `customer_id UUID` FK a customers (= auth.uid()).
- `product_id UUID` FK a products.
- UNIQUE (customer_id, product_id) — sin duplicados.
- RLS: cada cliente ve/modifica solo sus propios. Admins lectura.

`product_reviews` — reseñas 1-5 estrellas:
- `rating SMALLINT` con CHECK 1-5.
- `title TEXT` (máx 120 chars), `body TEXT` (máx 2000 chars).
- `status` con CHECK 'pending'/'approved'/'rejected'. Auto-approved para
  clientes con compra entregada.
- `order_id` FK opcional a orders (para asociar la reseña a la compra).
- UNIQUE (customer_id, product_id) — un cliente reseña un producto una vez.
- RLS: aprobadas son públicas; clientes escriben las propias; admins todo.

`product_review_stats` — VIEW con stats por producto:
- `review_count`, `average_rating`, `count_1..5`.
- Solo cuenta reseñas `status='approved'`.
- Se usa en schema.org AggregateRating y en el resumen de estrellas.

---

## Variables de entorno

Sin variables nuevas. Usa las existentes.

---

## Archivos · qué hace cada uno

### Libs nuevas

**`lib/wishlist/queries.ts`** — 4 funciones:
- `getWishlistItems()` carga wishlist del usuario autenticado con datos del producto (nombre, slug, precio, imagen). Usado en `/mi-cuenta?tab=favoritos`.
- `getWishlistProductIds()` retorna Set de product_ids en wishlist. Usado en ficha de producto para saber si mostrar corazón lleno o vacío.
- `toggleWishlistItem(productId)` agrega si no está, quita si está. Retorna `{ok, inWishlist}`.

**`lib/reviews/queries.ts`** — 6 funciones:
- `getProductReviews(productId)` lista reseñas aprobadas con nombre del cliente.
- `getProductReviewStats(productId)` retorna stats desde la VIEW (count, avg, distribución).
- `checkReviewEligibility(productId)` verifica si el cliente autenticado puede dejar reseña: debe tener un pedido con ese producto en `fulfillment_status='delivered'` y no haber reseñado antes. Retorna `{canReview, orderId, alreadyReviewed}`.
- `submitReview(input)` inserta la reseña con re-validación server-side de elegibilidad.
- `getCustomerReviews()` lista las reseñas que el cliente ha escrito. Usado en `/mi-cuenta?tab=reseñas`.

### Server actions

**`app/(public)/_actions/wishlist.ts`** — `toggleWishlistAction(productId)`:
- Llama `toggleWishlistItem` y `revalidatePath("/mi-cuenta")`.
- Retorna `{ok, inWishlist, error?}` para que el cliente actualice UI.

**`app/(public)/_actions/reviews.ts`** — `submitReviewAction(prev, formData)`:
- Compatible con `useActionState`.
- Valida campos, llama `submitReview`, `revalidatePath` del producto y de `/mi-cuenta`.

### Componentes nuevos

**`app/(public)/_components/WishlistButton.tsx`** — botón corazón:
- Estado optimista: UI actualiza inmediatamente, server action confirma.
- Si no hay sesión → redirige a `/iniciar-sesion?next=<ruta actual>`.
- Si server action falla → revierte el estado.
- `aria-pressed` para accesibilidad.

**`app/(public)/_components/StarRating.tsx`** — estrellas SVG:
- Server component puro (sin estado).
- Soporta medias estrellas con gradiente lineal SVG.
- `aria-label` para accesibilidad.
- Reutilizable en ficha de producto, resumen de reviews, tarjeta producto, `/mi-cuenta`.

**`app/(public)/_components/ProductReviews.tsx`** — bloque completo de reseñas:
- Resumen con número grande + barras de distribución por estrella.
- Formulario interactivo con selector de estrellas hover/click.
- Lista de reseñas con fecha, nombre, respuesta admin si hay.
- Mensaje de estado post-envío.
- Se muestra en `/producto/[slug]` abajo de los productos relacionados.

### Paneles `/mi-cuenta`

**`app/(public)/mi-cuenta/_WishlistPanel.tsx`** — grid de favoritos:
- Grid 2/3/4 columnas responsive.
- Cada tarjeta tiene botón `<WishlistButton>` para quitar directamente.
- Estado vacío con CTA a `/tienda`.

**`app/(public)/mi-cuenta/_CustomerReviewsPanel.tsx`** — lista de reseñas escritas:
- Link al producto reseñado.
- Stars + título + extracto del cuerpo.
- Estado vacío con CTA a `/mi-cuenta?tab=pedidos`.

### Archivos modificados

**`app/(public)/mi-cuenta/_AccountTabs.tsx`** — agrega tabs "Favoritos" y "Reseñas".

**`app/(public)/mi-cuenta/page.tsx`** — carga `getWishlistItems()` y `getCustomerReviews()` en paralelo con los otros queries. Renderiza `<WishlistPanel>` y `<CustomerReviewsPanel>` en los tabs correspondientes.

**`app/(public)/producto/[slug]/page.tsx`** — 5 cambios:
1. Carga reviews + wishlistIds en paralelo (`Promise.all`).
2. `<WishlistButton>` junto al `<h1>` del producto.
3. Rating resumido (stars + promedio + conteo) debajo del título si hay reseñas.
4. `<ProductReviews>` al final de la página.
5. Schema.org `aggregateRating` incluido en el JSON-LD cuando hay reseñas.

---

## Aplicación

1. Sube los 12 archivos al repo en sus rutas exactas.
2. Vercel hará deploy automático ~1-2 min. Sin variables nuevas.
3. Verifica build verde en Vercel → Deployments.

---

## Validación end-to-end

### Flujo 1: wishlist

1. Entra al sitio con tu cuenta de cliente.
2. Ve a cualquier ficha de producto.
3. Verás un icono de corazón junto al nombre del producto (arriba a la derecha del h1).
4. Click → corazón se llena rojo (estado optimista inmediato).
5. Ve a `/mi-cuenta?tab=favoritos` (nuevo tab en la barra de navegación).
6. El producto aparece en el grid.
7. Click en el corazón dentro del grid → desaparece de favoritos.

### Flujo 2: reviews (requiere pedido entregado)

Para probar reviews necesitas marcar uno de tus pedidos como "entregado"
desde el admin. Ve a `/admin/pedidos` → abre el pedido → botón
"Marcar como entregado" (fulfillment_status = 'delivered').

Después:
1. Como cliente, ve a la ficha de un producto que estaba en ese pedido.
2. Abajo, debajo de "Productos relacionados", verás la sección "Reseñas".
3. Si nunca has reseñado ese producto, verás el formulario "Deja tu reseña".
4. Selecciona estrellas (hover muestra preview), llena título y cuerpo opcionales.
5. Click "Publicar reseña".
6. La reseña aparece en la lista inmediatamente (auto-aprobada).
7. El resumen de estrellas aparece arriba del formulario.
8. Ve a `/mi-cuenta?tab=reseñas` → la reseña aparece en tu historial.

### Flujo 3: schema.org AggregateRating (SEO)

Después de tener al menos 1 reseña en un producto:
1. Abre DevTools → Network → busca el request del HTML de la ficha.
2. O ve directamente a: `/producto/tu-slug` y haz Ctrl+U (ver código fuente).
3. Busca `"aggregateRating"` en el JSON-LD del `<script type="application/ld+json">`.
4. Debe contener `ratingValue`, `reviewCount`, `bestRating: 5`, `worstRating: 1`.

Esto es lo que Google indexa para mostrar las estrellas directamente en
los resultados de búsqueda (rich snippets). Requiere 1+ reseñas y que
Google recrawlee la página (días a semanas después de publicar).

---

## Pendientes operativos antes de lanzamiento

1. **`KLAVIYO_NEWSLETTER_LIST_ID`**: crear lista en Klaviyo UI → copiar ID → agregar variable en Vercel → redeploy. Sin esto la suscripción al newsletter se guarda en BD local pero no llega a Klaviyo.

2. **Reembolso B8XV** ($13.500) en panel Bold. Cuando se procese, el webhook VOID_APPROVED también actualiza el estado en BD automáticamente.

3. **Sitemap GSC**: reintentar mañana en Google Search Console.

4. **Flows Klaviyo UI** (sesión guiada ~30 min): Welcome Series + Abandoned Cart. Solo se hace después de que `KLAVIYO_NEWSLETTER_LIST_ID` esté configurado.

---

## Hito 2 completo

Esta sesión cierra el Hito 2 completo:

| Sesión | Entrega | Estado |
|---|---|---|
| Sesión A | Páginas confianza + contacto + 404 | ✓ En producción |
| Sesión B | Newsletter + cupones | ✓ ZIP entregado |
| Sprint Klaviyo | Integración eventos | ✓ ZIP entregado |
| Sesión C | Wishlist + reviews + schema.org | ✓ Este ZIP |

El siguiente hito es **Hito 1.3 — Admins con invitaciones** (la tabla
`admin_invitations` ya existe en BD, falta el CRUD en UI) o
directamente **lanzamiento soft** invitando tus primeros 5-10 usuarios
reales para alimentar Clarity y GSC con datos de tráfico humano.

Mi recomendación: lanzamiento soft primero. Con tráfico real en 1 semana
tendrás datos para priorizar inteligentemente qué desarrollar después.
