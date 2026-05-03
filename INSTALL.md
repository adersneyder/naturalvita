# NaturalVita · Patch · Permitir cualquier valor entero en precios

Un solo archivo modificado:

```
app/admin/productos/[id]/_components/ProductEditor.tsx
```

Cambia `step="100"` a `step="1"` en los inputs de **Precio de venta** y
**Precio comparativo** del editor de productos del admin.

Sin deps, sin SQL, sin env. Build verde, 0 errores TS.

---

## Qué cambia

Antes: el navegador rechazaba precios que no fueran múltiplos de 100
(ej: $60.276) con el mensaje "Los dos valores válidos más aproximados
son 60200 y 60300".

Ahora: cualquier valor entero positivo es aceptado. Ej: $60.276, $19.999,
$155.555 — todos válidos.

Las flechas arriba/abajo del input ahora se mueven de 1 en 1 (en lugar
de 100 en 100). Es consistente con la validación: si la validación
acepta cualquier entero, los controles también deberían moverse de 1 en 1.
Si necesitas subir cientos rápido, usa el teclado (mantén pulsado o escribe
el valor directo).

**Decimales siguen rechazados** — el COP no usa centavos en operaciones
reales y todos los campos en BD son `integer`. Si alguien intenta `60.276,50`
el navegador rechaza el decimal, comportamiento correcto.

---

## Cómo aplicar

Sube el archivo único reemplazando el existente. Vercel auto-deploy.

---

## QA

En `/admin/productos/{id}` o `/admin/productos/nuevo`:

1. Edita el campo "Precio de venta" y pon `60276`. Click "Guardar".
   Debe guardar sin error.
2. Pon `19999`. Guardar. OK.
3. Pon `155555`. Guardar. OK.
4. Pon `123.45` (con decimal). El navegador debe rechazarlo — esto es
   intencional, COP no usa centavos.
5. Las flechas arriba/abajo del input ahora suben de 1 en 1. Si pierdes
   esa conveniencia, puedes seguir escribiendo el valor directo o usar
   las teclas Page Up/Down (algunos navegadores las mapean a saltos
   más grandes).

---

## Por qué este cambio

El `step="100"` era una conveniencia que asumía que todos los precios
serían "redondos". En la realidad, los precios de los laboratorios
colombianos vienen con cualquier número (al cambio del USD, márgenes
variables, redondeos del proveedor). Forzar múltiplos de 100 era una
restricción artificial que bloqueaba operación legítima.

Esta es la primera de varias correcciones operativas que pueden surgir
mientras llenas el catálogo. Si encuentras más restricciones similares
en otros campos del admin (stock, peso, dimensiones), me avisas y las
afinamos con la misma lógica.
