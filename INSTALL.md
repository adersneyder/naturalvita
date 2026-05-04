# NaturalVita · Patch · Webhook Bold blindado contra timeouts y excepciones

Refactor del receptor de webhooks de Bold aplicando las recomendaciones
oficiales del soporte Bold (Jhonathan, 4 mayo 2026) para eliminar los
errores 500 vistos en los intentos 1 y 2 (5:12 y 5:27).

2 archivos modificados. Sin migraciones SQL ni variables nuevas.
Build verde, 0 errores TS.

---

## Diagnóstico del problema original

Bold confirmó por correo:
- Intento 1 a las 05:12 → respondió 500
- Intento 2 a las 05:27 → respondió 500
- Intento 3 a las 06:14 → respondió 200 ✓

**Causa probable principal**: el handler hacía `await sendEmail(...)` de
Resend ANTES de responder 200. Resend recién verificado puede tardar
2-5 segundos. Bold tiene timeout de ~5 segundos. Si el envío tardaba
más, Bold cerraba la conexión y registraba como 500.

**Causa secundaria**: si algún side effect (email, stock, parseo de payload)
lanzaba excepción, Next.js retornaba 500 implícito sin log útil. Sin
try/catch global, no había forma de saber qué falló.

---

## Cambios aplicados

### `lib/bold/integrity.ts`

**Cambio**: `verifyWebhookSignature` ahora tiene try/catch GLOBAL que
envuelve toda la lógica. Si cualquier cosa rompe (caracteres inválidos
en signature, env vars rotas, lo que sea), retorna `false` en lugar de
lanzar excepción.

**Efecto**: si Bold envía signature malformada por algún motivo, el
webhook responde 401 (firma inválida) en lugar de 500 (server error).
Bold sabe que hizo algo mal, no reintenta infinito.

### `app/api/webhooks/bold/route.ts`

**Refactor completo** aplicando 4 mejoras:

#### 1. Patrón ack-temprano

Esto fue lo que recomendó Bold textualmente: *"al recibir webhook,
primero valida la firma y guarda info, responde 200 de inmediato. Si
tu servidor tarda mucho procesando lógica de negocio antes de
responder, nuestro sistema podría marcarlo como error por timeout"*.

**Antes** (bloqueante, todo dentro del response window):
```
1. Validar firma
2. UPDATE orders en BD
3. Decrementar stock
4. Enviar email via Resend ← podía tardar 3-5 seg
5. Responder 200
```

**Ahora** (ack rápido + side effects diferidos):
```
1. Validar firma
2. UPDATE orders en BD              ← críticos, dentro del window
3. Decrementar stock                 ← críticos, dentro del window
4. Programar envío email via after() ← diferido, NO bloquea
5. Responder 200 (Bold ya lo recibe)
6. (Después del 200) Resend procesa el email
```

`after()` es API estable de Next.js 15 que ejecuta callbacks DESPUÉS
de que se envió la respuesta. Vercel mantiene la lambda viva hasta que
completen, pero Bold ya tiene su 200 OK.

**Resultado esperado**: tiempo de respuesta del webhook de ~3-5
segundos a sub-segundo. Eliminación total de timeouts.

#### 2. Try/catch global del handler

Todo el cuerpo del handler está envuelto en try/catch. Si CUALQUIER
cosa rompe (parseo, BD, lo que sea), capturamos la excepción, la
logueamos con todo el contexto y respondemos 500 con info del error.
**Nunca más** un 500 sin información en logs.

#### 3. Try/catch aislado en stock

Si decrementStock falla (raro pero posible si Supabase está saturado),
el código NO retorna 500 — el pago YA está confirmado en BD, lo único
que falla es el descuento de stock. Logueamos para que el admin lo
revise manualmente, pero respondemos 200 al webhook (sino Bold
reintenta y duplica el flujo).

#### 4. Logging estructurado con request ID

Cada webhook ahora genera un `request_id` corto (8 chars) que aparece
como prefijo en cada log relacionado. Ejemplo de logs en Vercel:

```
[bold-webhook abc12def +0ms] inicio
[bold-webhook abc12def +12ms] body leído { bytes: 542 }
[bold-webhook abc12def +18ms] firma válida
[bold-webhook abc12def +20ms] payload parseado { eventType: 'SALE_APPROVED', orderNumber: 'NV-...', paymentId: 'XYZ' }
[bold-webhook abc12def +145ms] orden encontrada { id: '...', current_status: 'pending' }
[bold-webhook abc12def +312ms] UPDATE orders exitoso { payment_status: 'paid', status: 'paid' }
[bold-webhook abc12def +480ms] respondiendo 200
[bold-webhook abc12def after +0ms] enviando email order-paid
[bold-webhook abc12def after +1830ms] email order-paid enviado
```

