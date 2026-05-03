# NaturalVita · Hito 1.7 Sesión C · Bold + envíos + Resend

Última y más extensa sesión del Hito 1.7. Cierra el flujo end-to-end de
compra: cliente paga, recibe email, orden queda registrada, stock se
descuenta, sitio espera webhook de confirmación.

Build limpio: 38 rutas, 0 errores TS. `/checkout` queda en 23.8 kB.
Tres rutas nuevas en `/api`: shipping, status, webhook.

---

## 0. Estado previo asumido

- Sesiones A y B del Hito 1.7 aplicadas y desplegadas (preview verde).
- Resend dominio `naturalvita.co` verificado, API key en Vercel Sensitive.
- Cuenta Bold con cuatro variables Sensitive en Vercel:
  `BOLD_IDENTITY_KEY_TEST`, `BOLD_SECRET_KEY_TEST`, `BOLD_IDENTITY_KEY_PROD`,
  `BOLD_SECRET_KEY_PROD`.
- `NEXT_PUBLIC_BOLD_ENVIRONMENT=test`.
- `RESEND_FROM_EMAIL=NaturalVita <pedidos@naturalvita.co>` y `RESEND_REPLY_TO`.
- Webhook de prueba en panel Bold apuntando a
  `https://naturalvita.co/api/webhooks/bold` con los cuatro eventos.
- Buzón `pedidos@naturalvita.co` creado en Hostinger.

---

## 1. Migración SQL — YA APLICADA

Apliqué `shipping_rates_seed_colombia` a tu Supabase vía MCP. Crea tabla
`shipping_rates` con RLS (lectura pública, escritura admins) y siembra
tarifas para los 32 departamentos en cuatro zonas:

- **Zona 1 (Bogotá/Cundinamarca)**: COP 12.000–15.000, gratis sobre 150-200K.
- **Zona 2 (capitales principales)**: COP 18.000, gratis sobre 200K.
- **Zona 3 (regional)**: COP 22.000–25.000, gratis sobre 250-300K.
- **Zona 4 (zonas remotas)**: COP 32.000–65.000, sin envío gratis.

Sin acción de tu lado.

---

## 2. Estructura del ZIP

```
nv-hito-1.7-sesion-c/
├── INSTALL.md
├── package.json                                       ← MODIFICADO
├── app/
│   ├── (public)/
│   │   ├── checkout/
│   │   │   ├── _CheckoutClient.tsx                    ← MODIFICADO
│   │   │   ├── _OrderSummarySidebar.tsx               ← MODIFICADO
│   │   │   ├── _BoldCheckoutButton.tsx                ← NUEVO
│   │   │   └── _startCheckout.ts                      ← NUEVO
│   │   └── pedido/
│   │       └── [order_number]/
│   │           └── exito/
│   │               ├── page.tsx                       ← NUEVO
│   │               └── _OrderStatusPoller.tsx         ← NUEVO
│   └── api/
│       ├── checkout/shipping/route.ts                 ← NUEVO
│       ├── orders/[order_number]/status/route.ts      ← NUEVO
│       └── webhooks/bold/route.ts                     ← NUEVO
└── lib/
    ├── bold/
    │   ├── keys.ts                                    ← NUEVO
    │   ├── integrity.ts                               ← NUEVO
    │   └── types.ts                                   ← NUEVO
    ├── checkout/
    │   ├── shipping.ts                                ← NUEVO
    │   └── orders.ts                                  ← NUEVO
    └── email/
        ├── client.ts                                  ← NUEVO
        └── templates/
            ├── _layout.tsx                            ← NUEVO
            ├── order-received.tsx                     ← NUEVO
            ├── order-paid.tsx                         ← NUEVO
            ├── order-rejected.tsx                     ← NUEVO
            └── order-refunded.tsx                     ← NUEVO
```

20 archivos en total. 18 nuevos, 2 modificados, 1 package.json.

---

## 3. Aplicar el paquete

