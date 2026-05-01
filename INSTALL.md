# NaturalVita · Patch · Compactar /tienda en mobile

Un solo archivo modificado:

```
app/(public)/tienda/page.tsx
```

Build limpio: 31 rutas, 0 errores TS. Sin deps, sin SQL, sin env.

---

## Qué cambia (solo en mobile, ≤768px)

**Hero**
- Padding vertical: `py-10` → `py-6` (de 80 a 48px). Ahorra **32px**.
- Título: `text-4xl` (36px) → `text-2xl` (24px). Ahorra **~24px** de altura.
- Margen interno (entre breadcrumb y h1, entre h1 y párrafo): de `mt-4` a `mt-2/mt-3`. Ahorra **~16px**.
- Párrafo: `text-base` → `text-sm`. Ahorra **~8px**.

Total hero: **~80px menos**.

**Contenedor inferior**
- Padding vertical: `py-8` → `py-6`. Ahorra **16px**.

**Colecciones destacadas**
- Cambio principal: pasa de **1 columna a 2 columnas** (`grid-cols-2 lg:grid-cols-4`). Para 4 colecciones, ahorra ~600px de scroll.
- Aspect ratio de la imagen: `aspect-[4/3]` → `aspect-square` en mobile. Cards más altas pero más estrechas, mejor balance en 2 cols.
- Padding interno de la card: `p-4` → `p-3`. Ahorra **8px** por card.
- Título de la card: `text-base` → `text-sm` con `line-clamp-1`. Ahorra ~12px.
- Descripción de la card: **oculta en mobile** (`hidden md:block`). Las cards de colección a 2 cols son demasiado estrechas para mostrar 2 líneas de descripción legibles; el nombre + imagen ya comunican.
- Margen de sección: `mb-12` → `mb-8`. Ahorra **16px**.
- Margen del header de sección: `mb-5` → `mb-3`. Ahorra **8px**.
- Header h2: `text-2xl` → `text-xl`. Ahorra **~6px**.
- Border-radius: `rounded-2xl` → `rounded-xl`. Más sobrio en cards pequeñas.

**Destacados de la temporada y "Todo el catálogo"**
- Mismo tratamiento: `mb-12` → `mb-8`, `mb-5` → `mb-3`, `text-2xl` → `text-xl`.

---

## Resultado esperado

En un teléfono típico (viewport 375×700 efectivo):

**Antes**: hero 220px + colecciones 1500px (4 cards a 1 col) + ~30px gaps. La grilla "Todo el catálogo" aparecía después de **~1750px de scroll** (≈3 swipes).

**Ahora**: hero 140px + colecciones ~600px (4 cards a 2 cols) + gaps menores. La grilla "Todo el catálogo" aparece a **~750px** (1 swipe). Más del 50% menos de scroll para llegar al catálogo.

---

## Qué NO cambia

- Versión desktop (≥768px): **idéntica** a la actual. Todos los cambios usan breakpoints `md:` para preservar la generosidad visual en pantallas grandes.
- Sidebar de filtros: intacto.
- ProductGrid de los Destacados: intacto (su responsividad ya es correcta).
- Paginación, ordenamiento, JSON-LD, metadata: intactos.

---

## QA

**Mobile (DevTools responsive 375px o teléfono real):**
1. Hero compacto, título a 24px, párrafo a 14px, padding moderado.
2. Colecciones destacadas en 2 columnas con cards cuadradas, sin descripción debajo del nombre.
3. Destacados con header más pequeño.
4. La grilla "Todo el catálogo" se ve después de uno o dos swipes, no tres.

**Desktop (≥768px):**
1. Todo idéntico a antes: hero generoso a 48px de título, colecciones a 4 columnas con `aspect-[4/3]` y descripción visible.

**Tablet (~768-1024px):**
1. Toma los estilos de desktop porque el breakpoint `md:` se activa en 768px. Si quieres tratamiento intermedio para tablets verticales, lo afinamos en otra iteración.
