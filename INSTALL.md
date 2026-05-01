# NaturalVita · Patch · Galería de producto + Tabs de información

Dos mejoras de UX a la ficha de producto. No es un hito nuevo: refina lo
que ya existe en Hito 1.6 Sesión A.

Build limpio: 31 rutas, 0 errores TS. `/producto/[slug]` pasa de 2.13 kB
a 6.3 kB (galería interactiva + tabs).

---

## Estructura del ZIP

```
nv-fix-producto-galeria-tabs/
├── INSTALL.md
└── app/
    └── (public)/
        └── producto/
            └── [slug]/
                ├── page.tsx              ← MODIFICADO
                ├── _ProductGallery.tsx   ← NUEVO
                └── _ProductInfoTabs.tsx  ← NUEVO
```

---

## 1 · Galería de producto (`_ProductGallery.tsx`)

### Antes
- Imagen principal renderizada como `<Image>` estática.
- Thumbnails como `<div>` no clickeables (puro decorativo).
- Sin zoom, sin lightbox.

### Ahora
**Thumbnails clickeables** a la izquierda de la imagen principal en desktop
(columna vertical, 80px), debajo en mobile (scroll horizontal). El thumb
activo tiene borde iris.

**Hover-pan zoom en desktop**. Al pasar el mouse sobre la imagen principal,
se hace zoom 2× siguiendo la posición del cursor (transform-origin
dinámico). Detectamos `pointer: fine` para no activarlo en touch (donde
no aporta y bloquea el tap). Cursor cambia a `cursor-zoom-in` y aparece un
icono discreto arriba a la derecha.

**Lightbox a pantalla completa** al hacer click/tap o presionar Enter
sobre la imagen principal:
- Fondo negro 90% opacity
- Imagen escalada al máximo dentro del viewport
- Botón cerrar arriba a la derecha
- Flechas izquierda/derecha en desktop para navegar
- **Teclado**: ← → para navegar, Esc para cerrar
- **Touch**: swipe horizontal para navegar (threshold 50px)
- **Pinch zoom nativo del navegador** habilitado (touch-pinch-zoom CSS)
- Contador "3 / 7" arriba al centro
- Thumbnails inferiores también clickeables
- Bloquea scroll del body mientras está abierto

Sin librerías externas. ~300 LOC vs 30+ KB típicos de yet-another-image-gallery.

### Decisiones técnicas

**Por qué hover-pan en lugar de magnifier glass (lupa flotante)**: la lupa
flotante necesita una imagen de mayor resolución que la principal para
mostrar detalle real, y la mayoría de fotos de proveedores no tienen
resolución suficiente. El hover-pan zoomea el mismo asset, garantizando
que siempre funciona aunque la imagen sea mediana. Cuando los proveedores
manden fotos de 2000px+, podemos sumar magnifier glass como variante
opcional.

**Por qué pinch nativo en lugar de implementar zoom touch propio**: el
navegador maneja pinch-to-zoom nativamente bien con `touch-action:
pinch-zoom`. Reimplementarlo con touch listeners propios es propenso a
bugs y conflictos con el swipe horizontal. La solución nativa es la
correcta aquí.

---

## 2 · Información detallada (`_ProductInfoTabs.tsx`)

### Antes
Cinco bloques en cascada vertical (Descripción, Composición, Modo de uso,
Advertencias, Contraindicaciones). En productos con composición larga +
advertencias largas, la página se volvía un muro de texto que empuja los
productos relacionados muy abajo.

### Ahora

**Desktop (md+): tabs horizontales**. Tab "Descripción" activo por
defecto. Click en otro tab cambia el contenido. Subrayado iris bajo el
tab activo. Patrón usado por Sephora, La Roche Posay, Natura, Loreal —
es lo que el comprador de cosmética y suplementos espera ver.

**Mobile: accordion stack**. Descripción abierta por defecto, las demás
colapsadas con chevron. Tabs en mobile son frágiles (ancho insuficiente
para etiquetas largas, scroll horizontal molesto), accordion es el
patrón estándar.

