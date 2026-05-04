# NaturalVita · Patch · Consolidar info@naturalvita.co como bandeja única

Cambia todas las referencias a `contacto@naturalvita.co` por
`info@naturalvita.co` en código + footer + templates de email.
Elimina referencias a `soporte@` y `no-reply@` que estaban declaradas
pero no se usaban.

6 archivos modificados. Sin SQL, sin nuevas deps. Build verde.

---

## Estructura del ZIP

```
nv-fix-info-email/
├── INSTALL.md
├── app/(public)/iniciar-sesion/_LoginForm.tsx     ← MODIFICADO
└── lib/
    ├── legal/company-info.ts                       ← MODIFICADO
    └── email/
        ├── client.ts                               ← MODIFICADO
        └── templates/
            ├── _layout.tsx                         ← MODIFICADO
            ├── order-rejected.tsx                  ← MODIFICADO
            └── order-refunded.tsx                  ← MODIFICADO
```

---

## Aplicar

### Paso 1: Subir los 6 archivos al repo

Sube cada archivo a su ruta exacta reemplazando el existente.

### Paso 2: Cambiar variable en Vercel

Ve a `vercel.com` → tu proyecto → Settings → Environment Variables.

Edita la variable **`RESEND_REPLY_TO`**:
- Valor anterior: `contacto@naturalvita.co`
- Valor nuevo: `info@naturalvita.co`

Guarda. Vercel relanza automáticamente en ~30 segundos.

### Paso 3: Verificar

- Abre cualquier página del sitio (ej `/legal/privacidad`) → footer debe mostrar `info@naturalvita.co`.
- Crea un pedido de prueba (cualquier monto sandbox) → email "Recibimos tu pedido" debe llegar.
- Abre el email → reply-to debe ser `info@naturalvita.co` (responde y verifica que el destinatario es info@, no contacto@).

---

## Lo que NO toca este patch

- `pedidos@naturalvita.co` (FROM_EMAIL) — sigue igual, es la dirección remitente.
- Las páginas legales (`/legal/privacidad`, `/legal/terminos`, `/legal/envios`) leen desde `company-info.ts` así que se actualizan solas con el cambio del archivo.
- `RESEND_FROM_EMAIL` en Vercel sigue como `NaturalVita <pedidos@naturalvita.co>`. No tocar.

---

## Por qué este cambio

Decisión de simplificación operativa: usar una sola bandeja de contacto
(`info@naturalvita.co`, ya creada en Hostinger) en lugar de mantener tres
buzones (`contacto@`, `soporte@`, `info@`) que crearían confusión sobre
dónde escribir.

Esto NO afecta el flujo de webhook de Bold ni resuelve el problema de
emails de "Pago confirmado" que no llegan. Esos no llegan porque el
webhook de Bold sandbox no se está disparando (problema separado, en
investigación con test de producción $1.500).

---

## Limpieza arquitectónica futura

Hoy varios archivos hardcodean `info@naturalvita.co` directamente. En
una sesión futura sería bueno refactorizar para que todos lean desde
`COMPANY.publicEmail` y `EMAIL.replyTo` de `lib/legal/company-info.ts`
— así un cambio futuro de email solo requiere editar ese archivo. Lo
dejo agendado pero no lo hago ahora para no introducir cambios extra
mientras estamos depurando otro problema.
