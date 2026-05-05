# NaturalVita · Sprint Klaviyo — Integración de eventos

Build verde · 50 rutas (sin cambio) · 0 errores TS · 5 archivos.

---

## Variables de entorno nuevas en Vercel

Estas 3 variables nuevas deben estar en Vercel antes de hacer redeploy.
Las dos primeras (Public Key y Private Key) ya las agregaste.
La tercera se obtiene en el siguiente paso de esta guía.

| Variable | Sensitive | Descripción |
|---|---|---|
| `NEXT_PUBLIC_KLAVIYO_COMPANY_ID` | No | Public Key (Site ID) de Klaviyo. Ya agregada. |
| `KLAVIYO_PRIVATE_API_KEY` | Sí | Private Key con permisos personalizados. Ya agregada. |
| `KLAVIYO_NEWSLETTER_LIST_ID` | No | ID de la lista "Newsletter NaturalVita" en Klaviyo. Ver paso 1 abajo. |

---

## Paso 1: crear lista "Newsletter NaturalVita" en Klaviyo UI (5 min)

1. En Klaviyo, sidebar izquierdo → **Audiencia** → **Listas y segmentos**.
2. Click **Crear lista / segmento** (botón azul arriba a la derecha).
3. Selecciona **Lista**.
4. Nombre: `Newsletter NaturalVita`.
5. Click **Crear lista**.
6. Klaviyo te lleva a la vista de la lista. Busca en la URL algo como:
   `https://www.klaviyo.com/list/ABCD12/newsletter-naturalvita`
   El ID es la parte alfanumérica: `ABCD12` (6 caracteres).
7. También puedes verlo en **Settings** de la lista.
8. Copia ese ID.

9. En Vercel → Settings → Environment Variables → agrega:
   - Key: `KLAVIYO_NEWSLETTER_LIST_ID`
   - Value: el ID de 6 chars (ej: `ABCD12`)
   - Environments: Production, Preview, Development
   - Sensitive: NO

---

## Paso 2: hacer redeploy en Vercel

Vercel → Deployments → deployment más reciente → `...` → **Redeploy**.
Desactiva "Use existing Build Cache" → Redeploy.
Espera ~1-2 min hasta que el deployment esté **Ready**.

---

## Archivos incluidos (5)

### `lib/klaviyo/client.ts` (NUEVO)

Cliente HTTP de Klaviyo API v2024-10-15. Funciones exportadas:

- **`identifyProfile(profile)`** — crea o actualiza perfil con email,
  nombre, teléfono. Usa `/api/profile-import/` que es idempotente.
- **`trackEvent(event)`** — registra un evento en el timeline del perfil.
  Soporta `uniqueId` para idempotencia (Klaviyo ignora duplicados en 24h).
- **`subscribeToList(email, listId, source)`** — suscribe perfil a lista
  con consent. Fallback al endpoint bulk-subscribe si el primero falla.

Diseño defensivo: retry exponencial 3 intentos para 429 y 5xx, timeout
de 8 segundos, catch global en cada función. Si `KLAVIYO_PRIVATE_API_KEY`
no está configurada, las funciones retornan `{ok: false}` silenciosamente.

### `lib/events/track.ts` (REEMPLAZADO — stub → implementación real)

Misma API pública que el stub. Los call sites NO cambian. Cambia el cuerpo:

- **`trackOrderPlaced`** — identifica el perfil con nombre + dispara
  "Placed Order" con items, valor, dirección. Se llama al crear la orden.
  Trigger para el flow de carrito abandonado en Klaviyo.

- **`trackOrderPaid`** — dispara "Ordered Product" UNA VEZ POR LÍNEA
  del pedido (en paralelo con `Promise.allSettled`). Se llama en el
  webhook SALE_APPROVED después del pago. Permite segmentar "clientes
  que compraron X producto".

- **`trackOrderShipped`** — dispara "Fulfilled Order" con número de guía
  y carrier. Se llama desde admin al marcar shipped. Trigger para flow
  post-compra (solicitar reseña 7 días después).

- **`trackOrderRefunded`** — dispara "Refunded Order". Se llama en el
  webhook VOID_APPROVED.

- **`trackNewsletterSubscribed`** — suscribe a la lista Klaviyo
  (necesita `KLAVIYO_NEWSLETTER_LIST_ID`) + dispara evento
  "Newsletter Subscribed". Se llama desde la newsletter action.