Sigue tu flujo manual. Sugerencia para minimizar errores:

1. **Sube `package.json` primero**. Vercel detectará deps nuevas (`resend`,
   `@react-email/components`) y las instalará automáticamente.

2. **Carpeta `lib/bold/`** completa: 3 archivos.

3. **Carpeta `lib/checkout/`**: agregar `shipping.ts` y `orders.ts`. Los
   archivos `divipola-data.ts` y `schemas.ts` de Sesión B se quedan.

4. **Carpeta `lib/email/`**: `client.ts` + carpeta `templates/` con 5 archivos.

5. **Tres carpetas en `app/api/`**: `checkout/shipping/`, `orders/[order_number]/status/`,
   `webhooks/bold/`. Cada una con su `route.ts`.

6. **Carpeta `app/(public)/pedido/[order_number]/exito/`**: 2 archivos. Toda
   la cadena de carpetas es nueva.

7. **Modificados en `app/(public)/checkout/`**: reemplazar `_CheckoutClient.tsx`
   y `_OrderSummarySidebar.tsx`. Agregar `_BoldCheckoutButton.tsx` y `_startCheckout.ts`.

Verifica conteos en GitHub web después de subir:

| Ruta | Archivos esperados |
|------|---------------------|
| `app/(public)/checkout/` | 6 (page + actions + 4 con `_`) |
| `app/(public)/pedido/[order_number]/exito/` | 2 |
| `app/api/checkout/shipping/` | 1 |
| `app/api/orders/[order_number]/status/` | 1 |
| `app/api/webhooks/bold/` | 1 |
| `lib/bold/` | 3 |
| `lib/checkout/` | 4 |
| `lib/email/` | 1 + carpeta `templates/` con 5 |

---

## 4. Cómo funciona el flujo

### Click "Confirmar y pagar" en `/checkout`
1. Validar secciones 1 y 2 completas.
2. Server action `startCheckout()` invoca `createPendingOrder()`.
3. Anti-tampering: re-lee precios y stock desde BD ignorando lo del cliente.
4. Re-calcula IVA con `tax_rates` por producto.
5. Verifica dirección pertenece al cliente.
6. Calcula envío con `calculateShipping()` desde tabla `shipping_rates`.
7. Genera `order_number` único `NV-YYYYMMDD-XXXX`.
8. Inserta orden y líneas (rollback manual si falla).
9. Genera firma SHA-256 con `BOLD_SECRET_KEY_*` server-side.
10. Email "Pedido recibido" enviado vía Resend (no bloqueante).
11. Devuelve datos al cliente: `order_number`, `total_cop`, `api_key`, `signature`.

### Click en `BoldCheckoutButton`
1. Carga script `boldPaymentButton.js` cacheado entre clicks.
2. Instancia `BoldCheckout({...})` con datos + firma.
3. Llama `.open()` que abre overlay embedded sobre el sitio.
4. Cliente paga (tarjeta/PSE/Nequi/QR según métodos habilitados en Bold).
5. Bold redirige a `/pedido/{order_number}/exito` cuando termina.

### Webhook recibido en `/api/webhooks/bold`
1. Lee raw body, verifica firma HMAC-SHA256 con `x-bold-signature`.
   - Sandbox: clave HMAC vacía `""` (particularidad de Bold).
   - Producción: clave HMAC = `BOLD_SECRET_KEY_PROD`.
2. Busca orden por `order_number` del payload.
3. Idempotencia: si `bold_payment_id + payment_status` ya coinciden, responde 200.
4. Actualiza `payment_status` y `status` según evento.
5. Side effects:
   - **SALE_APPROVED**: marca `paid_at`, decrementa stock (track_stock=true), email confirmación.
   - **SALE_REJECTED**: marca rechazado, email reintentar.
   - **VOID_APPROVED**: marca refunded, repone stock, email reembolso.
   - **VOID_REJECTED**: solo log auditoría.

