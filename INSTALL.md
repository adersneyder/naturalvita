# NaturalVita · Sprint 1 · Migración AWS SES + GEO base

Guía de instalación e integración. Sigue los pasos **en orden**.

---

## Contexto

Este ZIP implementa:

1. **Migración completa de Resend a AWS SES**: `lib/email/client.ts` se reescribe para usar `@aws-sdk/client-sesv2`. La interfaz pública `sendEmail()` no cambia, así que las plantillas y server actions existentes siguen funcionando sin modificación.
2. **Nuevo modelo de correos**: emails transaccionales salen desde `notificaciones@naturalvita.co`, marketing desde `hola@news.naturalvita.co`, ambos con `Reply-To: info@naturalvita.co`.
3. **Webhook SNS** para procesar bounces y complaints automáticamente.
4. **GEO base** (Generative Engine Optimization): `/llms.txt`, `/llms-full.txt`, `robots.txt` extendido con permisos explícitos para bots de IA.
5. **Schema.org Organization** sin NIT ni teléfono según política del proyecto.
6. **Adapter stub de Savia** para Sprint 2.

---

## 1 · Estructura de archivos a copiar

Copia el contenido del ZIP al raíz del repo `naturalvita`. Estructura:

```
naturalvita/
├── app/
│   ├── api/webhooks/aws-sns/route.ts           [NUEVO]
│   ├── llms.txt/route.ts                        [NUEVO]
│   ├── llms-full.txt/route.ts                   [NUEVO]
│   └── robots.txt/route.ts                      [NUEVO o reemplaza]
├── components/
│   └── schema/OrganizationSchema.tsx            [NUEVO]
├── lib/
│   ├── email/client.ts                          [REEMPLAZA versión Resend]
│   ├── legal/company-info.ts                    [REEMPLAZA con nuevos emails]
│   └── savia/transport/ses.ts                   [NUEVO]
├── migrations/
│   └── 20260512_create_email_suppressions.sql   [APLICAR en Supabase]
└── .env.example                                 [REEMPLAZA]
```

---

## 2 · Dependencias npm

### Instalar

```bash
npm install @aws-sdk/client-sesv2@^3.700.0
```

### Desinstalar

```bash
npm uninstall resend
```

Verifica que `package.json` ya no tenga `resend` en `dependencies` después del uninstall.

### Verificación

```bash
npm list @aws-sdk/client-sesv2
# Debe mostrar versión instalada

npm list resend
# Debe responder "(empty)"
```

---

## 3 · Variables de entorno

### En Vercel (ya configuradas)

| Variable | Valor |
|---|---|
| `AWS_REGION` | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | (de IAM user `naturalvita-ses-sender`) |
| `AWS_SECRET_ACCESS_KEY` | (de IAM user `naturalvita-ses-sender`) |
| `SES_FROM_TRANSACTIONAL` | `NaturalVita <notificaciones@naturalvita.co>` |
| `SES_FROM_MARKETING` | `NaturalVita <hola@news.naturalvita.co>` |
| `SES_REPLY_TO` | `info@naturalvita.co` |

### En `.env.local` (desarrollo)

Replicar las mismas variables. Para desarrollo local, **puedes** usar las mismas credenciales del IAM user de producción, o crear un IAM user separado `naturalvita-ses-sender-dev` con misma política. Recomendado lo segundo para auditoría más limpia.

### Eliminadas

- `RESEND_API_KEY` (eliminada en Vercel ✅)
- `RESEND_FROM_EMAIL`
- Cualquier otra `RESEND_*`

---

## 4 · Migración SQL en Supabase

Aplica la migración `migrations/20260512_create_email_suppressions.sql` vía Supabase MCP o pega el SQL en el SQL Editor de Supabase.

Esto crea:
- Tabla `email_suppressions` con índices y RLS
- Función `is_email_suppressed(email)` para consulta rápida
- Trigger `updated_at` automático

### Verificación

```sql
-- Debe devolver la fila de definición
SELECT * FROM email_suppressions LIMIT 1;

-- Debe devolver false para email no suprimido
SELECT is_email_suppressed('test@example.com');
```

---

## 5 · Actualizar plantillas de email transaccionales

El cliente `sendEmail()` migrado a SES funciona igual, pero conviene revisar las plantillas existentes para asegurar consistencia con el nuevo modelo:

### Archivos a revisar

