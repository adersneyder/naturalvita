# NaturalVita · Patch · Tracking clickeable en toda la UI

Continuación del patch de tracking deep-link. Hace que **todo el bloque
visible del número de guía sea clickeable** en cualquier parte de la
UI donde aparezca, manteniendo consistencia visual y eliminando la
fricción de "ver número y no poder hacer click directo".

5 archivos. Sin migración DB. Build verde con 41 rutas.

---

## Estructura del ZIP

```
nv-fix-tracking-clickable/
├── INSTALL.md
├── app/
│   ├── (public)/mi-cuenta/
│   │   ├── _OrdersListPanel.tsx              ← MODIFICADO
│   │   └── pedido/[order_number]/
│   │       └── page.tsx                      ← MODIFICADO
│   └── admin/pedidos/[id]/
│       └── page.tsx                          ← MODIFICADO
├── components/orders/
│   └── TrackingChip.tsx                      ← NUEVO
└── lib/checkout/
    └── customer-orders.ts                    ← MODIFICADO
```

---

## El cambio en una frase

Creé un componente compartido `<TrackingChip />` que renderiza el
tracking de forma clickeable cuando hay deep-link, o display estático
cuando no. Lo uso en las 3 superficies donde aparece el tracking:
detalle cliente, listado pedidos cliente, detalle admin. Toda la zona
visible del número de guía es clickeable, no solo un botón al final.

---

## Antes vs ahora

### Detalle del pedido del cliente (`/mi-cuenta/pedido/[order_number]`)

**Antes**:
```
─────────────────────────────────
Número de guía         Transp.
1234567890             Servientrega   ← texto estático
                                       
[ Rastrear con Servientrega ↗ ]   ← solo el botón clickeable
─────────────────────────────────
```

**Ahora**:
```
┌────────────────────────────────┐  ← TODO el card clickeable
│ Número de guía       Transp.   │     bg leaf-100, hover destaca
│ 1234567890           Servient. │     focus ring iris
│                                │
│ Click para rastrear con...  ↗ │
└────────────────────────────────┘
```

El cliente puede hacer click en el número, en el label, en cualquier
zona del card → siempre va al tracking de Servientrega con el número
pre-llenado. UX consistente con Temu, Mercado Libre, Falabella.

### Listado de pedidos del cliente (`?tab=pedidos`)

**Antes**: solo número de pedido + estado + total. El cliente debía
abrir cada pedido para ver el tracking.

**Ahora**: si el pedido está enviado o entregado, debajo de la fila
aparece una línea inline:
```
NV-20260504-FR5R · 2 productos · 4 may 2026 · PAGADO · $13.500
1234567890 · Servientrega ↗     ← clickeable inline
```

Click en esa línea inline → tracking. Click en cualquier otra parte de
la fila → detalle del pedido (comportamiento normal). Manejo del
evento via `e.stopPropagation()` para que no chocan los dos clicks.

### Detalle admin (`/admin/pedidos/[id]`)

**Antes**: bloque texto plano "Transportadora: Servientrega" + "Guía:
1234567890" + link separado pequeñito "Abrir tracking →".

**Ahora**: mismo `<TrackingChip />` que el cliente. Toda la zona
clickeable. Visualmente idéntico al cliente — admins y clientes ven el
mismo componente.

---

## El componente nuevo: `<TrackingChip />`

Reutilizable, con dos variants:

```tsx
// En detalle (vertical, prominente)
<TrackingChip
  trackingNumber={order.tracking_number}
  shippingCarrier={order.shipping_carrier}
  variant="card"
/>

// En listado (compacto, una línea)
<TrackingChip
  trackingNumber={order.tracking_number}
  shippingCarrier={order.shipping_carrier}
  variant="inline"
/>
```

Lógica de comportamiento:

| Estado                                             | Resultado visual |
|----------------------------------------------------|------------------|
| Carrier soporta deep-link Y hay número             | `<a>` que envuelve todo el chip → abre tracking |
| Carrier sin deep-link (TCC, Domina, "Otra") + número | Display estático con texto explicativo "copia y pega" |
| Carrier definido pero sin número aún                | "Guía pendiente de actualizar" en gris |
| Sin carrier ni número                               | No renderiza nada (`return null`) |

**Accesibilidad**:
- `aria-label="Rastrear con Servientrega"` en el link.
- `target="_blank" rel="noopener noreferrer"` para seguridad de external links.
- `focus:ring-2 focus:ring-iris-700/30` para visibilidad de teclado.
- En el listado, `e.stopPropagation()` previene navegación al detalle cuando se hace click en el chip.

---

## Confirmaciones de tu pregunta

> *"Imagino que desde admin se escribe la guía y se asocia la
> transportadora, manualmente."*

**Confirmado**, así es. El flujo operativo del admin:
1. `/admin/pedidos/[id]` → click "Marcar como enviado".
2. Selecciona transportadora del dropdown.
3. Escribe el número de guía a mano (el que le dio la transportadora
   al despachar).
4. Click "Confirmar envío" → sistema persiste, envía email al cliente,
   dispara evento.

Sin integración API con transportadoras (eso sería Hito 3+ — agrega
mucha complejidad y la mayoría de e-commerce colombianos a este
tamaño operan exactamente así).

> *"Desde la cuenta del usuario, el número de guía también tendrá link
> asociado o solo será desde el correo?"*

**Ahora sí, en ambos lados**. Y no solo el botón al final — toda la
zona visible del tracking. Implementado en:

- Email "Pedido enviado" (botón principal).
- `/mi-cuenta/pedido/[order_number]` (card grande clickeable).
- `/mi-cuenta?tab=pedidos` listado (chip inline en cada fila enviada).
- `/admin/pedidos/[id]` cronología (mismo card clickeable que el cliente).

---

## Aplicar

1. Sube los 5 archivos al repo.
2. Vercel deploy automático ~1 minuto.
3. **Si todavía no aplicaste el patch anterior `nv-fix-carrier-tracking`**,
   este patch lo asume (necesitas `lib/shipping/carriers.ts` + migración
   `add_shipping_carrier_to_orders`). Si ya aplicaste el anterior, este
   reemplaza encima.

## Validación post-deploy

Si tienes pedidos con `shipping_carrier` ya seteado:

1. Como cliente: `/mi-cuenta?tab=pedidos` → ver chip inline con
   número + carrier + flecha ↗ debajo de cada pedido enviado.
2. Click en ese chip → abre tracking en pestaña nueva. NO navega al
   detalle del pedido (eso pasa solo si haces click en otra parte de
   la fila).
3. Click en el resto de la fila → va al detalle del pedido.
4. En el detalle: card grande con el número, hover hace que se
   destaque. Click en cualquier parte → tracking.
5. Como admin `/admin/pedidos/[id]`: ver el mismo card grande
   clickeable en el sidebar de cronología.

Si **no tienes pedidos con shipping_carrier**, ejecuta en Supabase
Studio para que tu pedido FR5R tenga uno:

```sql
UPDATE orders
SET shipping_carrier = 'servientrega'
WHERE order_number = 'NV-20260504-FR5R';
```

Y recarga la página para ver el chip clickeable.
