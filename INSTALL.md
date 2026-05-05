# NaturalVita · Hito 2 · Sesión B — Captura de leads y cupones

Build verde · 50 rutas · 0 errores TS · 15 archivos.

Esta sesión introduce el primer mecanismo de **adquisición** del proyecto:
captura de email en footer + cupón de bienvenida `WELCOME10` aplicable en
checkout. Es lo que convierte el sitio de catálogo informativo a embudo
de conversión.

---

## Contenido en una línea

Newsletter signup en footer → email de bienvenida con cupón → cliente lo
canjea en checkout → descuento se persiste con la orden y aparece en el
email de pago confirmado.

---

## Migraciones SQL

**YA APLICADAS en producción vía MCP**, no necesitas correrlas. Listadas
solo como referencia de qué cambió en la BD:

1. **`newsletter_and_coupons`**: crea 3 tablas y un seed.
   - `newsletter_subscribers` — email único, `unsubscribe_token` UUID, `status`
     (`subscribed`/`unsubscribed`/`bounced`), `source` para distinguir captura.
   - `coupons` — soporta `percentage` o `fixed`, con `min_order_cop`,
     `max_discount_cop`, límites por cliente y global.
   - `coupon_redemptions` — historial atómico para validar
     `max_uses_per_customer`.
   - **Seed `WELCOME10`**: 10% off, mínimo $30.000, máximo descuento
     $50.000, 1 uso por cliente.
   - ALTER `orders` ADD COLUMN `coupon_code text` (si no existía ya).
   - RLS: solo admins acceden a las 3 tablas. La validación pública usa
     service role en server actions.

2. **`coupon_increment_function`**: function SQL `increment_coupon_uses(uuid)`
   con `SECURITY DEFINER` para atomicidad. Solo `service_role` puede llamarla.

---

## Variables de entorno

**Sin nuevas variables**. Reutiliza las existentes:
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (servicio role)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (rate limit)
- `NEXT_PUBLIC_SITE_URL` (URLs absolutas en emails)

---

## Archivos · qué hace cada uno

### Backend / lógica de negocio

#### `lib/coupons/validation.ts` (NUEVO)
Núcleo de validación de cupones. Exporta:
- **`validateCoupon(code, subtotalCop, customerEmail)`** retorna un
  discriminated union `{ ok: true, coupon, discount_cop, message }` o
  `{ ok: false, code, message }` con 8 códigos de error: `not_found`,
  `inactive`, `not_started`, `expired`, `max_uses_reached`,
  `max_uses_per_customer_reached`, `min_order_not_met`, `invalid_input`.
- **`calculateDiscount(coupon, subtotalCop)`** calculo puro sin BD para
  preview UI. Aplica `max_discount_cop` y nunca descuenta más que el
  subtotal.
- **`recordCouponRedemption(...)`** insert en `coupon_redemptions` +
  RPC atómico `increment_coupon_uses`. Fallback a UPDATE manual si la RPC
  falla (defensivo).

Decisión clave: validación **siempre** vía service role para no exponer
`max_total_uses`, `used_count`, ni la lista completa de cupones a
clientes que sabotearían desde DevTools.

#### `lib/newsletter/queries.ts` (NUEVO)
Operaciones de suscripción. Exporta:
- **`subscribeToNewsletter({email, source, fullName?})`** idempotente:
  email nuevo → insert; email ya activo → no-op `{created: false}`;
  email previamente desuscrito → reactiva.
- **`unsubscribeFromNewsletter(token)`** opt-out por token único, idempotente.
- **`isValidEmail()`** validación pragmática (formato + longitudes).

Decisión: **single opt-in** (no doble). Justificación documentada en el
JSDoc del archivo: doble opt-in reduce conversión 30-40%, y la mitigación
del spam la cubrimos con honeypot + rate limit + token unsubscribe en
cada email.

