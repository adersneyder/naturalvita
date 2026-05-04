# NaturalVita · Hito 1.7 Sesión D · Mi cuenta enriquecida + admin pedidos/clientes

Cierre completo del Hito 1.7. Convierte `/mi-cuenta` de scaffolding a
experiencia 100% funcional, abre el panel admin de pedidos y clientes
con acciones operativas reales (despacho, cancelación, reembolso) y deja
preparado el plumbing para integrar Klaviyo en Hito 2 sin reescribir
nada del flujo.

23 archivos. 1 migración SQL aplicada por MCP Supabase.
Build de producción verde: **41 rutas**, 0 errores TS.

---

## Migración aplicada por MCP Supabase

**No requiere acción de tu parte** — la migración ya fue aplicada
directamente por el MCP de Supabase. Se llama
`admin_policies_for_orders_and_customers` y agrega 5 policies RLS:

```sql
-- ORDERS
CREATE POLICY "Admins read all orders" ON public.orders
  FOR SELECT TO authenticated
  USING (current_admin_role() IS NOT NULL);

CREATE POLICY "Admins update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (current_admin_role() = ANY (ARRAY['owner','admin']))
  WITH CHECK (current_admin_role() = ANY (ARRAY['owner','admin']));

-- ORDER_ITEMS, CUSTOMERS, ADDRESSES (solo SELECT)
-- (idem patrón con current_admin_role() IS NOT NULL)
```

Estas policies habilitan al panel admin a ver y modificar pedidos,
items, clientes y direcciones sin saltarse RLS con service-role en
cada query.

---

## Estructura del ZIP

```
nv-hito-1.7-sesion-d/
├── INSTALL.md
├── app/
│   ├── (public)/mi-cuenta/
│   │   ├── _AccountTabs.tsx           ← NUEVO (tabs cliente)
│   │   ├── _SummaryPanel.tsx          ← NUEVO (overview KPIs + últimos pedidos)
│   │   ├── _OrdersListPanel.tsx       ← NUEVO (listado pedidos cliente)
│   │   ├── _AddressesPanel.tsx        ← NUEVO (CRUD direcciones)
│   │   ├── _DataPanel.tsx             ← NUEVO (editar perfil)
│   │   ├── actions.ts                 ← NUEVO (server actions cliente)
│   │   ├── page.tsx                   ← REEMPLAZADO (orquesta tabs)
│   │   └── pedido/[order_number]/
│   │       └── page.tsx               ← NUEVO (detalle pedido cliente)
│   └── admin/
│       ├── page.tsx                   ← MODIFICADO (KPIs reales pedidos hoy)
│       ├── _components/
│       │   └── AdminPagination.tsx    ← NUEVO (paginación admin)
│       ├── pedidos/
│       │   ├── page.tsx               ← NUEVO (listado admin)
│       │   ├── actions.ts             ← NUEVO (mark shipped/cancelled/etc)
│       │   ├── _OrdersFilters.tsx     ← NUEVO (filtros)
│       │   └── [id]/
│       │       ├── page.tsx           ← NUEVO (detalle admin)
│       │       └── _OrderActions.tsx  ← NUEVO (panel acciones)
│       └── clientes/
│           ├── page.tsx               ← NUEVO (listado clientes)
│           └── [id]/
│               └── page.tsx           ← NUEVO (detalle cliente)
├── components/orders/                  (compartidos cliente y admin)
│   ├── StatusBadge.tsx                ← NUEVO
│   └── OrderTimeline.tsx              ← NUEVO
└── lib/
    ├── admin/
    │   └── admin-orders.ts            ← NUEVO (queries admin reusables)
    ├── checkout/
    │   └── customer-orders.ts         ← NUEVO (queries cliente + timeline)
    ├── email/templates/
    │   └── order-shipped.tsx          ← NUEVO (5° plantilla email)
    └── events/
        └── track.ts                   ← NUEVO (stub Klaviyo)
```

---

## Aplicar

### Paso 1: Subir todos los archivos al repo

