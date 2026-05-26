# NaturalVita · Sprint 2 Sesión B · Punto 3 — Quiz accionable

Hace que los productos del **resultado del quiz** sean accionables: cada uno con
botón **"Agregar"** (al carrito, con feedback) y **"Ver"** (ficha rápida en modal,
sin salir del Home para no perder el resultado del quiz).

Incluye también el alineamiento del modelo de disponibilidad/inventario al modelo
de intermediación (ver sección "Cambios en base de datos", ya aplicados por MCP).

---

## Archivos de este ZIP (solo 2 — reemplazan los existentes)

```
lib/quiz/match-products.ts          → reemplaza  src/lib/quiz/match-products.ts
components/home/HeroQuiz.tsx         → reemplaza  src/components/home/HeroQuiz.tsx
```

> Ajusta el prefijo (`src/` o raíz) según la estructura de tu repo. Las rutas
> internas de import (`@/lib/...`, `@/components/...`) no cambian.

**Súbelos como archivo (drag & drop o "Upload files" en GitHub), NO copies y
pegues el contenido en el editor web.** Son archivos largos con JSX anidado; el
parser SWC de Next 15.5 puede corromperse al pegar. Subirlos como archivo es seguro.

---

## Qué hace cada archivo

### `lib/quiz/match-products.ts` (enriquecido)
- El tipo `MatchedProduct` ahora incluye 3 campos para la ficha rápida:
  `presentation`, `shortDescription`, `laboratory`.
- `hydrateProducts` trae esos campos en el mismo query (incluye el embed
  `laboratories(name)` vía la FK `products_laboratory_id_fkey`). **No hay fetch
  extra ni endpoint nuevo:** los datos viajan en el resultado del match.
- Se eliminó el filtro de stock muerto (`if (trackStock && stock <= 0) continue`).
  La disponibilidad la manda `is_active`/`status` (ya filtrados en el query).

### `components/home/HeroQuiz.tsx` (carrito + ficha rápida)
- Cada producto del resultado tiene botón **"Agregar"** (usa `useCart().addItem`,
  feedback "Agregado ✓" 2s) y **"Ver"** (abre la ficha rápida).
- Nuevo modal **ficha rápida** (`QuickView`): imagen + laboratorio + nombre +
  presentación + precio + descripción corta + razón IA + "Agregar al carrito" +
  link "Ver ficha completa" a `/producto/[slug]`. Cierra con Escape o clic afuera.
- Se conserva todo lo demás: rama logueado (botón "Guardar mi selección" sin pedir
  email) / anónimo (form email + cupón), señal de marketing, CTA a la tienda,
  estética del quiz.

---

## Qué NO se toca (verificado)
- **`/api/quiz/match/route.ts`**: el tipo enriquecido viaja solo en el JSON; el
  route devuelve el resultado tal cual. Sin cambios.
- **`app/_actions/quiz-subscribe.tsx`**: su `productSchema` (Zod) no usa `.strict()`,
  así que ignora los campos extra sin error. Sin cambios.
- **Email `quiz-result`** y **`/tienda`**: sin cambios.

---

## Cambios en base de datos (YA APLICADOS por MCP — informativos)

Modelo de intermediación: **la disponibilidad la manda `is_active`, no el stock.**
Regla: activo sin número = sin tope (`track_stock=false`); activo con número =
tope N (`track_stock=true` + `stock=N`); desactivado = invisible en todos los canales.

1. **`fix_track_stock_intermediation_model`** — 89 productos que estaban en
   `track_stock=true, stock=0` (default residual, no un límite real) pasaron a
   `track_stock=false`. Los 101 activos quedaron sin tope. Ningún límite real perdido
   (0 productos tenían `track_stock=true, stock>0`).

2. **`track_stock_default_false_intermediation`** — el DEFAULT de la columna
   `track_stock` pasó de `true` a `false`. Así, todo producto nuevo (carga manual o
   scraping) que no fije el campo nace **sin tope** (pedible), en vez de "agotado de
   fábrica". Blinda la regla a nivel de dato.

---

## Verificación post-deploy
1. Completa el quiz (cualquier etapa + objetivo). Deben salir 3 productos.
2. "Agregar" → el contador del carrito en el header sube; el botón muestra "Agregado".
3. "Ver" (o clic en el producto) → abre la ficha rápida con datos completos.
4. En la ficha rápida: "Agregar al carrito" funciona; "Ver ficha completa" navega a
   `/producto/[slug]`; Escape y clic afuera cierran.
5. Logueado: el bloque de captura muestra "Guardar mi selección" (sin pedir email).

---

## Pendiente de verificación (no bloquea este deploy)
El DEFAULT de la BD cubre el caso "no se setea el campo". Si el **ProductEditor**
del admin o el **scraper** escriben `track_stock=true` explícitamente, conviene
ajustarlos para que solo lo hagan cuando haya un número de inventario. Requiere
revisar ese código (no incluido en este ZIP).