**Tabs con accesibilidad ARIA completa**: `role=tablist`, `role=tab`,
`role=tabpanel`, navegación por flechas ← → entre tabs, `aria-selected`,
`aria-controls`. Lectores de pantalla anuncian el cambio.

**Secciones vacías se omiten**. Si un producto no tiene "Modo de uso", no
aparece el tab; si no tiene ninguno de los cuatro campos, no se renderiza
el bloque entero.

### Por qué tabs y no dos columnas (rationale)

Los productos NaturalVita tienen información muy variable en longitud
según la categoría:
- Vitamina C: composición de 3 líneas, advertencias de 8.
- Fitoterapéutico: composición de 15 ingredientes, modo de uso de 2 líneas.
- Suplemento deportivo: descripción larga, modo de uso tabular.

Una grilla 2x2 con distribución rígida dejaría columnas desbalanceadas en
la mayoría de productos: una columna con espacio en blanco abajo, otra
con scroll. Los tabs resuelven esto sin compromisos: cada tab ocupa el
espacio que necesita.

Adicionalmente, **los tabs ponen lo que vende arriba**: imagen + nombre +
precio + descripción corta + CTA quedan en la mitad superior visible sin
scroll, sin compitir contra cinco bloques de información regulatoria. El
comprador lee composición o advertencias solo si tiene una restricción
específica (alergia, embarazo, dieta) y los encuentra con un click.

### Notas sobre el campo "Contraindicaciones"

En el schema actual, `composition_use` mezcla composición e ingredientes,
y las contraindicaciones aparecen embebidas dentro de `warnings`. Mantengo
ese mapeo porque cambiarlo requiere migración de BD y reescritura del
admin. Si el negocio necesita separar contraindicaciones como campo
propio, lo abrimos como Hito aparte.

---

## 3 · Cambios en `page.tsx`

- Importa `ProductGallery` y `ProductInfoTabs`.
- Reemplaza el bloque de galería estática por `<ProductGallery>`.
- Reemplaza el bloque de cinco secciones verticales por `<ProductInfoTabs>`.
- Limpia imports no usados (`Image`, `MarkdownRenderer` ya no se usan
  directamente en este archivo — viven dentro de los componentes nuevos).

Hay un import remanente: `RelatedProducts` y todo lo demás permanece igual.

---

## Cómo aplicar

Sube los 3 archivos respetando la estructura. `page.tsx` reemplaza al
existente; los dos `_*.tsx` son nuevos.

Verifica en GitHub que la carpeta `app/(public)/producto/[slug]/` tiene
ahora 4 archivos:
- `page.tsx`
- `_RelatedProducts.tsx` (preexistente, no se toca)
- `_ProductGallery.tsx` (nuevo)
- `_ProductInfoTabs.tsx` (nuevo)

---

## QA

Ve a una ficha de producto con varias imágenes (idealmente 3-5).

**Galería desktop:**
1. Pasa el mouse sobre la imagen principal → debe hacer zoom 2× siguiendo
   el cursor.
2. Click en una thumbnail → la imagen principal cambia.
3. Click en la imagen principal → abre lightbox a pantalla completa.
4. En lightbox: flechas ← → navegan, Esc cierra. Click en thumbs
   inferiores cambia. Click fuera de la imagen cierra.

**Galería mobile** (DevTools responsive o teléfono real):
1. Las thumbnails están debajo en scroll horizontal.
2. Tap en thumbnail cambia.
3. Tap en imagen principal abre lightbox.
4. En lightbox: swipe horizontal navega. Pinch hace zoom. Tap fuera cierra.

**Info detallada desktop:**
1. Bajo la sección de compra, ves cuatro tabs en línea: Descripción /
   Composición / Modo de uso / Advertencias.
2. "Descripción" está activo (subrayado iris) y muestra el texto.
3. Click en "Composición" → cambia el contenido sin scroll.
4. Si una sección no tiene contenido en BD, su tab no aparece.

**Info detallada mobile:**
1. Bajo la sección de compra, ves un encabezado "Información del producto"
   y debajo la lista de secciones como accordion.
2. "Descripción" está abierto.
3. Tap en "Composición" → expande con animación de chevron.