```
emails/_layout.tsx
emails/order-paid.tsx
emails/order-shipped.tsx
emails/order-rejected.tsx
emails/order-refunded.tsx
emails/newsletter-welcome.tsx
emails/contact-inquiry.tsx
emails/contact-confirmation.tsx
```

### Cambios necesarios en cada uno

**Buscar y reemplazar** (usando find/replace global del editor):

| Buscar | Reemplazar |
|---|---|
| `pedidos@naturalvita.co` | `info@naturalvita.co` |
| `From: 'pedidos@'` (en código) | El nuevo modelo lo gestiona el cliente automáticamente — eliminar líneas `from:` hardcodeadas de las llamadas a `sendEmail()` |

### En el footer de cada email

Verificar que aparezca:

- Email de contacto: `info@naturalvita.co`
- Dirección: la generada por `getFormattedAddress()` desde `company-info.ts`
- Línea legal: `NaturalVita es una marca de Everlife Colombia S.A.S.`

### Otros lugares en el repo que pueden mencionar `pedidos@`

Búsqueda global recomendada:

```bash
grep -r "pedidos@naturalvita" --include="*.ts" --include="*.tsx" .
```

Resultados típicos a actualizar:
- `app/(public)/iniciar-sesion/_LoginForm.tsx` (mensajes de error)
- `app/contacto/page.tsx` (formulario de contacto)
- `components/Footer.tsx` (footer del sitio)
- Cualquier hardcoded copy del sitio

Reemplazar todo `pedidos@naturalvita.co` por `info@naturalvita.co` para alinear con el nuevo modelo.

---

## 6 · Inyectar Schema.org Organization en el layout

En `app/layout.tsx` (o `app/(public)/layout.tsx` según la estructura del repo), importa e incluye los componentes de schema en el `<head>`:

```tsx
import { OrganizationSchema, WebSiteSchema } from "@/components/schema/OrganizationSchema";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <OrganizationSchema isMainEntity />
        <WebSiteSchema />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

`isMainEntity` solo en el layout que envuelve la home — para otras páginas no es necesario.

### Validación

Tras deploy a producción, validar con:

- Google Rich Results Test: https://search.google.com/test/rich-results?url=https://naturalvita.co
- Debe detectar `Organization` y `WebSite` sin errores

---

## 7 · Deploy a Vercel

```bash
git add .
git commit -m "feat(sprint-1): migración AWS SES + GEO base + nuevo modelo de correos"
git push origin main
```

Vercel desplegará automáticamente. Espera a que el build esté en verde.

### Verificación post-deploy

| Check | URL | Resultado esperado |
|---|---|---|
| robots.txt | `https://naturalvita.co/robots.txt` | Texto plano con bots IA permitidos |
| llms.txt | `https://naturalvita.co/llms.txt` | Markdown con descripción NaturalVita |
| llms-full.txt | `https://naturalvita.co/llms-full.txt` | Markdown extendido con productos |
| schema.org | View source de home | Bloque `<script type="application/ld+json">` con Organization |

---

## 8 · Configurar SNS Subscription (DESPUÉS del deploy)

Este paso solo se hace cuando el webhook ya esté desplegado en producción.

### 8.1 · Crear Configuration Set en SES

1. AWS Console → SES → sidebar → **Configuration sets**
2. Click **Create set**
3. Configuración:
   - **Name:** `naturalvita-default`
   - **Reputation tracking:** Enabled
   - **Sending status:** Enabled
4. Click **Create set**

### 8.2 · Añadir Event Destination apuntando al SNS topic

1. Dentro del Configuration Set → pestaña **Event destinations** → **Add destination**
2. Configuración:
   - **Event types:** marca `Bounces`, `Complaints`, `Deliveries`, `Rejects`
   - **Destination name:** `sns-naturalvita-events`
   - **Destination type:** Amazon SNS
   - **SNS topic:** selecciona `naturalvita-ses-events`
3. Click **Add destination**

### 8.3 · Asociar Configuration Set a las identidades

Para cada identidad (`naturalvita.co` y `news.naturalvita.co`):

1. SES → Configuración → Identidades → click sobre la identidad
2. Pestaña **Configuration set** (o **Default configuration set**) → **Edit**
3. Selecciona `naturalvita-default` como default
4. Save changes

### 8.4 · Crear Suscripción HTTPS

1. AWS Console → SNS → Topics → click sobre `naturalvita-ses-events`
2. Pestaña **Subscriptions** → **Create subscription**
3. Configuración:
   - **Protocol:** HTTPS
   - **Endpoint:** `https://naturalvita.co/api/webhooks/aws-sns`
   - **Enable raw message delivery:** **NO marcar**