Sube los 23 archivos a sus rutas exactas. Ningún archivo borra
contenido del repo — todos son nuevos excepto:
- `app/(public)/mi-cuenta/page.tsx` (reemplaza el de Sesión A con
  scaffolding "Próximamente").
- `app/admin/page.tsx` (modifica solo los KPIs hardcoded; el resto del
  dashboard se conserva).

### Paso 2: Verificar variables de entorno

Sin cambios. Sigue usando las mismas variables de Vercel que ya tienes
configuradas (Resend, Bold, Supabase). El nuevo módulo `lib/events/track.ts`
no requiere ninguna variable; cuando integres Klaviyo en Hito 2,
agregarás `KLAVIYO_API_KEY` ahí.

### Paso 3: Verificar deploy en Vercel

Vercel hace auto-deploy. Espera ~1 minuto, ve a `vercel.com →
naturalvita → Deployments`. El último build debe estar verde con 41
rutas.

---

## Funcionalidad implementada

### Cliente: `/mi-cuenta` enriquecida

Cuatro pestañas en una sola URL con `?tab=...`:

**Resumen** (`/mi-cuenta`):
- Bienvenida con nombre del cliente.
- KPIs: pedidos realizados, total invertido.
- Últimos 3 pedidos con badges de estado clickeables al detalle.
- Dirección predeterminada visible.
- Empty state si no hay pedidos aún.

**Pedidos** (`?tab=pedidos`):
- Lista completa de pedidos del cliente con badge de pago, fecha, total.
- Mobile-friendly: se reorganiza en stack en pantallas chicas.
- Click → detalle del pedido en `/mi-cuenta/pedido/[order_number]`.

**Direcciones** (`?tab=direcciones`):
- CRUD completo: agregar, editar, eliminar, marcar predeterminada.
- Form con DIVIPOLA (32 deptos + 350 municipios + Otro libre) reusando
  el mismo helper que el checkout.
- Validación con Zod compartida cliente/server.
- Si no hay direcciones, abre el form de nueva automáticamente.
- La primera dirección creada se marca default automáticamente.

**Mis datos** (`?tab=datos`):
- Form para nombre completo, teléfono, tipo + número de documento,
  consentimiento marketing.
- Email NO editable (es la identidad del usuario en auth.users).
- Validación con `ContactSchema` reusado del checkout.

### Cliente: detalle pedido `/mi-cuenta/pedido/[order_number]`

- Timeline visual de 4 etapas: Recibido → Pagado → Enviado → Entregado.
  Etapas terminadas en verde leaf, actual con pulse iris, pendientes en
  earth-100 vacío. Si la orden fue cancelada o reembolsada, las etapas
  no alcanzadas se muestran tachadas.
- Lista de items con imagen, SKU, cantidad y subtotal.
- Sidebar con resumen monetario (subtotal, IVA, envío, descuento, total).
- Dirección de envío visible.
- Mensaje contextual si la orden está cancelada o reembolsada.

### Admin: `/admin/pedidos`

- Listado paginado (25 por página) ordenado por fecha desc.
- Filtros por:
  - Búsqueda libre: order_number, customer_email, customer_name (ILIKE).
  - Estado: 7 valores canónicos (pending → refunded).
  - Estado de pago: 5 valores (pending → partially_refunded).
- Cada fila muestra pedido + cliente + fecha + dos badges de estado + total.
- Click → detalle.

### Admin: detalle pedido `/admin/pedidos/[id]`

Layout en 2 columnas:

**Columna principal**:
- Cliente (con link al perfil del cliente).
- Items del pedido (con link a cada producto).
- Totales con desglose IVA + envío.
- Bold tracking (payment_id + paid_at) cuando aplica.

**Sidebar**:
- Panel de acciones operativas (ver siguiente sección).
- Timeline visual igual al del cliente.
- Dirección de envío.

### Acciones operativas admin

El panel de acciones en `/admin/pedidos/[id]` muestra solo las acciones
válidas según el estado actual del pedido:

