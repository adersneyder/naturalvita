# NaturalVita · Quiz de recomendaciones IA — Instalación

Quiz del Home reconstruido desde cero: **objetivo-primero**, layout 2 columnas (~62vh),
que lee un **mapa de recomendaciones pre-computado por IA** (no filtra colecciones en vivo).
La capa de base de datos y el motor de recálculo automático **ya están desplegados** en
Supabase (proyecto `qheynvhdjdnqywyaekpq`). Este ZIP trae el código de aplicación.

## Contenido del ZIP

```
src/lib/quiz/types.ts            Tipos + parámetros del umbral (configurable)
src/lib/quiz/queries.ts          Lectura: getActiveNeeds, resolveQuiz (usa RPC resolve_quiz)
src/lib/quiz/actions.ts          Server actions: resolver y guardar resultado
src/lib/quiz/admin-actions.ts    Server actions admin: recalcular + estado
src/components/home/HeroQuiz.tsx        Componente del Hero con el quiz (cliente)
src/components/admin/QuizRecalcPanel.tsx  Panel admin: botón "Recalcular ahora"
supabase/functions/quiz-reco-sync/index.ts  Edge Function de reclasificación (ya desplegada)
CONFIGURACION-SECRETS.md         Secrets que debes registrar (uno a uno)
```

## Lo que YA está en Supabase (no hay que hacer nada)

- Tablas `quiz_needs` (8 necesidades activas) y `quiz_recommendations` (127 recos aprobadas).
- Función `resolve_quiz(need_slug, stage, min_adjuvant_score)` — la que usa el front.
- Trigger de huella de contenido + vista `quiz_reco_dirty_products`.
- Edge Function `quiz-reco-sync` desplegada (versión 1, activa).
- Crons: `quiz-reco-debounce-sync` (cada 15 min) y `quiz-reco-weekly-sync` (domingo 3am).
- Tabla de auditoría `quiz_reco_sync_runs`.

## Pasos de integración en el repo

### 1. Copiar archivos
Copia `src/**` a tu árbol de `src/`. Respeta las rutas.

### 2. Ajustar imports a tus helpers reales
Construí contra rutas estándar; revisa estos imports y ajústalos a los de tu repo
(están marcados con `TODO(repo)`):

| Import asumido | Qué es | Dónde lo usé |
|----------------|--------|--------------|
| `@/lib/supabase/server` → `createServerClient()` | cliente Supabase server | queries.ts, actions.ts, admin-actions.ts |
| `@/lib/rate-limit` → `ratelimit` | rate limiter Upstash | actions.ts |
| `@/lib/auth/session` → `getCurrentCustomer()` | cliente logueado o null | actions.ts |
| `@/lib/auth/admin` → `requireAdmin()` | guard de admin | admin-actions.ts |

Si tus helpers tienen otro nombre/forma, sólo cambia el import y la llamada. La lógica no depende de su implementación.

### 3. Montar el HeroQuiz en el Home
En tu `app/(public)/page.tsx`, reemplaza el HeroQuiz viejo:

```tsx
import HeroQuiz from "@/components/home/HeroQuiz";
import { getActiveNeeds } from "@/lib/quiz/queries";
// ...
export default async function HomePage() {
  const needs = await getActiveNeeds();
  // isLoggedIn: usa tu helper de sesión. Cuando el Home tenga login visible
  // (Sprint 2 Sesión B), pásalo para activar el guardado vinculado a cuenta.
  const isLoggedIn = false; // TODO(repo): resolver con tu sesión
  return (
    <>
      <HeroQuiz needs={needs} isLoggedIn={isLoggedIn} />
      {/* LifeStages, FeaturedProducts, ... (resto del Home) */}
    </>
  );
}
```

El HeroQuiz reemplaza el bloque de 100vh anterior. El primer paso ahora pregunta
**objetivo** (no etapa), así que ya no se pisa con la sección LifeStages de abajo.

### 4. Imagen del Hero
El componente referencia `/home/naturalvita-hero.avif` (columna derecha). Usa la imagen
del Hero que ya generaste para Sprint 2, o ajusta el `src`. Si aún no existe, cualquier
AVIF/WEBP vertical sirve temporalmente; el badge "+299 productos" va encima.

### 5. Panel de admin (opcional pero recomendado)
Monta `QuizRecalcPanel` donde gestiones el catálogo (p.ej. `/admin/productos` o una
sección de ajustes). Cárgalo con el estado inicial:

```tsx
import QuizRecalcPanel from "@/components/admin/QuizRecalcPanel";
import { getQuizSyncStatusAction } from "@/lib/quiz/admin-actions";
// en un server component admin:
const status = await getQuizSyncStatusAction();
return <QuizRecalcPanel initial={{ dirtyCount: status.dirtyCount, lastRun: status.lastRun }} />;
```

### 6. Secrets (ver CONFIGURACION-SECRETS.md)
Para que el recálculo automático funcione, registra `ANTHROPIC_API_KEY` y
`QUIZ_SYNC_SECRET` en la Edge Function, y los secretos del Vault. **El quiz funciona
sin esto** (el mapa ya está poblado); los secrets solo habilitan la actualización
automática cuando agregues/edites productos.

## Cómo funciona el umbral (recordatorio)
Por necesidad y etapa, `resolve_quiz` devuelve candidatos rankeados; el front aplica:
máx **2 directas + 1 coadyuvante** (coadyuvante solo si score ≥ 45), **tope 3 productos**,
los que sean dignos (si solo hay 1, muestra 1). Si no hay ninguno apto (típico en bebé),
el quiz muestra un mensaje cálido invitando a consultar, no una lista vacía.

Los parámetros viven en `src/lib/quiz/types.ts` → `QUIZ_THRESHOLD`. Cámbialos ahí sin tocar lógica.

## Notas de diseño
- Estética alineada al Home: crema/blanco, Georgia serif en titulares, acentos verde
  #1E7D2E y púrpura #4A2E9A. CSS scoped con clases `nv-hq-*` y `nv-qrp-*`.
- Determinista: dos visitantes con la misma respuesta ven el mismo orden (desempate
  reseñas → novedad → id).
- INVIMA: todo el texto es de acompañamiento, nunca de tratamiento/cura.
- Mejora futura sugerida: de-duplicar presentaciones del mismo producto base (p.ej. dos
  tamaños de Bwell Probiotics) en el resultado del quiz.