### Página `/pedido/{order_number}/exito`
1. Server component carga orden con auth gate (solo dueño).
2. Si `payment_status='paid'` → confirmación inmediata.
3. Si aún `pending` → poller consulta cada 3s hasta 30s.
4. Cuando webhook llega → poller detecta cambio, refresca UI.

---

## 5. Probar en QA (sandbox Bold)

**Montos especiales** que Bold ofrece para forzar escenarios sin cobros:

- `555001` → simula transacción aprobada ✅
- `555002` → simula rechazada ❌
- `555020` → simula challenge 3DS
- `555040` → aprobada por motor antifraude
- `555042` → rechazada por antifraude

**Flujo de prueba aprobada**:
1. Login con tu cuenta cliente.
2. Carrito con productos que sumen ~$555.001 (puedes editar precio temporal
   de un producto desde admin para esto).
3. `/checkout` → completar contacto + dirección.
4. Click "Confirmar y pagar".
5. Overlay de Bold → cualquier dato de tarjeta de prueba.
6. Bold simula aprobación → redirige a `/pedido/.../exito`.
7. Webhook llega → polling actualiza a "Pago confirmado".
8. Llegan dos emails: "Pedido recibido" y "Pago confirmado".

**Verificación**:
- Tabla `orders` en Supabase: nueva fila con `payment_status='paid'`, `paid_at`.
- Tabla `order_items`: filas con productos.
- Productos con `track_stock=true`: `stock` decrementó.
- Logs Resend: dos emails con tags `order_received` y `order_paid`.
- Logs Bold: webhook entregado código 200.

---

## 6. Pasar a producción

Cuando hayas validado todo en sandbox:

1. **En panel Bold**, crea **segundo webhook** (no edites el de prueba):
   - URL: `https://naturalvita.co/api/webhooks/bold` (misma)
   - Eventos: los cuatro
   - Marca de prueba: **NO marcar**

2. **En Vercel**, edita `NEXT_PUBLIC_BOLD_ENVIRONMENT`:
   - Cambia `test` → `production`. Save.

3. Vercel relanza automáticamente. Sitio empieza a usar llaves de producción.

4. Compra real de prueba con producto barato (~$5.000) con tu tarjeta personal.
   Si funciona, elimina orden desde admin y solicita reembolso desde panel de Bold.

---

## 7. Lo que cierra Sesión C

- Pago end-to-end con Bold modo embedded.
- Métodos de pago según cuenta Bold (tarjetas/PSE/Nequi/QR).
- Cálculo dinámico de envío por departamento.
- Umbral envío gratis con mensaje "Te faltan $X".
- IVA discriminado en sidebar y email.
- Anti-tampering server-side al crear orden.
- Webhook seguro con HMAC e idempotencia.
- Cuatro emails transaccionales con react-email.
- Decremento/restitución automático de stock.
- Página de éxito con polling.

## 8. Lo que NO cierra (Sesión D)

- `/mi-cuenta` con historial real de pedidos.
- Eventos a Klaviyo.
- Email de seguimiento cuando admin marca como shipped.
- UI de cancelación/reembolso desde admin.

---

## 9. Decisiones técnicas

**Anti-tampering estricto**: server action re-lee precios desde BD ignorando
lo del cliente. Vale más en pagos que en cualquier otro lugar.

**Idempotencia en webhook**: `bold_payment_id + payment_status` evita
duplicar descuento de stock o emails si Bold reintenta el webhook.

**Service role para webhook**: usa `SUPABASE_SERVICE_ROLE_KEY` porque corre
sin sesión y necesita actualizar `orders` y `products` saltándose RLS.

**Email no bloquea**: si Resend falla, la orden se crea igual y queda log.

**`runtime: nodejs` en webhook**: necesario para `node:crypto` (HMAC).

**Script Bold dinámico**: solo carga al entrar a `/checkout`, no penaliza
performance del catálogo público.

**Email "Pedido recibido" antes del resultado del pago**: deliberado. Si
cliente cierra navegador, igual queda con correo y order_number para soporte.