| Estado actual                | Acciones disponibles                           |
|------------------------------|------------------------------------------------|
| pending                      | Cancelar                                       |
| paid                         | Marcar en preparación, Marcar enviado, Cancelar, Reembolsado |
| processing                   | Marcar enviado, Cancelar, Reembolsado          |
| shipped                      | Marcar entregado, Reembolsado                  |
| delivered                    | Reembolsado                                    |
| cancelled, refunded          | (ninguna; estados terminales)                  |

Detalle de cada acción:

**Marcar en preparación** (`processing`): solo cambia status, sin email.
Útil para cuando el equipo empieza a armar el paquete.

**Marcar enviado** (`shipped`): captura número de guía + transportadora
opcionales, marca status=shipped + fulfillment=fulfilled,
shipped_at=now. **Side effects**: envía email al cliente con plantilla
"Pedido enviado" (incluye número de guía si existe) + dispara evento
`Fulfilled Order` al stub de tracking.

**Marcar entregado** (`delivered`): pide confirmación, setea
status=delivered + delivered_at=now. NO envía email (sería redundante
— el cliente ya tiene el paquete).

**Cancelar pedido**: pide razón opcional que se acumula en `notes` con
fecha. Cambia status=cancelled. **Importante**: NO ejecuta reembolso
automático en Bold — si el pedido estaba pagado, el admin debe
reembolsar manualmente desde panel Bold y después usar la acción
"Marcar reembolsado".

**Marcar reembolsado**: pide razón opcional, marca
status=refunded + payment_status=refunded. Útil cuando Bold no envía
webhook VOID_APPROVED o cuando se procesa un reembolso fuera del
sistema. Idempotente con el webhook real cuando llegue.

**Notas internas**: textarea de notas privadas del equipo (no visibles
al cliente). Botón "Guardar" aparece solo cuando hay cambios sin
guardar.

### Admin: `/admin/clientes`

- Lista de los 200 clientes más recientes.
- Por cada uno: nombre, email, teléfono, # pedidos totales, total gastado
  (solo pedidos pagados).
- Click → detalle del cliente.

### Admin: detalle cliente `/admin/clientes/[id]`

- Resumen: total invertido, pedidos completados.
- Lista cronológica de todos los pedidos del cliente.
- Direcciones guardadas con badge de "Predeterminada".
- Información de contacto: email, teléfono, documento, consentimiento
  marketing.

### Dashboard `/admin` actualizado

Los KPIs hardcoded a 0 ahora muestran datos reales:
- "Ventas hoy" suma `total_cop` de todos los pedidos pagados creados
  desde medianoche hora Bogotá.
- "Pedidos hoy" cuenta pedidos creados desde medianoche.
- "Productos activos" sigue como antes.
- "Visitantes hoy" sigue en 0 (Hito 2: tracking).

Sección "Requieren atención" gana fila nueva: "Pedidos por despachar"
(pagados, sin enviar). Reemplaza la fila de "Mensajes del chatbot" que
no aplica todavía.

### Email "Pedido enviado"

Quinta plantilla en `lib/email/templates/order-shipped.tsx`. Replica el
diseño de las otras 4 (header NaturalVita serif + card blanca + botón
iris) y muestra:
- Saludo personalizado.
- Número de pedido + tiempo estimado.
- Bloque destacado de número de guía si existe (mono font, easy-to-copy).
- Transportadora si se proporciona.
- Dirección destino.
- Botón a `/mi-cuenta/pedido/[order_number]`.

### Plumbing Klaviyo (`lib/events/track.ts`)

Stub que loguea a console + console.log mínimo en producción. Cuatro
funciones tipadas listas para reemplazar el cuerpo cuando entre Klaviyo:

- `trackOrderPlaced` (cuando se crea la orden pendiente)
- `trackOrderPaid` (cuando webhook SALE_APPROVED de Bold llega)
- `trackOrderShipped` (cuando admin marca shipped — YA usado en Sesión D)
- `trackOrderRefunded` (cuando se reembolsa)

Convención de nombres compatible con el ecosistema estándar de
e-commerce tracking (Klaviyo, Segment): "Placed Order", "Ordered
Product", "Fulfilled Order", "Refunded Order".