4. Click **Create subscription**

AWS hace POST inmediato al webhook con `SubscriptionConfirmation`. El código en `route.ts` confirma automáticamente.

### 8.5 · Verificar que la suscripción quedó confirmada

En SNS → Topics → `naturalvita-ses-events` → pestaña Subscriptions: debe aparecer la suscripción con status **Confirmed** (no "Pending confirmation").

Si quedó pendiente, revisar logs de Vercel → Functions → buscar errores en `/api/webhooks/aws-sns`.

---

## 9 · Validación end-to-end

### 9.1 · Enviar email transaccional de prueba (estando aún en sandbox)

Mientras AWS aprueba la salida del sandbox, solo puedes enviar a `dev@naturalvita.co`. Hacer un test:

```typescript
// En cualquier server action o API route temporal
import { sendEmail } from "@/lib/email/client";

const result = await sendEmail({
  to: "dev@naturalvita.co",
  subject: "Test SES NaturalVita",
  html: "<h1>Funciona</h1><p>Email enviado desde AWS SES.</p>",
});

console.log(result);
// Esperado: { success: true, messageId: "..." }
```

Revisa la bandeja de `dev@naturalvita.co` en webmail Hostinger. Debe llegar el email.

### 9.2 · Cuando AWS apruebe salida del sandbox

Recibirás email de AWS confirmando producción. A partir de ahí puedes enviar a cualquier destinatario.

### 9.3 · Mail-tester score

Crear cuenta gratuita en https://mail-tester.com → te dan una dirección única. Envía un test desde el sitio (welcome, order confirmation) a esa dirección. Score esperado: **≥9/10**.

Si score <9, revisar:
- DKIM passes
- SPF aligned
- DMARC passes
- No imágenes pesadas sin alt
- Ratio html/text correcto

---

## 10 · Limpieza final (después de validación)

### 10.1 · Eliminar registros DNS de Resend (opcional, después de 30 días sin uso)

En Hostinger DNS, después de confirmar que SES funciona en producción durante 30 días, eliminar:

```
TXT  resend._domainkey   ...   (DKIM Resend antiguo)
MX   send                10    feedback-smtp.sa-east-1.amazonses.com
TXT  send                      "v=spf1 include:amazonses.com ~all"
```

**Importante:** estos registros son los que Resend usaba internamente (Resend envía vía AWS SES sa-east-1 por debajo). No los elimines antes de validar que el nuevo flujo (us-east-1 directo) funciona en producción durante un tiempo prudencial.

### 10.2 · Eliminar referencias a Resend en el código

```bash
grep -r "resend" --include="*.ts" --include="*.tsx" -i .
```

Debe devolver vacío (excepto comentarios históricos si los hay).

---

## Troubleshooting

### Error: "Email address is not verified"

Estás en sandbox. Solo puedes enviar a direcciones verificadas. Espera aprobación AWS de salida del sandbox (24-72h) o verifica el destinatario manualmente en SES → Identidades → Crear identidad → tipo Email.

### Error: "Could not connect to SES"

Verificar variables `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` en Vercel. Si están bien, validar que el IAM user `naturalvita-ses-sender` tenga política `AmazonSESFullAccess`.

### Webhook SNS no recibe eventos

1. Verificar que la suscripción quedó **Confirmed** (no Pending)
2. Verificar que el Configuration Set está asociado a la identidad de dominio
3. Verificar logs Vercel → Functions → `/api/webhooks/aws-sns`
4. Si los logs muestran "Invalid signature", verificar que `expectedTopicArnPattern` en el código coincida con el ARN real del topic (debería empezar con `arn:aws:sns:us-east-1:<account-id>:naturalvita-ses-`)

---

## Estado al cerrar Sprint 1

- ✅ Resend removido completamente del stack
- ✅ AWS SES como ESP único para transaccional + marketing
- ✅ Modelo de correos limpio: `info@` público, `notificaciones@` transaccional, `hola@news` marketing
- ✅ Webhook automático de bounces y complaints
- ✅ GEO base operativo: llms.txt, robots.txt, schema.org
- ✅ Base lista para Sprint 2 · Savia núcleo

Próximo: Sprint 2 · construcción del engine de Savia, flows de welcome y carrito abandonado, dashboard `/admin/savia`.
