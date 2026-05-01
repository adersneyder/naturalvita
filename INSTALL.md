# NaturalVita · Patch · Eliminar "Por categoría" de la landing /tienda

Un solo archivo modificado:

```
app/(public)/tienda/page.tsx
```

Build limpio: 31 rutas, 0 errores TS.

---

## Qué cambia

Se elimina la sección "Por categoría" de la landing limpia de `/tienda`
(la que se ve cuando el visitante no ha aplicado ningún filtro). Quedan
en la landing:

1. Hero con título y subtítulo
2. **Colecciones destacadas** (intacta, con imagen de portada)
3. Destacados de la temporada
4. "Todo el catálogo" + sidebar de filtros (intacto)

El filtro de categorías sigue accesible donde siempre estuvo:
- Sidebar izquierdo, primer grupo, abierto por defecto.
- Cards de categoría que se acceden desde el listado paginado abajo.
- Subnav de la app (Tienda · Buscar · Envíos).

---

## Por qué

Tres puntos de acceso a categorías en la misma página era redundancia.
Las colecciones, en cambio, solo tienen un punto de acceso visualmente
rico (la sección con `cover_image_url`). Mantener la que aporta valor
diferencial editorial; eliminar la que duplicaba navegación.

---

## Qué NO cambia

- El sidebar izquierdo de filtros — intacto.
- La query `listActiveCategoriesTree()` se mantiene porque el sidebar
  la sigue consumiendo.
- La regla "con cualquier filtro aplicado, oculta los bloques curados"
  funciona igual.
- Ninguna otra página, ninguna ruta, ningún archivo fuera de
  `tienda/page.tsx`.

---

## QA

1. Visita limpia a `/tienda` → no debe aparecer la sección "Por
   categoría". El primer bloque después del hero es "Colecciones
   destacadas".
2. Aplica cualquier filtro → la landing colapsa al listado normal
   (comportamiento intacto).
3. En `/tienda` con la URL limpia, el sidebar izquierdo debe seguir
   mostrando "Categoría" como primer filtro abierto.
