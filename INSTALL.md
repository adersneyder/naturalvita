# NaturalVita · Patch · Estructura de correos v2 (info@ + pedidos@)

Aplica la convención correcta de e-commerce serio: separación entre
bandeja outbound (envío automatizado) y bandeja inbound (recepción
de respuestas humanas).

6 archivos modificados. Sin SQL, sin nuevas deps. Build verde.

## Convención adoptada

| Bandeja | Función | Tipo | Cliente la ve como |
|---------|---------|------|---------------------|
| **info@naturalvita.co** | Envía emails automatizados (pedidos, pagos, magic link, reembolsos) | Outbound (FROM) | "De: NaturalVita <info@naturalvita.co>" |
| **pedidos@naturalvita.co** | Recibe respuestas y consultas del cliente | Inbound (REPLY-TO) | Aparece en footer y CTAs "escríbenos a..." |

**Importante**: este patch invierte mi propuesta inicial. Razón: `pedidos@`
es semánticamente mejor para que el cliente envíe consultas relacionadas
con su pedido (no me llegó, falta un producto, quiero anular). `info@`
queda como bandeja general de envío automatizado, sin contexto específico.

## Aplicar

### Paso 1: Sube los 6 archivos al repo

Sube cada archivo a su ruta exacta reemplazando el existente.

### Paso 2: Cambia las DOS variables en Vercel

Settings → Environment Variables:

**RESEND_FROM_EMAIL**:
- Valor anterior: `NaturalVita <pedidos@naturalvita.co>`
- Valor nuevo: `NaturalVita <info@naturalvita.co>`

**RESEND_REPLY_TO**:
- Valor anterior: `contacto@naturalvita.co` (o `info@naturalvita.co` si ya cambiaste antes)
- Valor nuevo: `pedidos@naturalvita.co`

Save. Vercel relanza solo en ~30 segundos.

### Paso 3: Verificar

- Footer de cualquier página → debe mostrar `pedidos@naturalvita.co`.
- Hacer un pedido de prueba → email "Recibimos tu pedido" llega DE `info@naturalvita.co`, su REPLY-TO es `pedidos@naturalvita.co`.
- Si das "Responder" en Gmail al email del pedido → el destinatario debe ser `pedidos@naturalvita.co`.

## Lo que SIGUE pendiente: SMTP custom de Supabase

Este patch resuelve los emails transaccionales (pedidos, pagos, reembolsos)
porque salen vía Resend que ya está configurado con tu dominio.

**Pero los emails de auth (magic link de `/iniciar-sesion`) siguen saliendo
desde `noreply@mail.app.supabase.io` con plantilla en inglés "Confirm Your
Signup"**. Eso lo resolveremos en una guía separada de configuración del
Dashboard de Supabase apuntando a Resend.

## Por qué este patch NO arregla el webhook de Bold

Recordatorio: este patch NO tiene relación con el problema del webhook de
Bold sandbox que no se dispara. Eso sigue pendiente — se valida con el
test producción $1.500 cuando estés listo.
