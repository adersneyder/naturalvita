# Cambios sugeridos en archivos existentes del repo

Este documento complementa el `INSTALL.md` con búsquedas-y-reemplazos
específicos sobre código que ya existe en el repo `naturalvita`.

---

## Búsqueda global de referencias a Resend

Antes de empezar, lista todos los archivos que mencionan Resend:

```bash
grep -rn "resend" --include="*.ts" --include="*.tsx" -i .
```

Cada hit debe ser uno de los casos a continuación.

---

## Caso 1 · Imports de la SDK de Resend

**Buscar:**
```typescript
import { Resend } from "resend";
```

**Reemplazar:** elimina la línea completa. El nuevo `lib/email/client.ts` ya importa internamente `@aws-sdk/client-sesv2`.

**Buscar:**
```typescript
import resend from "@/lib/email/client";
```
o cualquier import nombrado del cliente Resend.

**Reemplazar:**
```typescript
import { sendEmail } from "@/lib/email/client";
```

---

## Caso 2 · Inicialización del cliente Resend

**Buscar:**
```typescript
const resend = new Resend(process.env.RESEND_API_KEY);
```

**Reemplazar:** elimina la línea. El cliente SES se inicializa una sola
vez dentro de `lib/email/client.ts` y se reutiliza.

---

## Caso 3 · Llamadas a `resend.emails.send()`

**Buscar:**
```typescript
await resend.emails.send({
  from: "notifications@naturalvita.co",
  to: customer.email,
  subject: "...",
  react: <OrderPaid order={order} />,
});
```

**Reemplazar:**
```typescript
await sendEmail({
  to: customer.email,
  subject: "...",
  react: <OrderPaid order={order} />,
});
```

Notas:
- `from` ya no se hardcodea. El nuevo `sendEmail()` lo asigna automáticamente
  según `category` (default `transactional`).
- Si necesitas un `from` específico (raro), pasa `from: "..."` como opción.

---

## Caso 4 · Llamadas con `from` apuntando a `pedidos@`

**Buscar:**
```typescript
from: "pedidos@naturalvita.co"
```
o
```typescript
from: "NaturalVita <pedidos@naturalvita.co>"
```

**Reemplazar:** elimina la línea completa. El cliente SES asigna
`notificaciones@naturalvita.co` automáticamente.

---

## Caso 5 · Hardcoded references a `pedidos@` en copy del sitio

**Buscar (en archivos `*.tsx` o `*.ts` o `*.md`):**
```
pedidos@naturalvita.co
```

**Reemplazar:**
```
info@naturalvita.co
```

Archivos probables donde aparece:
- `components/Footer.tsx` (footer del sitio)
- `app/contacto/page.tsx` (página de contacto)
- `app/(public)/iniciar-sesion/_LoginForm.tsx` (mensajes de error)
- `app/legal/privacidad/page.tsx`
- `app/legal/terminos/page.tsx`
- `emails/_layout.tsx` (footer de emails)
- Plantillas `emails/*.tsx` individuales (firma del email)

---

## Caso 6 · Webhook de Resend (eliminar completamente)

**Archivo:** `app/api/webhooks/resend/route.ts`

**Acción:** ELIMINAR el archivo completo. Ahora los eventos los maneja
`app/api/webhooks/aws-sns/route.ts`.

---

## Caso 7 · Función `subscribeToNewsletter` (Sprint 2 — no aún)

En `app/api/newsletter/subscribe/route.ts` o similar, la función actual
probablemente envía welcome email **inmediato** vía Resend. Esto **NO se
toca en Sprint 1**.

En Sprint 2 (Savia núcleo) se refactoriza para:
1. Insertar en `newsletter_subscribers` ✅ (ya funciona)
2. **Encolar** en `email_jobs` el welcome (en lugar de enviar directo)
3. El cron `savia-dispatch` lo procesa cada minuto

Por ahora, en Sprint 1, sigue enviando directo. Solo asegurarse de que
la llamada use `sendEmail()` con `category: "marketing"`:

```typescript
await sendEmail({
  to: subscriber.email,
  subject: "Bienvenido a NaturalVita",
  react: <NewsletterWelcome firstName={subscriber.firstName} ... />,
  category: "marketing", // <-- importante: usa hola@news.naturalvita.co
});
```

---

## Caso 8 · Variables de entorno en cualquier archivo

**Buscar:**
```typescript
process.env.RESEND_API_KEY
process.env.RESEND_FROM_EMAIL
```

**Reemplazar:** elimina. Las variables nuevas (`AWS_*`, `SES_FROM_*`) las
consume internamente el cliente `lib/email/client.ts`. Las server actions
y plantillas ya no necesitan referenciar variables de entorno de email.

---

## Verificación final

Tras aplicar todos los cambios:

```bash
# No debe haber NINGUNA referencia a resend
grep -rn "resend" --include="*.ts" --include="*.tsx" -i .

# No debe haber NINGUNA referencia a pedidos@ (excepto si conscientemente
# quieres dejar histórico en algún comentario)
grep -rn "pedidos@naturalvita" --include="*.ts" --include="*.tsx" -i .

# Verificar que el cliente nuevo está siendo consumido
grep -rn "from \"@/lib/email/client\"" --include="*.ts" --include="*.tsx" .
```

Build local antes de subir:

```bash
npm run build
```

Si compila sin errores TypeScript, está listo para `git push`.
