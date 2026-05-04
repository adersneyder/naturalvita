# NaturalVita · Patch · Home → /tienda + auth callback distingue admin/cliente

Dos archivos modificados. Resuelve dos bugs visibles tras configurar
Supabase SMTP custom:

1. La home `/` mostraba "Próximamente" en lugar del catálogo.
2. El callback redirigía a `/admin/login` por error cuando un cliente
   tenía un problema de auth, en lugar de a `/iniciar-sesion`.

Build verde. Sin SQL, sin nuevas deps.

## Estructura del ZIP

```
nv-fix-home-redirect/
├── INSTALL.md
└── app/
    ├── page.tsx                    ← MODIFICADO (redirect a /tienda)
    └── auth/callback/route.ts      ← MODIFICADO (distingue admin/cliente)
```

## Aplicar

Sube los dos archivos a sus rutas exactas reemplazando los existentes.
Vercel auto-deploy.

## Cambio 1: home redirige a /tienda

`app/page.tsx` ya no muestra la landing "Próximamente". Hace
`redirect("/tienda")`. Cualquiera que entre a `naturalvita.co/` cae
inmediatamente al catálogo.

**Implicación**: si un cliente hace click en un magic link expirado,
Supabase lo redirige a la raíz con parámetros de error. Antes lo dejaba
en "Próximamente" sin saber qué pasó. Ahora lo lleva al catálogo y
puede volver a `/iniciar-sesion` desde el header normal.

## Cambio 2: callback con detección admin/cliente

Antes el callback hardcodeaba `/admin/login` como destino de error.
Eso significaba que si un cliente (no admin) tenía error de magic link,
terminaba en el login de admin que no le sirve.

Ahora: el callback lee el `next` que viene en el querystring. Si empieza
con `/admin` → trata el flujo como admin (errores van a `/admin/login`).
Si no → trata el flujo como cliente (errores van a `/iniciar-sesion`).

Default si no hay `next`: `/mi-cuenta` (asume cliente).

## Validación post-deploy

1. Abre `https://naturalvita.co` directo → debe redirigir a `/tienda`.
2. Abre ventana incógnita → ve a `/iniciar-sesion` → pon email nuevo →
   click "Enviar enlace" → revisa email → click "Confirmar mi cuenta".
3. Debe redirigir a `/mi-cuenta` con sesión iniciada (NO a `/admin` ni
   a "Próximamente").

## Lo que NO toca

- La estructura de auth de Supabase (SMTP custom, plantillas) sigue
  igual. Lo que configuraste hace una hora se mantiene perfecto.
- La home `/tienda` y todas sus subrutas siguen iguales.
- `/admin/login` y todo el flujo admin sigue igual.

## Una decisión a futuro pendiente

Hoy `/` redirige a `/tienda`. Cuando llegue Hito 2 con marketing real,
construiremos una landing comercial propia con hero, beneficios, productos
destacados, testimonios, etc. — y la home dejará de redirigir y empezará
a tener contenido SEO-optimizable propio. Por ahora el redirect es la
opción más limpia y rápida.
