# NaturalVita · Sprint 2 · Sesión 0 · Migración Resend

Migración inversa: AWS SES → Resend. La infraestructura SES queda dormida para reapelar en mes 2-3.

Duración estimada: **1.5–2 h** (incluye configuración manual del webhook en Resend).

---

## 1 · Contexto de la migración

El 13-may AWS denegó la salida del sandbox SES sin justificación específica. Para no bloquear el lanzamiento (~3-jun) volvemos a Resend, que tiene la cuenta activa en São Paulo con dos API keys ya creadas ("Supabase Auth" y "NaturalVita Production") y el dominio `news.naturalvita.co` verificado.

Lo que se conserva intacto del trabajo Sprint 1:

- Modelo de correos: transaccional desde `notificaciones@naturalvita.co`, marketing desde `hola@news.naturalvita.co`, reply-to `info@naturalvita.co`.
- DNS Hostinger (SPF, DKIM, DMARC con p=quarantine).
- Tabla `email_suppressions` en Supabase.
- Footers de plantillas con dirección Medellín.
- Arquitectura GEO (`/llms.txt`, schema.org, etc.).
- Plantillas react-email (`emails/*.tsx`).

Lo que cambia: el **adapter** (`lib/email/client.ts`) y el **webhook** (de `/api/webhooks/aws-sns` a `/api/webhooks/resend`).

---

## 2 · Dependencias npm

Desde la raíz del repo:

```bash
npm uninstall @aws-sdk/client-sesv2 @aws-sdk/client-sns
npm install resend@^4.0.0 svix@^1.34.0 @react-email/render@^1.0.0
```

Verifica que quedaron correctas:

```bash
npm ls resend svix @react-email/render
```

---

## 3 · Archivos a colocar / reemplazar

Copia el contenido del ZIP sobre la raíz del repo. Específicamente:

| Archivo | Acción |
|---|---|
| `lib/email/client.ts` | **Reemplaza** el existente |
| `app/api/webhooks/resend/route.ts` | **Nuevo archivo** |
| `app/tienda/metadata-canonical.snippet.tsx` | **Referencia** — no se queda en el repo |
| `.env.example` | **Reemplaza** el existente |

### Aplicar el fix de canónica en `/tienda`

Abre `app/tienda/page.tsx` y haz una de estas dos cosas según cómo esté escrito:

**Caso A · `metadata` estático.** Añade o fusiona el campo `alternates`:

```typescript
export const metadata: Metadata = {
  // ... lo que ya tengas
  alternates: {
    canonical: "https://naturalvita.co/tienda",
  },
};
```

**Caso B · `generateMetadata` dinámico** (filtros con nuqs). Dentro de la función, devuelve también:

```typescript
return {
  // ... lo que ya devuelvas
  alternates: {
    canonical: "https://naturalvita.co/tienda",
    // ↑ SIEMPRE el listado base. Nunca incluyas query params en la canónica.
  },
};
```

Verifica que `app/page.tsx` apunta su canónica a `https://naturalvita.co` y no a `/tienda`.

Borra el archivo `app/tienda/metadata-canonical.snippet.tsx` después de aplicar el fix (solo es referencia).

---

## 4 · Webhook viejo de AWS SNS

`app/api/webhooks/aws-sns/route.ts` queda **en el repo sin tocarlo**. La suscripción SNS en AWS ya está dormida (Sprint 1 cerrado), así que no recibirá tráfico. Cuando reapelemos AWS lo reactivamos. Nota mental: si en algún momento sí queremos limpiarlo, lo haremos en un sprint dedicado a higiene.

---

## 5 · Búsqueda global de referencias antiguas

Antes de hacer commit, asegúrate de que no quedan menciones a AWS SES en código activo:

```bash
grep -rn "aws-sdk/client-ses" --include="*.ts" --include="*.tsx" .
grep -rn "aws-sdk/client-sns" --include="*.ts" --include="*.tsx" .
grep -rn "SESClient\|SendEmailCommand" --include="*.ts" --include="*.tsx" .
```

Los únicos hits válidos son dentro de `app/api/webhooks/aws-sns/route.ts` (dormido). Cualquier otro hit es un import muerto que el nuevo `client.ts` ya reemplazó internamente — bórralo.

La firma pública `sendEmail()` no cambia, por lo que las **plantillas y server actions que la consumen siguen funcionando sin modificación**. Si encuentras alguno que aún hace `new SESClient()` directo o que importa el cliente de AWS, ese código es el que se migró internamente y debes borrarlo. Por contrato, todo el envío pasa por `sendEmail()`.

---

## 6 · Configuración de variables en Vercel

En el panel de Vercel → Project → Settings → Environment Variables, configura para **Production** y **Preview**:

