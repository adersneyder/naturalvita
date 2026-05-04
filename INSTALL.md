# NaturalVita · Patch · Tracking deep-link estilo Temu

Permite que el cliente haga click en el botón "Rastrear con [Carrier]"
desde el email "Pedido enviado" (o desde `/mi-cuenta/pedido/...`) y
sea llevado directo a la página de tracking de la transportadora con
el número de guía pre-llenado.

8 archivos. 1 migración SQL aplicada por MCP Supabase. Build verde
con 41 rutas, 0 errores TS.

---

## Migración aplicada por MCP

Sin acción de tu parte. Migración `add_shipping_carrier_to_orders`:

```sql
ALTER TABLE public.orders ADD COLUMN shipping_carrier text;
COMMENT ON COLUMN public.orders.shipping_carrier IS
  'Slug de la transportadora (ver lib/shipping/carriers.ts)';
```

Ya está en BD. Tu pedido NV-20260504-FR5R quedó con `shipping_carrier=NULL`
porque se marcó shipped antes de esta migración. Eso está OK — el botón
de tracking simplemente no aparece en ese pedido viejo, y el resto del
sistema funciona igual.

---

## Estructura del ZIP

```
nv-fix-carrier-tracking/
├── INSTALL.md
├── app/
│   ├── (public)/mi-cuenta/pedido/[order_number]/
│   │   └── page.tsx                      ← MODIFICADO
│   └── admin/pedidos/
│       ├── actions.ts                    ← MODIFICADO
│       └── [id]/
│           ├── page.tsx                  ← MODIFICADO
│           └── _OrderActions.tsx         ← MODIFICADO
└── lib/
    ├── admin/admin-orders.ts             ← MODIFICADO
    ├── checkout/customer-orders.ts       ← MODIFICADO
    ├── email/templates/order-shipped.tsx ← MODIFICADO
    └── shipping/
        └── carriers.ts                   ← NUEVO
```

---

## Aplicar

Sube los 8 archivos a sus rutas exactas. Sin variables de entorno
nuevas. Vercel hará deploy automáticamente.

---

## Lo que cambió

### 1. `lib/shipping/carriers.ts` (nuevo, fuente de verdad)

Catálogo de transportadoras soportadas con builders de URL deep-link.
Soporta:

- **Servientrega** — deep link funcional con `?numero=`
- **Coordinadora** — deep link funcional con `?guia=`
- **Interrapidísimo** — deep link funcional con `?guia=`
- **Envia.co** — deep link funcional con `?guia=`
- **Deprisa** — deep link funcional con `?TipoConsulta=Guia&CodigoBusqueda=`
- **TCC** — sin deep link (su tracking es POST), abre página genérica
- **Domina** — sin deep link público (requiere login), no abre nada
- **Otra** — texto libre, sin deep link

Funciones públicas:

- `buildTrackingUrl(slug, trackingNumber)` → `string | null`
- `getCarrierLabel(slug)` → `string | null` (nombre legible)
- `isValidCarrierSlug(value)` → guard de tipo

Para agregar una transportadora: una línea en el objeto `CARRIERS` y
ya está. La UI, validación y tipos se actualizan automáticamente.

### 2. Admin: dropdown de transportadoras

En `/admin/pedidos/[id]`, al hacer click en "Marcar como enviado":

**Antes**: dos inputs de texto libre (transportadora y guía). El admin
podía escribir "Servientrega" o "servientrega" o "SERVI" — cualquier
cosa, sin validación.

**Ahora**:
- Dropdown obligatorio con las 8 transportadoras predefinidas + "Otra".
- Si elige "Otra", aparece input para nombre libre (queda como label
  visible pero sin botón de tracking).
- Si elige una predefinida + escribe número de guía, aparece preview:
  *"El cliente verá un botón 'Rastrear con [Carrier]' que abre el
  tracking directo."*

El slug se persiste en `orders.shipping_carrier` (ej: `'servientrega'`)
y el número en `orders.tracking_number` como antes.

### 3. Email "Pedido enviado" enriquecido

La plantilla `lib/email/templates/order-shipped.tsx` ahora muestra:

- Bloque resaltado con número de guía + nombre de transportadora.
- **Botón principal "Rastrear con [Carrier]"** (iris púrpura) que abre
  la página de tracking de la transportadora con el número
  pre-llenado, en una pestaña nueva.
- **Botón secundario "Ver detalle en NaturalVita"** (blanco con borde)
  que abre `/mi-cuenta/pedido/[order_number]`.

Si la transportadora no soporta deep link (TCC, Domina, "Otra"):
- Sin botón principal de tracking.
- Mensaje informativo: "Para rastrear el envío, copia el número de
  guía y búscalo en la página de [Carrier]."
- El botón "Ver detalle del pedido" pasa a ser el principal (iris).

### 4. `/mi-cuenta/pedido/[order_number]` enriquecido

El detalle del pedido del cliente muestra el mismo botón "Rastrear con
[Carrier]" cuando aplica, dentro del card de "Estado del pedido"
debajo de la cronología visual. Solo aparece para pedidos en estado
`shipped` o `delivered`.

### 5. `/admin/pedidos/[id]` con link rápido al tracking

El sidebar de cronología en admin ahora muestra:
- Nombre legible de la transportadora.
- Número de guía en font monoespaciado.
- Link "Abrir tracking →" que abre la página de la transportadora con
  el número pre-llenado (sólo si soporta deep link).

Útil para soporte: el admin puede consultar el estado del envío sin
salir de NaturalVita.

---

## Validación post-deploy

Una vez subido el ZIP y deploy verde:

1. **Crea un pedido nuevo de prueba** o usa uno futuro real. NO uses
   FR5R porque su `shipping_carrier` está NULL y no tendrá botón.

2. Como admin: marcar como enviado con Servientrega + número
   ficticio "1234567890". Click "Confirmar envío".

3. Revisar email recibido en Gmail: debe tener:
   - Bloque con el número 1234567890 + "Transportadora: Servientrega".
   - Botón iris "Rastrear con Servientrega" arriba.
   - Botón blanco "Ver detalle en NaturalVita" abajo.

4. Click en "Rastrear con Servientrega": abre nueva pestaña a
   `https://www.servientrega.com/wps/portal/rastreo-envio?numero=1234567890`.

5. Como cliente en `/mi-cuenta/pedido/[NUM]`: ver el mismo botón
   "Rastrear con Servientrega" debajo de la cronología.

6. Como admin en `/admin/pedidos/[id]`: ver "Transportadora:
   Servientrega" + "Guía: 1234567890" + link "Abrir tracking →" en el
   sidebar de cronología.

---

## Notas

**El pedido NV-20260504-FR5R existente tiene `shipping_carrier=NULL`**
porque la migración llegó después de marcarse shipped. No tendrá botón
de tracking en ningún lado. Si querés rellenarlo manualmente para
testear con esa orden, ejecutá en Supabase Studio:

```sql
UPDATE orders
SET shipping_carrier = 'servientrega'
WHERE order_number = 'NV-20260504-FR5R';
```

**Verificación de URLs de transportadoras**: las URLs en `carriers.ts`
fueron tomadas de las páginas oficiales actuales. Si una transportadora
cambia su estructura de URL (raro pero pasa), basta editar la lambda
de `buildTrackingUrl` correspondiente. Sin migración, sin redeploy de
DB, sólo modificar el archivo y desplegar Next.

**Por qué TCC y Domina no soportan deep link**: TCC usa POST en su
formulario de tracking (no acepta query string GET), Domina exige
login en su portal. Si querés que el cliente igualmente vea un botón
"Ver tracking" que los lleve a la página principal aunque tengan que
pegar el número, lo agrego — solo dime.

**Próximos pasos sugeridos** (si querés en otro patch):
- Agregar guardar carrier para cuando crees un pedido con destino
  Bogotá (envío express): el sistema podría sugerir Coordinadora o
  Servientrega automáticamente.
- Estado en vivo del tracking via API (algunas transportadoras
  exponen API REST: Coordinadora, Servientrega). Esto es Hito 3+,
  agrega complejidad considerable.