Cada paso queda timestamped. Si vuelve a haber un 500, el log nos dice
exactamente en qué milisegundo de qué paso falló.

El `request_id` se devuelve también en el JSON de respuesta:
```json
{ "ok": true, "request_id": "abc12def" }
```

Si Bold reporta error, podemos pedirles el request_id y buscarlo
directo en logs Vercel.

---

## Aplicar

1. Sube los 2 archivos al repo en sus rutas exactas:
   - `app/api/webhooks/bold/route.ts`
   - `lib/bold/integrity.ts`

2. Vercel hará deploy automático ~1-2 minutos.

3. Verifica en Vercel → Deployments que el último build esté **Ready**
   (verde). No requiere variables nuevas.

---

## Validación con prueba real

Esta es la parte importante. Después de aplicar el fix:

### Antes de comprar

1. Abre **Vercel** → proyecto naturalvita → pestaña **Logs** (Runtime).
2. Filtra por path: `/api/webhooks/bold`.
3. Deja la pestaña abierta — vas a ver logs en tiempo real.

### Durante la compra

4. En otra pestaña, ve a `naturalvita.co` y haz una compra de prueba
   pequeña. Sugiero un solo producto barato (ej: aceite de árbol de té
   $1.500) para minimizar el monto a reembolsar después.
5. Completa el pago real con tu tarjeta en Bold.
6. Verás la página de éxito haciendo polling.

### Inmediatamente después del pago

7. Vuelve a la pestaña de Vercel Logs. En segundos deberías ver:
   - Una request POST a `/api/webhooks/bold` con status **200** ✓
   - Una serie de logs con prefijo `[bold-webhook XXXX +Xms]` mostrando
     cada paso del procesamiento.
   - Logs adicionales `[bold-webhook XXXX after +Xms]` mostrando el
     envío del email (después del 200).

### Esperado: NO debe haber 500s

Si aparece algún 500, **el log estructurado nos dice exactamente qué
falló**. Mándame el bloque completo de logs con el `request_id` y
diagnostico el bug específico.

### Validación de correo

8. Abre tu Gmail. Deberías recibir el email "Pago confirmado · pedido
   NV-...".
9. Si NO llega en 30 segundos, revisa los logs `after +...` —
   posiblemente Resend reportó algo.

### Recordar reembolsar

Después de validar todo, vuelve al panel Bold (o pídele a Jhonathan en
el correo) y reembolsa la transacción de prueba. Cuando Bold procese,
debería disparar webhook `VOID_APPROVED` que también ahora procesa
correctamente. Ese sería el segundo punto de validación: el flujo
completo de reembolso end-to-end.

---

## Cambios sutiles que es bueno saber

**El email puede llegar 1-3 segundos DESPUÉS del 200.** Antes el cliente
veía la página de éxito + recibía email casi simultáneo. Ahora el 200
es instantáneo pero el email tarda un poquito más en llegar (medio
segundo a 3 segundos). Para el cliente es indistinguible — sigue
pareciendo "inmediato".

**Los logs en Vercel ahora son más verbosos.** Cada webhook genera ~10
líneas de log en lugar de 1-2. Esto puede ser ruidoso si tienes
muchísimo tráfico, pero a este nivel (lanzamiento) es invaluable para
diagnóstico. Si en el futuro queremos reducir verbosidad, basta cambiar
los `console.log` a verificar un flag de DEBUG.

**El `request_id` se expone en el response.** Eso significa que Bold
puede ver el ID en sus logs. No es información sensible (es random
alfanumérico de 8 chars), pero lo menciono por transparencia.

---

## Si AÚN ves 500 después del fix

Improbable, pero si pasa:

1. Captura el `request_id` del log o del response Bold.
2. Busca en Vercel Logs el bloque completo con ese ID.
3. Mándame ese bloque.

Con el log estructurado tendremos en segundos qué línea falló y
podemos hacer un fix puntual.

---

## Siguiente paso recomendado

Después de validar el fix con la prueba real:

**Si todo verde**: Hito 2 Sesión B (Klaviyo + newsletter + cupón
bienvenida) o Hito 1.3 (admins con invitaciones), tú decides.

**Si encuentras algún detalle**: lo arreglamos antes de avanzar.
