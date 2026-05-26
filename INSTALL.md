# NaturalVita · Quiz de recomendaciones IA — Instalación (estructura RAÍZ)

IMPORTANTE: este ZIP usa la estructura de tu repo, con las carpetas en la RAÍZ
(`lib/`, `components/`), NO bajo `src/`. Tu `tsconfig.json` tiene `"@/*": ["./*"]`,
así que los imports `@/lib/quiz/...` resuelven a `lib/quiz/...` en la raíz.

## ⚠️ Antes de subir: borra la carpeta `src/` huérfana del cargue anterior

El ZIP anterior (equivocado) creó una carpeta `src/` en tu repo con el quiz dentro.
Esa carpeta NO sirve (tu proyecto no usa `src/`) y hay que eliminarla para que no
queden archivos duplicados ni confusión. En GitHub:
1. Entra a la carpeta `src/` del repo.
2. Bórrala completa (puedes borrar archivo por archivo, o desde la línea de comandos
   si clonas: `git rm -r src && git commit -m "remove stray src" && git push`).
Si no puedes borrarla fácil desde la web, dime y te explico la vía con GitHub Desktop.

## Cómo integrar este ZIP (subida masiva)

Sube el contenido del ZIP a la RAÍZ del repo. Las carpetas se fusionan con las tuyas:
- `lib/quiz/...`        → se agrega junto a tu `lib/` existente
- `components/home/HeroQuiz.tsx`   → junto a tus componentes del Home
- `components/admin/QuizRecalcPanel.tsx` → junto a tu admin
- `supabase/functions/quiz-reco-sync/index.ts` → ya existe, no cambia
No pisa nada tuyo: todo el código del quiz vive en rutas nuevas (`lib/quiz/`, y dos
componentes nuevos).

## Contenido

```
lib/quiz/types.ts                  Tipos + umbral configurable
lib/quiz/queries.ts                Lectura: getActiveNeeds, resolveQuiz
lib/quiz/actions.ts                Server actions: resolver y guardar
lib/quiz/admin-actions.ts          Server actions admin: recalcular + estado
lib/quiz/_internal/supabase.ts     Cliente Supabase autocontenido
lib/quiz/_internal/rate-limit.ts   Rate limiter Upstash autocontenido
lib/quiz/_internal/session.ts      Sesión + guard de admin (Supabase Auth)
components/home/HeroQuiz.tsx        Hero con el quiz (cliente)
components/admin/QuizRecalcPanel.tsx  Panel admin: botón "Recalcular ahora"
supabase/functions/quiz-reco-sync/index.ts  Edge Function (ya desplegada; por versión)
CONFIGURACION-SECRETS.md           Guía de secrets para el recálculo automático
```

## Dependencias y variables

Ninguna nueva. Usa lo que ya tienes: `@supabase/supabase-js`, `@supabase/ssr`,
`@upstash/ratelimit`, `@upstash/redis`, `zod`, `next`.
Variables (ya configuradas en Vercel): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, y opcionalmente
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## El ÚNICO archivo tuyo que editas: el Home

En tu página de inicio (la que renderiza el Home, p.ej. `app/(public)/page.tsx`):

```tsx
import HeroQuiz from "@/components/home/HeroQuiz";
import { getActiveNeeds } from "@/lib/quiz/queries";

export default async function HomePage() {
  const needs = await getActiveNeeds();
  return (
    <>
      <HeroQuiz needs={needs} isLoggedIn={false} />
      {/* LifeStages, FeaturedProducts, ... (resto igual) */}
    </>
  );
}
```

- `isLoggedIn={false}` por ahora; conéctalo a tu sesión cuando el Home tenga login visible.
- El quiz pregunta primero el OBJETIVO (no la etapa), así que ya NO se pisa con LifeStages.
- Imagen del Hero: usa `/home/naturalvita-hero.avif` (carpeta `public/home/`). Cambia el
  `src` en HeroQuiz.tsx si tu imagen tiene otro nombre.

## Panel de admin (opcional)

```tsx
import QuizRecalcPanel from "@/components/admin/QuizRecalcPanel";
import { getQuizSyncStatusAction } from "@/lib/quiz/admin-actions";

export default async function Page() {
  const status = await getQuizSyncStatusAction();
  return <QuizRecalcPanel initial={{ dirtyCount: status.dirtyCount, lastRun: status.lastRun }} />;
}
```

Guard de admin en `lib/quiz/_internal/session.ts` → `requireQuizAdmin()`: considera admin
si `app_metadata.role === 'admin'` o si hay fila en `admin_users`. Ajústalo a tu modelo si
difiere (está aislado y comentado). Solo afecta al panel admin, no al quiz público.

## Umbral
máx 2 directas + 1 coadyuvante (≥45), tope 3, los que sean dignos. Sin aptos → mensaje
cálido, no lista vacía. Parámetros en `lib/quiz/types.ts` → `QUIZ_THRESHOLD`.

## Recálculo automático
Ya montado en Supabase (trigger + Edge Function + cron 15 min + semanal + botón admin).
Para activarlo, registra dos secrets (ver CONFIGURACION-SECRETS.md). El quiz funciona
sin esto; los secrets solo habilitan reclasificar al agregar/editar productos.
