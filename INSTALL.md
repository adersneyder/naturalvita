# NaturalVita · Fase 1 — Auth Multi-método

Build verde · 0 errores TS · 6 archivos.

Esta fase activa **Google OAuth + email/password + magic link** en `/iniciar-sesion` y `/crear-cuenta`. El cliente elige el método que prefiera.

---

## Variables de entorno

**Sin variables nuevas en Vercel**. La configuración de OAuth Google vive en Supabase, no en el código del proyecto.

Lo que ya configuraste:
- ✓ Client ID de Google en Supabase Auth → Providers → Google.
- ✓ Client Secret de Google en Supabase Auth → Providers → Google.
- ✓ Callback URL `https://qheynvhdjdnqywyaekpq.supabase.co/auth/v1/callback` registrada en Google Cloud Console.

---

## Archivos · qué hace cada uno

### `app/(public)/iniciar-sesion/_actions/auth.ts` (NUEVO)

Server actions de auth. Exporta 6 funciones:

- **`signInWithGoogleAction`**: genera URL OAuth con scopes mínimos (`email`, `profile`). Redirige al usuario a Google. Después del consentimiento, Google redirige a `/auth/callback`. Param `prompt=select_account` fuerza el chooser de Google (útil si el usuario tiene múltiples cuentas).

- **`signInWithPasswordAction`**: login con email + password. Mensaje de error genérico ("Correo o contraseña incorrectos") para no revelar si el email existe (defensa contra enumeración). Rate limit 30/min por IP.

- **`signUpWithPasswordAction`**: registro con nombre + email + password. Validación: password ≥ 10 caracteres, nombre ≥ 2 caracteres. Si Supabase tiene "Confirm email" ON (recomendado), retorna mensaje "revisa tu correo" en lugar de redirigir. Detecta caso "ya registrado" con mensaje específico.

- **`signInWithMagicLinkAction`**: el flow original sigue funcionando como fallback. Útil para clientes que no quieren contraseña.

- **`requestPasswordResetAction`**: genera link de reset y manda email. **Siempre responde "ok" aunque el email no exista** (anti-enumeración). Rate limit más estricto (anti-abuse).

- **`resetPasswordAction`**: cambia password después de hacer click en el email. Usa la sesión recovery que Supabase crea automáticamente. Valida que `password === password_confirm`.

### `app/(public)/iniciar-sesion/_LoginForm.tsx` (REEMPLAZADO)

Form rediseñado con jerarquía visual:
1. Botón Google grande arriba (CTA principal).
2. Separador "o con tu correo".
3. Form email + password con link "¿La olvidaste?".
4. Switch "Prefiero recibir un enlace por correo" → muestra form magic link.

Maneja errores de OAuth callback vía `?error=mensaje` en URL.

### `app/(public)/iniciar-sesion/_GoogleButton.tsx` (NUEVO)

Botón "Continuar con Google" siguiendo guidelines visuales oficiales de Google Identity: fondo blanco, borde sutil, logo SVG multicolor a la izquierda. Reutilizable en login y signup.

### `app/(public)/crear-cuenta/_SignupForm.tsx` (REEMPLAZADO)

Form simétrico al de login con campos extra para signup:
- Google OAuth.
- Email + password + nombre completo + check de términos.
- Magic link (sin password).

Link al final: "¿Ya tienes cuenta? Iniciar sesión".

### `app/(public)/recuperar-contrasena/_RecoverForm.tsx` (REEMPLAZADO)

Form simple con un solo campo: email. Mensaje genérico de éxito (anti-enumeración).

### `app/(public)/restablecer-contrasena/_ResetForm.tsx` (REEMPLAZADO)

Form de cambio de password (después de hacer click en el email):
- Nueva contraseña.
- Confirmar contraseña.
- Validación local: ambas iguales, mínimo 10 chars.

---

## Cómo se conectan los métodos

**Una identidad por email**. Si Juan se registra con `juan@gmail.com` + password, y después intenta loguearse con Google `juan@gmail.com`, Supabase **vincula automáticamente** las dos identidades al mismo `auth.users.id`. La fila en `public.customers` se mantiene única.

**Auto-onboarding sin cambios**. `lib/auth/customer-auth.ts` ya soporta crear fila customer en el primer login con cualquier método, leyendo `user_metadata.full_name` que Google pasa automáticamente al hacer OAuth.

**Callback unificado**. `/auth/callback/route.ts` ya intercambia el `code` por sesión sin importar si viene de OAuth o magic link. Sin cambios necesarios.

---

## Flujo OAuth completo (lo que verá el cliente)

1. Cliente click "Continuar con Google" en `/iniciar-sesion`.
2. Browser redirige a Google con la URL de OAuth.
3. Cliente elige cuenta de Google y aprueba el consentimiento.
4. Google redirige a `https://qheynvhdjdnqywyaekpq.supabase.co/auth/v1/callback?code=XXX`.
5. Supabase procesa el code, crea/actualiza user, redirige a `https://naturalvita.co/auth/callback?code=YYY&next=/mi-cuenta`.
6. Nuestra ruta `/auth/callback` intercambia el code por sesión.
7. Redirige a `/mi-cuenta`.
8. `requireCustomer()` detecta la sesión, busca customer en BD, no existe → crea fila usando metadata de Google (nombre, email).
9. Cliente queda logueado, ve su dashboard.