**Por qué stub y no integración real**: integrar Klaviyo hoy mismo
agregaría una dependencia bloqueante con ese servicio (variable de
entorno, manejo de fallos, sincronización de listas) sin valor
inmediato — no hay clientes reales todavía. Cuando llegue Hito 2 con
"Pre-lanzamiento controlado", se cambia el cuerpo de las 4 funciones y
todo el código consumidor sigue funcionando sin modificaciones.

---

## Lo que NO incluye este Sesión D

**No se construyó porque depende del webhook Bold bloqueado**:

- Eventos Klaviyo automáticos al pagar (`trackOrderPaid` en el webhook
  Bold). El call site existe pero el webhook nunca dispara hoy. Cuando
  Bold arregle, agregar la línea `await trackOrderPaid(...)` dentro del
  handler `SALE_APPROVED` del webhook.

**No se construyó porque NO es prioridad ahora**:

- Reembolso ejecutado vía API Bold desde el admin. Hoy el admin debe
  procesar reembolsos en el panel de Bold y después marcar en
  NaturalVita. Esto es deliberado: la integración con la API de
  reembolsos de Bold cuando los webhooks no entregan correctamente
  agregaría complejidad sin certeza de funcionamiento.
- Búsqueda en `/admin/clientes` con filtros. Hoy carga los 200 más
  recientes. Si llegamos a ese volumen, agregamos paginación + búsqueda
  con la misma plantilla de `/admin/pedidos`.
- Reenviar email de pedido desde admin (botón "Reenviar confirmación").
  Útil si un cliente reporta no haber recibido. Lo implementaríamos
  como acción extra en `_OrderActions.tsx`. Bajo demanda.

---

## Validación post-deploy

Una vez subido el ZIP y deploy verde:

### Como cliente:
1. Login en `/iniciar-sesion`.
2. `/mi-cuenta` → ver tabs funcionando, datos personales editables.
3. `?tab=direcciones` → agregar nueva dirección, marcar default,
   eliminar otra.
4. `?tab=pedidos` → ver tu pedido NV-20260504-FR5R con badge "Pago
   confirmado".
5. Click en el pedido → ver timeline con primera etapa "Pedido
   recibido" + segunda etapa "Pago confirmado" en verde, las dos
   siguientes pendientes.

### Como admin:
1. Login en `/admin/login`.
2. Dashboard → ver KPI "Pedidos hoy: 1" (o lo que corresponda) y
   "Pedidos por despachar: 1" en sidebar de atención.
3. `/admin/pedidos` → ver listado con tu orden NV-20260504-FR5R.
4. Click en la orden → ver detalle con timeline + items + totales +
   acciones.
5. **Probar acción "Marcar enviado"**: poner número de guía ficticio y
   transportadora, click confirmar. Resultado: status pasa a `shipped`,
   email llega al cliente desde `info@naturalvita.co`, fecha shipped_at
   se setea.
6. **Probar acción "Marcar entregado"**: click, confirmar, status pasa a
   `delivered`. Sin email.
7. `/admin/clientes` → ver los 2 clientes registrados.
8. Click en el cliente sneyderpst@gmail.com → ver perfil con su pedido
   FR5R + dirección guardada.

### Validación cruzada cliente:
9. Volver a `/mi-cuenta?tab=pedidos` → la orden ahora muestra "Enviado"
   (o "Entregado" si llegaste a ese paso).
10. Click → timeline visualmente actualizado, número de guía visible.

---

## Próximos pasos sugeridos

Con Hito 1.7 cerrado al 100%, las opciones para el siguiente paso son:

**Opción A — Hito 2 Sesión A "Pre-lanzamiento controlado"**: plantillas
Klaviyo, página `/sobre-nosotros`, Google Search Console, Microsoft
Clarity, banner cupón. Mi recomendación.

**Opción B — Hito 1.3 retomar**: gestión de admins con sistema de
invitaciones (la tabla `admin_invitations` ya existe en BD). Útil
cuando crezca el equipo, pero no urgente con un solo admin.

**Opción C — Esperar respuesta de Bold y validar webhook real**:
mientras se espera, no construir más sino consolidar tests E2E con QA
real. Útil si Bold responde rápido.