#### `lib/checkout/orders.ts` (MODIFICADO)
Tres cambios:
1. **`CreateOrderInput`** ahora acepta `coupon_code?: string | null`.
2. **Bloque "6.5"** de validación: si viene `coupon_code`, llamamos
   `validateCoupon()` server-side con el subtotal con IVA REAL (calculado
   server-side, no el del cliente) y el email del cliente autenticado.
   Si la validación falla → retornamos `COUPON_INVALID` con mensaje. El
   cliente lo verá en el frontend y puede continuar sin cupón.
3. **Insert orders**: persistimos `discount_cop` y `coupon_code`. Después
   del insert exitoso de líneas, llamamos `recordCouponRedemption()` (no
   bloqueante: si falla, logueamos y continuamos — el descuento ya se
   aplicó al total).

Diseño anti-tampering reforzado: el cliente puede mandar el código que
quiera pero el descuento que aplicamos siempre se calcula server-side
sobre el subtotal recalculado server-side. Imposible inflar descuentos
desde DevTools.

#### `app/api/webhooks/bold/route.ts` (MODIFICADO)
Dos pequeños cambios para que el email "Pago confirmado" muestre el
descuento correctamente:
1. SELECT amplía con `discount_cop, coupon_code`.
2. Type `OrderForEmail` y la llamada a `OrderPaid({...})` ahora pasan
   `discount` y `couponCode`.

Sin cambios al patrón ack-temprano que aplicamos en el patch anterior.

### Plantillas email

#### `lib/email/templates/newsletter-welcome.tsx` (NUEVO)
Email de bienvenida con cupón destacado en card con borde dashed leaf,
código en font monospace 32px, CTA iris a `/tienda`. Usa el footer del
layout con `unsubscribeUrl` para cumplimiento legal.

Mensaje principal: cupón como recompensa + reforzamiento de que se
suscribió a un canal de NaturalVita (no marca confusa). Texto al final:
"si no te suscribiste, click en cancelar suscripción" — el opt-out es la
red de seguridad del modelo single opt-in.

#### `lib/email/templates/_layout.tsx` (MODIFICADO)
Una sola adición: prop opcional `unsubscribeUrl?: string`. Cuando se
proporciona, el footer muestra link "Cancelar suscripción". Cuando no
(emails transaccionales), muestra el texto neutro "Este es un correo
transaccional sobre tu pedido". Backward-compat: ningún template
existente lo usa, todos siguen funcionando idénticos.

#### `lib/email/templates/order-paid.tsx` (MODIFICADO)
Dos adiciones:
1. Props `discount?: number` y `couponCode?: string | null`.
2. Línea de descuento entre "Envío" y el separador antes de "Total
   pagado", solo se renderiza si `discount > 0`. Color leaf-700 con `−`
   antes del monto y código del cupón en paréntesis para que el cliente
   recuerde qué aplicó.

### Server actions públicas

#### `app/(public)/_actions/newsletter.ts` (NUEVO)
Action `subscribeNewsletterAction` para `useActionState()`. Stack de
validación:
1. Honeypot field `website` (campos ocultos que solo bots llenan).
   Si tiene contenido, fingimos éxito sin guardar nada (no le damos al
   bot pista de que cayó en trampa).
2. Email no vacío.
3. Rate limit Upstash 30 req/min por IP.
4. Llamada a `subscribeToNewsletter`. Solo si `created: true` (nuevo o
   reactivado) disparamos email de bienvenida con cupón.

El email de bienvenida se dispara **sin await** (`.catch()` para
loguear). El usuario ve "¡Suscrito!" inmediatamente, el email llega 1-3
segundos después.

#### `app/(public)/checkout/_actions/coupon.ts` (NUEVO)
Action `previewCouponAction(code, subtotal)`. Llama `validateCoupon` y
retorna result limpio para UI. **Solo preview** — la aplicación canónica
ocurre en `createPendingOrder()` que re-valida desde cero. Si el cupón
expira entre el preview y el confirmar, el confirmar falla con
`COUPON_INVALID` y mensaje claro.

### Componentes UI