Tiempo total: ~3-5 segundos.

---

## Aplicación

1. Sube los 6 archivos al repo en sus rutas exactas.
2. Vercel hará deploy automático ~1-2 min.
3. Verifica build verde en Deployments.

---

## Validación end-to-end

### Flujo 1: Google OAuth (modo Testing)

**Importante**: Google Auth Platform está en modo "Pruebas". Solo los emails que agregaste como "usuarios de prueba" podrán loguearse. Los demás verán pantalla de error.

1. Abre `naturalvita.co/iniciar-sesion` en ventana **incógnito**.
2. Click "Continuar con Google".
3. Google muestra el chooser de cuenta. Elige `pedidos@naturalvita.co` o tu personal (los que registraste como tester).
4. Acepta el consentimiento OAuth.
5. Te redirige de vuelta a `/mi-cuenta` con sesión activa.
6. Verifica en BD: `SELECT * FROM public.customers WHERE email='X'` — debe haber una fila con `full_name` de Google.

### Flujo 2: registro con email + password

1. `naturalvita.co/crear-cuenta`.
2. Switch al form de password (debe estar por defecto).
3. Llena nombre, email NUEVO (no usado antes), password ≥ 10 chars.
4. Click "Crear cuenta".
5. Mensaje: "Te enviamos un correo para confirmar tu cuenta".
6. Revisa la bandeja del email usado.
7. Click en el link de confirmación.
8. Te lleva a `/mi-cuenta` con sesión activa.

### Flujo 3: recuperar password

1. `naturalvita.co/recuperar-contrasena`.
2. Ingresa email registrado en flow 2.
3. Click "Enviar enlace".
4. Revisa bandeja. Llega email con link.
5. Click en link → te lleva a `/restablecer-contrasena`.
6. Ingresa nueva contraseña + confirmación.
7. Click "Cambiar contraseña".
8. Te redirige a `/mi-cuenta?reset=ok` con sesión activa.

### Flujo 4: vinculación automática de identidades

Esta es la magia del diseño. Para validarla:

1. Registro inicial: usa Flow 2 con email `tucorreo+test@gmail.com` y password.
2. Logout.
3. Vuelve a `/iniciar-sesion`. Click "Continuar con Google".
4. Loguéate con la cuenta Google de **el mismo email** `tucorreo@gmail.com` (Gmail ignora el `+test`).
5. Supabase reconoce el email, vincula la identidad Google al user existente.
6. Verifica en BD:

```sql
SELECT u.email, array_agg(i.provider) FROM auth.users u
JOIN auth.identities i ON i.user_id = u.id
WHERE u.email = 'tucorreo@gmail.com'
GROUP BY u.email;
```

Debe mostrar `['email', 'google']` — un solo user con múltiples providers.

---

## Pendientes de Fase 2 (siguiente entrega)

1. **Guest checkout**: permitir comprar sin sesión.
2. **Detección automática de email en checkout**: si el email tiene cuenta, ofrecer login inline.
3. **Link discreto en `/carrito`**: "¿Ya tienes cuenta? Iniciar sesión".
4. **Reclamación de pedidos guest**: cuando alguien se registra con email que tenía pedidos guest, vinculación automática.

## Pendientes de Fase 3

1. **Card "Crea tu cuenta" post-compra**: en página de éxito del pedido, ofrecer 3 métodos de auth con datos pre-rellenados.
2. **Tracking de conversión guest → cuenta**: evento Klaviyo "Account Created Post Purchase".

---

## Antes de publicar a producción (cuando quieras lanzar)

Mientras la app esté en modo "Pruebas" en Google Auth Platform, **solo los testers que agregaste pueden loguearse con Google**. Los demás verán "esta app no está verificada".

Para abrir a todos los usuarios:

1. Ve a Google Cloud Console → Google Auth Platform → **Audiencia** (o "Público").
2. Sección "Estado de publicación" → click **"Publicar app"**.
3. Como solo pides scopes `email` y `profile` (no-sensibles), Google publica **inmediatamente**, sin proceso de revisión de 4-6 semanas.
4. Confirmación: la app pasa de "Pruebas" a "En producción".

**Hazlo justo antes del lanzamiento real**, no antes. Mientras tanto, en modo Pruebas estás protegido contra clientes reales que entren por error.

---

## Pendientes operativos vivos

- Crear lista "Newsletter NaturalVita" en Klaviyo + variable `KLAVIYO_NEWSLETTER_LIST_ID`.
- Reembolso B8XV ($13.500) en panel Bold.
- Reintentar sitemap GSC.
- Activar 2FA en cuenta Google `pedidos@naturalvita.co` (si no lo hiciste ya).
