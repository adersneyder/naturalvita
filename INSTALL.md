# NaturalVita · Patch · Fix schema tax_rates + cálculo fiscal correcto

Dos archivos modificados:

```
lib/checkout/orders.ts                          ← FIX schema + lógica fiscal
app/(public)/checkout/_OrderSummarySidebar.tsx  ← simplifica IVA en sidebar
```

Build verde, 0 errores TS.

---

## Qué pasó (diagnóstico)

Al hacer click "Confirmar y pagar" salía "Error consultando productos".
Causa real: en mi código de Sesión C asumí que la columna de IVA en la
tabla `tax_rates` se llamaba `percentage`, pero en tu BD se llama
`rate_percent`. Supabase rechazaba el query y caía en el catch genérico.

**Adicionalmente**, descubrí algo más serio que silenciosamente habría
duplicado el IVA cobrado al cliente: **tu modelo fiscal usa
`tax_type='included'`** (IVA incluido en `price_cop`), no IVA agregado
encima del precio. Mi código original sumaba IVA encima, lo que habría
cobrado de más. Este patch lo corrige.

## Modelo fiscal correcto que ahora respeto

Tu tabla `tax_rates` tiene cuatro tipos:

| Código | tax_type | rate | Aplicación |
|--------|----------|------|------------|
| EXCLUIDO | excluded | 0% | Suplementos dietarios — no aplica IVA |
| IVA_19 | included | 19% | Cosméticos/aceites/deportivos — IVA ya incluido en precio |
| IVA_5 | included | 5% | Tarifa reducida — IVA ya incluido |
| EXENTO | exempt | 0% | Medicamentos INVIMA — aparece en factura al 0% |

**Regla clave**: el cliente siempre paga `price_cop * quantity`. El IVA
es un desglose informativo, no se suma encima.

Mi código ahora calcula correctamente:

- `included` con rate > 0: subtotal = `price_cop / (1 + rate/100)`,
  IVA = `price_cop - subtotal`. Cliente paga `price_cop`.
- `excluded`: subtotal = `price_cop`, IVA = 0. Cliente paga `price_cop`.
- `exempt`: subtotal = `price_cop`, IVA = 0 (reportado al 0%). Cliente paga `price_cop`.

## Cambios en `_OrderSummarySidebar.tsx`

Antes el sidebar asumía 19% de IVA para TODOS los productos del carrito.
Ese supuesto era incorrecto en la mayoría de tu catálogo (muchos productos
son `excluded` por ser suplementos dietarios).

Calcular IVA preciso en el cliente requeriría enviar el `tax_type` de cada
producto al carrito de localStorage, lo cual no hacemos hoy. **Decisión
honesta**: el sidebar ahora muestra solo "Subtotal + Envío + Total", sin
desglosar IVA. El desglose preciso aparece en el email de confirmación
post-pago donde sí tengo los tax_types exactos por producto.

Esto NO afecta el monto cobrado al cliente (que siempre fue `price_cop`).
Solo cambia que no le mostramos un IVA inventado en el sidebar.

---

## Cómo aplicar

Sube los dos archivos a sus rutas exactas reemplazando los existentes.
Vercel auto-deploy.

---

## QA

1. Recarga `/checkout` en preview con un producto en el carrito.
2. Verifica que el sidebar muestre solo: Subtotal · Envío · Total.
3. Click "Confirmar y pagar".
4. Ahora debe **crear la orden sin error** y mostrar el botón de Bold.
5. Si lo abres y completas con monto $555.001, Bold simulará aprobado y
   llegarán los emails con el IVA correctamente desglosado por producto
   según su tax_type.

---

## Lo que esto enseña para adelante

Cada vez que escriba código que toque BD, voy a verificar el schema real
con MCP **antes** de armar las queries — no después de un error en
producción. Lo mismo para casos fiscales: mi default era "IVA agregado"
porque es el modelo común en USA y Europa, pero Colombia con
`tax_type='included'` es distinto y debí mirarlo desde el día uno.

Si encuentras más asunciones mías que no calzan con tu schema real,
mándame screenshot del error y los logs de Vercel y los corrijo igual
de rápido.
