# NaturalVita · Quiz de recomendaciones IA — Instalación

Quiz del Home reconstruido desde cero: **objetivo-primero**, layout 2 columnas (~62vh),
que lee un **mapa de recomendaciones pre-computado por IA**. La base de datos y el motor
de recálculo automático **ya están desplegados** en Supabase (proyecto qheynvhdjdnqywyaekpq).
Este ZIP es **integral y autocontenido**: trae todo lo necesario, incluyendo sus propios
helpers internos. No tienes que ajustar imports ni adivinar nombres de tu repo.

## Cómo integrarlo (subida masiva a GitHub)

Sube la carpeta `src/**` tal cual a tu repo (respetando rutas). No pisa nada existente:
todo el código nuevo vive bajo `src/lib/quiz/` y dos componentes nuevos. La Edge Function
ya está desplegada en Supabase; el archivo va incluido solo como referencia/control de versión.

Tras subir, solo editas UN archivo tuyo (el Home) para montar el quiz. Eso es todo.

## Contenido del ZIP

```
src/lib/quiz/types.ts                  Tipos + parámetros del umbral (configurable)
src/lib/quiz/queries.ts                Lectura: getActiveNeeds, resolveQuiz
src/lib/quiz/actions.ts                Server actions: resolver y guardar resultado
src/lib/quiz/admin-actions.ts          Server actions admin: recalcular + estado
src/lib/quiz/_internal/supabase.ts     Cliente Supabase autocontenido (público + servicio)
src/lib/quiz/_internal/rate-limit.ts   Rate limiter Upstash autocontenido (con fallback)
src/lib/quiz/_internal/session.ts      Sesión + guard de admin (Supabase Auth por cookies)
src/components/home/HeroQuiz.tsx        Componente del Hero con el quiz (cliente)
src/components/admin/QuizRecalcPanel.tsx  Panel admin: botón "Recalcular ahora"
supabase/functions/quiz-reco-sync/index.ts  Edge Function (YA desplegada; incluida por versión)
INSTALL.md / CONFIGURACION-SECRETS.md   Esta guía y la de secrets
```

## Dependencias

Ninguna nueva. El módulo usa lo que tu proyecto ya tiene: `@supabase/supabase-js`,
`@supabase/ssr`, `@upstash/ratelimit`, `@upstash/redis`, `zod` y `next`.

## Variables de entorno (ya las tienes)

El módulo usa las variables estándar que tu proyecto ya tiene en Vercel:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
y (opcional, para rate limit) `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
Si Upstash no está, el guardado del quiz simplemente no aplica límite (no rompe).

## El ÚNICO archivo tuyo que editas: el Home

En `src/app/(public)/page.tsx`, reemplaza el HeroQuiz viejo:

```tsx
import HeroQuiz from "@/components/home/HeroQuiz";
import { getActiveNeeds } from "@/lib/quiz/queries";

export default async function HomePage() {
  const needs = await getActiveNeeds();
  return (
    <>
      <HeroQuiz needs={needs} isLoggedIn={false} />
      {/* LifeStages, FeaturedProducts, ... (resto del Home igual) */}
    </>
  );
}
```

Notas:
- `isLoggedIn={false}` por ahora. Cuando el Home tenga login visible (Sprint 2 Sesión B),
  pásalo según tu sesión para activar el guardado vinculado a la cuenta.
- El primer paso del quiz ahora pregunta OBJETIVO (no etapa), así que ya NO se pisa
  con la sección LifeStages de abajo.
- Imagen del Hero: el componente usa `/home/naturalvita-hero.avif`. Usa la que generaste
  para Sprint 2 o cambia el `src` en HeroQuiz.tsx. Si no existe aún, cualquier AVIF/WEBP
  vertical sirve temporalmente.

## Panel de admin (opcional)

Monta `QuizRecalcPanel` donde gestiones catálogo (p.ej. una sección de /admin):

```tsx
import QuizRecalcPanel from "@/components/admin/QuizRecalcPanel";
import { getQuizSyncStatusAction } from "@/lib/quiz/admin-actions";

export default async function Page() {
  const status = await getQuizSyncStatusAction();
  return <QuizRecalcPanel initial={{ dirtyCount: status.dirtyCount, lastRun: status.lastRun }} />;
}
```

### Guard de admin — único punto a verificar

`_internal/session.ts` → `requireQuizAdmin()` considera admin si:
  (a) el usuario tiene `app_metadata.role === 'admin'` en Supabase Auth, o
  (b) existe una fila suya en la tabla `admin_users`.
Si tu repo marca admins de otra forma, ajusta `requireQuizAdmin()` (está aislado y comentado).
Esto SOLO afecta al panel de admin; el quiz público no usa esta verificación.

## Cómo funciona el umbral

`resolve_quiz(need, stage)` devuelve candidatos rankeados; el front aplica:
máx 2 directas + 1 coadyuvante (coadyuvante solo si score ≥ 45), tope 3, los que sean
dignos (si hay 1, muestra 1). Si no hay ninguno apto (típico en bebé), muestra un mensaje
cálido invitando a consultar, no una lista vacía. Parámetros en `types.ts` → `QUIZ_THRESHOLD`.

## Recálculo automático

Ya quedó montado en Supabase (trigger de huella + Edge Function + cron 15 min + cron
semanal + botón admin). Para ACTIVARLO necesitas registrar dos secrets una sola vez:
ver CONFIGURACION-SECRETS.md. El quiz funciona sin esto (el mapa ya está poblado); los
secrets solo habilitan que se reclasifique solo al agregar/editar productos.

## Mejora futura sugerida
De-duplicar presentaciones del mismo producto base en el resultado (p.ej. dos tamaños
del mismo probiótico). Y reforzar catálogo central de "articulaciones" (hoy se apoya
sobre todo en coadyuvantes).