### `app/(public)/checkout/_startCheckout.ts` (MODIFICADO)

Agrega `trackOrderPlacedFromOrder()` como side effect void (no bloqueante)
después de crear la orden. Lee la orden recién creada de BD para construir
el payload completo con items.

### `app/(public)/_actions/newsletter.ts` (MODIFICADO)

Agrega `trackNewsletterSubscribed({email, source, couponCode})` como
side effect no bloqueante vía dynamic import. Se llama solo cuando
`result.created === true` (suscripción nueva o reactivación).

### `app/api/webhooks/bold/route.ts` (MODIFICADO)

En el bloque `after()` que ya existía, se agregan las llamadas de tracking
con `Promise.allSettled` junto a los emails existentes:
- SALE_APPROVED: `sendOrderPaidEmail` + `trackOrderPaid` en paralelo.
- VOID_APPROVED: `sendOrderRefundedEmail` + `trackOrderRefunded` en paralelo.

`Promise.allSettled` garantiza que si el tracking falla, el email igual
se envía (y viceversa). Ningún error de Klaviyo puede romper el email.

---

## Flujo completo después de la integración

```
Cliente visita /tienda
  → visita /producto/[slug]            → (futuro: Viewed Product)
  → agrega al carrito                  → (futuro: Added to Cart)
  → llega a /checkout
  → click "Confirmar y pagar"
      → createPendingOrder()           → orden en BD status='pending'
      → trackOrderPlaced()             → Klaviyo: "Placed Order"
                                         ↑ Trigger flow "Carrito Abandonado"
                                           (si no paga en 1h → email)
  → paga en Bold
  → webhook SALE_APPROVED llega
      → UPDATE orders status='paid'    → BD actualizada
      → trackOrderPaid()               → Klaviyo: "Ordered Product" x línea
                                         ↑ Cancela el flow carrito abandonado
                                           (pago detectado, no enviar email)
      → sendOrderPaidEmail()           → Resend: email "Pago confirmado"

Admin marca como enviado
  → trackOrderShipped()                → Klaviyo: "Fulfilled Order"
                                         ↑ Trigger flow "Post-compra"
                                           (solicitar reseña 7 días después)

Bold procesa reembolso (VOID_APPROVED)
  → trackOrderRefunded()               → Klaviyo: "Refunded Order"
  → sendOrderRefundedEmail()           → Resend: email "Reembolso procesado"
```

---

## Paso 3: configurar flows en Klaviyo UI (sesión guiada aparte)

Una vez el código esté en producción y validado con al menos 1 evento
real llegando a Klaviyo, hacemos una sesión de ~30 min para configurar:

**Flow "Welcome Series"** (trigger: suscripción a lista):
- Email 0h: bienvenida con cupón WELCOME10 (diseñado en Klaviyo drag-and-drop).
- Email 7 días: si no compró → recordatorio con productos destacados.
- Email 14 días: artículo educativo sobre suplementos (engagement).

**Flow "Abandoned Cart"** (trigger: "Placed Order" sin "Ordered Product" posterior):
- Email 1h: resumen de tu carrito + CTA "completar compra".
- Email 24h: "¿Tuviste algún problema?" + cupón secundario opcional.
- Condición de salida: si llega "Ordered Product" → flujo se detiene.

Estos dos flows, bien configurados, generan típicamente 15-25% del
revenue de email en e-commerce.

---

## Validación después del redeploy

1. Abre Klaviyo → **Analytics** → **Métricas**.
2. Haz una compra de prueba (o usa una orden existente).
3. Después del pago, espera ~1 min.
4. En Klaviyo → **Perfiles** → busca tu email de prueba.
5. Deberías ver en el timeline: "Placed Order" + "Ordered Product" x línea.

Si ves los eventos en Klaviyo, la integración está funcionando.
Si no aparecen en 5 min, revisa Vercel → Logs → busca `[track]` o `[klaviyo]`.

---

## Pendientes operativos

- **KLAVIYO_NEWSLETTER_LIST_ID**: crear lista en UI y agregar la variable.
- **Flows en Klaviyo UI**: sesión aparte de ~30 min.
- **Reembolso B8XV** ($13.500) en panel Bold.
- **Sitemap GSC** reintentar.