| Variable | Valor |
|---|---|
| `RESEND_API_KEY` | API key "NaturalVita Production" desde resend.com → API Keys |
| `RESEND_WEBHOOK_SECRET` | (se genera en el paso 7) |
| `RESEND_FROM_TRANSACTIONAL` | `NaturalVita <notificaciones@naturalvita.co>` |
| `RESEND_FROM_MARKETING` | `NaturalVita <hola@news.naturalvita.co>` |
| `RESEND_REPLY_TO` | `info@naturalvita.co` |

Las variables `AWS_*` y `SES_*` quedan **en Vercel sin tocar**. Las usaremos en la reapelación.

---

## 7 · Configurar webhook en panel Resend

Esta es la única parte manual y la haces tras el primer deploy a Vercel con el código nuevo.

1. Login en `https://resend.com/login`.
2. Sidebar → **Webhooks** → **Add Endpoint**.
3. **Endpoint URL**: `https://naturalvita.co/api/webhooks/resend`
4. **API Version**: la default (v1).
5. **Events to send**: marca exactamente:
   - `email.sent`
   - `email.delivered`
   - `email.bounced`
   - `email.complained`
   - `email.opened` (para Savia futuro)
   - `email.clicked` (para Savia futuro)
6. Click **Add Endpoint**.
7. En la pantalla del endpoint recién creado, busca **Signing Secret** (empieza con `whsec_...`). Click "Reveal" o "Copy".
8. Pega ese secret en Vercel como `RESEND_WEBHOOK_SECRET`. Redeploy.
9. En Resend, click **Send Test Event** → elige `email.delivered`. Si todo está bien, recibirás `200 OK`.

Si ves `401 invalid_signature`, revisa que el secret en Vercel sea exacto (incluye el prefijo `whsec_`).

---

## 8 · Validación E2E

Tras el deploy con webhook configurado:

### 8a · Envío transaccional
1. Abre `https://naturalvita.co/contacto` en navegador anónimo.
2. Llena el formulario con un email que controles (Gmail recomendado).
3. Submit.
4. **Esperado**: email aterriza en inbox en <10 segundos desde `notificaciones@naturalvita.co`, con `Reply-To: info@naturalvita.co`.

### 8b · Webhook procesando bounce
Envía un email manual a `bounced@resend.dev` (dirección especial de Resend que siempre rebota):

```typescript
// Desde un script /scripts/test-bounce.ts o consola Supabase
import { sendEmail } from "@/lib/email/client";
await sendEmail({
  to: "bounced@resend.dev",
  subject: "Test bounce",
  html: "<p>Test</p>",
});
```

Espera ~30 segundos y verifica en Supabase Studio:

```sql
SELECT * FROM email_suppressions
WHERE email = 'bounced@resend.dev'
ORDER BY created_at DESC
LIMIT 1;
```

Debe aparecer una fila con `reason = 'bounce'` y `source = 'resend'`.

### 8c · Webhook procesando complaint
Mismo patrón con `complained@resend.dev`. Esa dirección dispara `email.complained` automáticamente.

```sql
SELECT * FROM email_suppressions WHERE email = 'complained@resend.dev';
```

### 8d · Suppression check funciona
Intenta enviar un segundo email a `bounced@resend.dev` después del paso 8b. El resultado debe ser:

```typescript
{ success: false, error: "suppressed", errorMessage: "...está en la lista de suppression." }
```

Sin que Resend reciba la solicitud.

---

## 9 · Solicitud manual de indexación en GSC

En paralelo al deploy, repite la solicitud de indexación de las 5 URLs top en Google Search Console:

1. `https://naturalvita.co`
2. `https://naturalvita.co/tienda` *(canónica recién aplicada, importante repetir)*
3. `https://naturalvita.co/sobre-nosotros`
4. `https://naturalvita.co/preguntas-frecuentes`
5. `https://naturalvita.co/contacto`

---

## 10 · Checklist de cierre Sesión 0

- [ ] Dependencias npm correctas
- [ ] `lib/email/client.ts` reemplazado
- [ ] `app/api/webhooks/resend/route.ts` creado
- [ ] Fix canónica `/tienda` aplicado
- [ ] Variables Vercel configuradas (5 nuevas)
- [ ] Build limpio: `npm run build` sin warnings
- [ ] Deploy a producción exitoso
- [ ] Webhook Resend configurado con signing secret en Vercel
- [ ] Test event Resend devuelve `200 OK`
- [ ] E2E contacto: email transaccional llega en <10s
- [ ] E2E bounce: aparece en `email_suppressions`
- [ ] E2E complaint: aparece en `email_suppressions`
- [ ] E2E suppression check: bloquea segundo envío
- [ ] GSC: 5 URLs solicitadas para reindexación
- [ ] Dashboard actualizado con Sesión 0 cerrada

Cuando todo lo de arriba esté verde, arrancamos **Sesión A del Home** (Hero + 6 etapas de vida + estética Discovery Land).
