# Sprint 2 · Sesión B · Punto 1 — Fila "Selección destacada" del Home

## Qué incluye este ZIP

Dos archivos nuevos. No modifican nada existente; solo se agregan.

```
lib/catalog/home-featured.ts        ← lógica de selección (cascada 3 niveles)
components/home/FeaturedProducts.tsx ← sección visual del Home (Server Component)
```

## Paso 1 — Subir los dos archivos

Sube cada archivo a su ruta exacta en el repo:
- `lib/catalog/home-featured.ts`
- `components/home/FeaturedProducts.tsx`

(La migración de la BD y los 6 productos marcados como destacados YA están
aplicados en Supabase vía MCP. No tienes que hacer nada en la base de datos.)

## Paso 2 — Insertar la sección en el Home

Abre el archivo del Home (probablemente `app/(public)/page.tsx` o
`app/page.tsx` — donde están el quiz y las etapas de vida).

1. Agrega el import arriba, junto a los otros imports de componentes del Home:

```tsx
import FeaturedProducts from "@/components/home/FeaturedProducts";
```

2. Coloca el componente donde quieras la fila. Según el diseño definido
   (10 secciones), va DESPUÉS de "Etapas de vida" y ANTES de "Origen Everlife".
   Como es un Server Component async, simplemente colócalo en el JSX:

```tsx
{/* ... sección Etapas de vida ... */}

<FeaturedProducts />

{/* ... sección Origen Everlife ... */}
```

No necesita props. Hace su propia consulta en el servidor.

## Cómo funciona la cascada (para tu referencia)

`getFeaturedProducts(6)` decide qué mostrar en 3 niveles:

1. **Ventas reales** — si hay 6+ productos distintos vendidos en pedidos
   pagados, la fila se llena sola con lo más vendido. (Hoy NO se activa:
   solo hay 1 producto vendido en pruebas. Se activará solo cuando el
   negocio tenga tracción real. Esto es el "se alimenta sola" que pediste.)

2. **Curados** — los productos marcados `is_featured=true` en el admin.
   Es el estado actual: los 6 que escogimos por correlación demanda-mercado
   (Echinacea, Citrato de Magnesio, Bwell Probiotics, Colágeno+Vit C,
   Cal Mag Zinc+D, Biotina+Zinc+Selenio).

3. **Fallback variado** — si no hubiera ni ventas ni destacados, una
   selección variada por categoría. Nunca queda vacío.

Para cambiar los destacados en el futuro: marca/desmarca `is_featured` en
`/admin/productos`. La fila se actualiza sola.

## Notas técnicas

- No requiere regenerar `lib/supabase/types.ts`: la llamada a la RPC se tipa
  localmente con un cast acotado. (La RPC sí existe ya en la BD.)
- Stock es SEÑAL, no filtro (coherente con el quiz): un destacado sin stock
  igual aparece, con su badge "Agotado" del ProductCard. Validación real de
  stock en ficha y checkout.
- Reutiliza tu ProductCard de /tienda: coherencia visual total.
- Type-check pasado en verde (tsc strict, 0 errores).

## Umbral configurable

En `home-featured.ts`, la constante `MIN_REAL_SELLERS = 6` controla cuántos
productos vendidos se necesitan para activar el nivel de ventas reales.
Súbelo o bájalo según prefieras cuando haya tracción.