#### `app/(public)/_components/NewsletterForm.tsx` (NUEVO)
Form con `useActionState`. Honeypot oculto absolute -9999px. Email
disabled durante submit y después de éxito. Mensaje status/error
inline con `aria-live="polite"`. Estilo coherente con el footer
(transparencias sobre leaf-900).

#### `app/(public)/_components/PublicFooter.tsx` (MODIFICADO)
Insertamos un bloque entre los enlaces y el bottom bar legal:
título + descripción + `<NewsletterForm />`. Layout responsive: en
desktop el form va a la derecha del texto, en móvil va abajo.

#### `app/(public)/checkout/_CouponInput.tsx` (NUEVO)
Tres estados de UI:
1. **Colapsado**: link "¿Tienes un cupón de descuento?" minimalista
   (no distrae del flow principal de checkout).
2. **Expandido**: input + botón "Aplicar". Enter del input también
   aplica. Auto-uppercase + font monospace para los códigos.
3. **Aplicado**: card leaf-100 con check, código en monospace, "Ahorras
   $X" y botón "Quitar" para remover.

Errores se muestran inline debajo del input con `role="alert"`.

#### `app/(public)/checkout/_OrderSummarySidebar.tsx` (MODIFICADO)
Tres adiciones:
1. Prop `onCouponChange?: (code, discountCop) => void`.
2. Estado interno `couponState` + handler que notifica al padre.
3. Render del `<CouponInput />` debajo del bloque "envío gratis" + línea
   "Descuento" con código y monto en negativo. Total recalculado con
   `Math.max(0, subtotal + shipping - discount)`.

#### `app/(public)/checkout/_CheckoutClient.tsx` (MODIFICADO)
Tres adiciones:
1. Estado `appliedCoupon`.
2. Pasa `coupon_code: appliedCoupon?.code ?? null` al `startCheckout`.
3. Pasa `onCouponChange` al sidebar para mantener el estado sincronizado.

### Página opt-out

#### `app/(public)/newsletter/desuscribir/[token]/page.tsx` (NUEVO)
Server component que llama `unsubscribeFromNewsletter(token)` directo
en el render. Muestra estado éxito (con email confirmado) o error.
`metadata.robots: { index: false }` para que no aparezca en Google.
`dynamic = "force-dynamic"` porque cada token es único.

UX de un click: si tienes el token, te desuscribes inmediatamente. Sin
captcha, sin confirmación adicional. La fricción es ANTI-objetivo aquí.

---

## Aplicación

1. Sube los 15 archivos al repo respetando rutas exactas.
2. Vercel hará deploy automático en 1-2 min. Sin variables nuevas, sin
   migraciones nuevas (ya aplicadas).
3. Verifica build verde en Vercel → Deployments.

---

## Validación end-to-end

### Flujo 1: suscripción al newsletter

1. Ve al sitio en una ventana **incógnito**.
2. Scroll hasta el footer.
3. Verás el bloque "Recibe novedades y ofertas" con el form.
4. Escribe un email tuyo (uno distinto al de pruebas anteriores para que
   sea suscripción nueva — `tucorreo+test1@gmail.com` funciona, Gmail
   ignora el `+test1`).
5. Click "Suscribirme". Botón cambia a "Enviando..." y luego "¡Suscrito!".
   Mensaje de éxito aparece debajo.
6. Revisa tu Gmail: deberías recibir email "Bienvenido a NaturalVita ·
   cupón WELCOME10 dentro" en 5-10 segundos.
7. Verifica visualmente: el email muestra el código `WELCOME10` en card
   destacada con borde dashed verde.
8. Click el link "Cancelar suscripción" al fondo del email. Debe
   llevarte a `/newsletter/desuscribir/<token>` con mensaje de éxito.
9. Vuelve al footer y suscríbete de nuevo con el mismo email — verás
   "Ya estás suscrito..." (porque acabas de reactivarte).

### Flujo 2: aplicar cupón en checkout

1. Agrega un producto al carrito que cueste mínimo $30.000 (sin
   superar — el cupón pone tope $50.000 de descuento, así que para que
   sea visible una orden de $30K-$500K es ideal).
2. Inicia sesión en el sitio (cliente).
3. Ve a `/checkout`.
4. Llena contacto + dirección.
5. En el sidebar derecho verás "¿Tienes un cupón de descuento?" en pequeño.
6. Click → aparece input + botón "Aplicar".
7. Escribe `welcome10` (cualquier capitalización funciona) → "Aplicar".
8. Botón muestra "..." brevemente y aparece card verde con `WELCOME10`
   y "Ahorras $X". Línea de descuento aparece en el desglose. Total
   actualiza.
9. Click "Quitar" → vuelve al estado del input.
10. Aplicalo de nuevo y procede al pago.
11. Después del pago confirmado por Bold (16-60 min latencia conocida),
    recibirás email "Pago confirmado" donde el desglose mostrará la
    línea "Descuento (WELCOME10)" en verde con el monto en negativo.

### Flujo 3: validar protecciones

**Cupón duplicado por mismo cliente**:
- Después del flujo 2 con orden pagada, intenta aplicar `WELCOME10`
  otra vez en una nueva orden.
- Debe responder "Ya usaste este cupón anteriormente".

**Cupón con orden chica**:
- Carrito de $25.000 (debajo del mínimo $30.000).
- Aplicar `WELCOME10` debe responder "Este cupón requiere una compra
  mínima de $30.000".

**Código inexistente**:
- Aplicar `FAKE2026` debe responder "El cupón no existe".

### Flujo 4: visibilidad admin

1. Ingresa al panel `/admin` con cuenta admin.
2. En el sidebar busca **Marketing → Newsletter**. Verás listado de
   suscriptores con el email de tus pruebas.
3. **Marketing → Cupones**. Verás `WELCOME10` con `used_count` actualizado
   tras los flujos. Si hubo redemptions, aparecen abajo.

---

## Lo que NO incluye esta sesión (deliberado)

**Klaviyo no está integrado todavía.** El stub `lib/events/track.ts`
sigue siendo no-op. Justificación: requeriría que crees cuenta Klaviyo
(5 min) + traigas API key. Cuando estés listo, sesión adicional de 1-2
horas integra Klaviyo correctamente con flujo carrito abandonado y
otros eventos. Hoy lo importante era tener el modelo de datos limpio y
captura de email para que cuando Klaviyo entre, ya tengas suscriptores
para sincronizar.

**Nuevos cupones se crean directo en BD por ahora.** El admin tiene vista
de **lectura** de cupones, no formulario para crearlos. Para crear cupones
nuevos antes de campañas (`MAYO15`, `BLACKFRIDAY30`, etc.), me dices y te
doy el SQL exacto. CRUD admin completo de cupones lo hacemos cuando
realmente necesites lanzar varias campañas en paralelo.

**Reviews y wishlist**: pertenecen a Sesión C.

---

## Próximo paso recomendado

**Sesión C — Wishlist y reviews**:
- Wishlist por cliente con UI de corazón en producto + página
  `/mi-cuenta?tab=favoritos`.
- Sistema de reseñas con estrellas, vinculado a `orders.fulfillment_status='delivered'`
  para que solo escriban quienes recibieron el producto (cero spam).
- Schema.org `Product` + `AggregateRating` para que las estrellas
  aparezcan en SERPs de Google (rich snippets).

Antes de Sesión C: te recomiendo **lanzamiento soft** invitando a 5-10
personas de confianza a usar el sitio durante una semana. Con los
suscriptores y compradores reales validamos UX y desbloqueamos datos en
Clarity para optimizar antes de crecer.

---

## Pendientes operativos vivos

- **Reembolso B8XV** ($13.500) en panel Bold para cerrar el ciclo de
  validación VOID_APPROVED.
- **Sitemap GSC**: reintentar mañana, hoy backend GSC saturado.
- **Crear cupones reales** cuando definas estrategia de campañas (te paso
  SQL cuando lo necesites).
