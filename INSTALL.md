# NaturalVita · Sprint 2 · Sesión A · Home Quiz-First

## 🆕 Actualización Sesión A.2 (sin fricción + login + persistencia)

Esta versión cierra tres mejoras sobre el quiz base:

1. **Detección de usuarios logueados (sin fricción):** el quiz detecta la sesión client-side. Si estás logueado, NO te pide email (usa el de tu cuenta), vincula el resultado a tu `customer_id`, y respeta tu `accepts_marketing` (si es false, guarda pero no envía email automático). El Home sigue siendo estático (la detección es client-side, no sacrifica SEO/LCP).

2. **URL compartible del resultado (`/quiz/r/[slug]`):** cada resultado se guarda con un slug corto. La página es un Server Component liviano (cero JS pesado), con metadata dinámica + schema.org ItemList. Se incluye como link en el email ("Volver a ver tu selección"). Marcada `noindex` (cada resultado es personal) pero `follow` para que los links a productos pasen autoridad.

3. **Persistencia:** tabla `quiz_results` con snapshot de productos. Migración `sprint2_sa2_quiz_results` ya aplicada vía MCP.

**Archivos nuevos de A.2** (además de los 8 base):
- `app/quiz/r/[slug]/page.tsx` — página pública del resultado
- `lib/quiz/save-result.ts` — guardar/leer resultados

**Archivos modificados respecto al ZIP base:**
- `app/_actions/quiz-subscribe.tsx` — ahora detecta login, persiste, respeta accepts_marketing
- `components/home/HeroQuiz.tsx` — detecta sesión client-side, botón "Guardar" para logueados
- `lib/email/templates/quiz-result.tsx` — incluye link al resultado guardado
- `app/page.tsx` — sin cambios (sigue estático)

---


Home rediseñado con Quiz-Hero (matching IA en tiempo real con Haiku 4.5) + 6 cards de etapas de vida.

## 1 · Migración Supabase — YA APLICADA

La migración `sprint2_sa_quiz_infra` ya se aplicó vía MCP durante la sesión. Añadió:
- Columna `quiz_properties JSONB` a `newsletter_subscribers`
- Tabla `quiz_match_cache` (caché 24h del matching IA) con RLS
- Función `cleanup_expired_quiz_cache()`

No tienes que hacer nada en Supabase. Si quieres verificar:
```sql
SELECT * FROM quiz_match_cache LIMIT 1;
SELECT column_name FROM information_schema.columns
  WHERE table_name='newsletter_subscribers' AND column_name='quiz_properties';
```

## 2 · Dependencias npm — NINGUNA NUEVA

Todo usa lo que ya tienes: `@anthropic-ai/sdk`, `@upstash/ratelimit`, `@upstash/redis`, `zod`, `@react-email/components`, `lucide-react`, `next/image`. No hay `npm install`.

## ⚠️ Correcciones aplicadas tras revisar tu repo real

Tras revisar la estructura real de tu repo, ajusté tres cosas para que el build no falle:

1. **`quiz-result.tsx` vive en `lib/email/templates/`** (no en `emails/`). Usa el `EmailLayout` compartido, igual que tus otras plantillas. Queda visualmente coherente con newsletter-welcome.
2. **`status: 'subscribed'`** — tu tabla `newsletter_subscribers` usa el valor `'subscribed'` por defecto (con CHECK constraint que solo acepta 'subscribed'/'unsubscribed'/'bounced'). Mi código ahora usa el valor correcto.
3. **Ruta de baja `/newsletter/desuscribir/[token]`** — la misma que ya usa tu newsletter-welcome, no inventé una nueva. El email del quiz incluye header `List-Unsubscribe` RFC 8058 + link en footer.

## 3 · Archivos a colocar en el repo

| Archivo del ZIP | Ruta en repo | Acción |
|---|---|---|
| `app/page.tsx` | `app/page.tsx` | **Reemplaza** el home actual |
| `components/home/quiz-data.ts` | igual | Nuevo |
| `components/home/HeroQuiz.tsx` | igual | Nuevo |
| `components/home/LifeStages.tsx` | igual | Nuevo |
| `lib/quiz/match-products.ts` | igual | Nuevo |
| `app/api/quiz/match/route.ts` | igual | Nuevo |
| `app/_actions/quiz-subscribe.tsx` | igual (.tsx, contiene JSX) | Nuevo |
| `lib/email/templates/quiz-result.tsx` | **lib/email/templates/** | Nuevo |
| `lib/quiz/save-result.ts` | **lib/quiz/** | Nuevo (A.2) |
| `app/quiz/r/[slug]/page.tsx` | **app/quiz/r/[slug]/** | Nuevo (A.2) |

**Nota sobre `app/page.tsx`:** si tu home actual tiene contenido que quieres conservar (por ejemplo algo que ya estaba), revísalo antes de reemplazar. El nuevo es un home limpio Quiz-First. Las otras secciones (productos top, editorial, origen, labs, newsletter) llegan en Sesiones B-D y se montan dentro de este mismo `page.tsx` donde están los comentarios `TODO`.

**Nota sobre la plantilla de email:** `quiz-result.tsx` va en `lib/email/templates/` (junto a `newsletter-welcome.tsx`, `_layout.tsx`, etc.), NO en una carpeta `emails/`. Usa el `EmailLayout` compartido del repo para mantener coherencia visual (header wordmark + footer con dirección Medellín + soporte unsubscribe RFC 8058). El import en `quiz-subscribe.tsx` ya apunta a `@/lib/email/templates/quiz-result`.

## 4 · Imágenes — generar con Gemini Imagen 3

Ver `prompts-gemini-imagen3.md`. Genera las 6 imágenes de etapas + 1 OG, conviértelas a AVIF (squoosh.app), y súbelas a `/public/home/`:

- `etapa-bebe.avif`, `etapa-nino.avif`, `etapa-adolescente.avif`, `etapa-adulto.avif`, `etapa-embarazo.avif`, `etapa-adulto-mayor.avif`
- `og-home.jpg`

El sitio funciona sin las imágenes (solo se ven marcos vacíos en las cards). Puedes deployar primero y subir imágenes después.

## 5 · Tipografía serif

El código usa `Georgia` como serif (system font, cero latencia, ya disponible). Es una elección segura y elegante para titulares. Si más adelante quieres Fraunces (más carácter), la integramos vía `next/font/google` en una sesión de pulido — pero Georgia funciona perfecto para lanzar.

## 6 · Variables de entorno

Todo lo que el quiz necesita ya está en Vercel:
- `ANTHROPIC_API_KEY` (matching IA) ✅
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (rate limit) ✅
- `RESEND_*` (email de resultado) ✅ — recién configuradas en Sesión 0
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` ✅

Cero variables nuevas.

## 7 · Deploy y validación

1. Sube los 8 archivos a GitHub (commit: `Sprint 2 SA: Home Quiz-First + etapas de vida`)
2. Vercel deploya automático
3. Valida:
   - Abre `https://naturalvita.co` → debe verse el Quiz-Hero con la pregunta "¿Para quién buscas bienestar hoy?"
   - Elige una etapa → debe pasar al paso 2 (objetivos)
   - Elige un objetivo → debe mostrar "Seleccionando lo mejor…" y luego 3 productos con razón
   - Ingresa un email → debe llegar el email de resultado con cupón WELCOME10
   - Click "Solo quiero ver el catálogo" → va a /tienda
   - Scroll abajo → las 6 cards de etapas

## 8 · Cómo verificar que el matching IA y caché funcionan

Después de hacer un par de quizzes, revisa en Supabase:
```sql
SELECT cache_key, etapa, objetivo, hit_count, jsonb_array_length(recommendations) AS num_productos, created_at
FROM quiz_match_cache
ORDER BY created_at DESC;
```
- La primera vez que alguien hace "adulto + sueño" se crea una fila (gastó IA)
- La segunda vez con la misma combinación, `hit_count` sube y NO gasta IA (vino del caché)

## 9 · Costo estimado

- Cada quiz nuevo (combinación no cacheada): ~$0.003 USD con Haiku 4.5
- Combinaciones repetidas (caché 24h): $0
- Con 36 combinaciones posibles (6 etapas × 6 objetivos), tras el primer día casi todo viene de caché
- Costo mensual realista: <$5 USD aunque tengas miles de visitas

## 10 · Qué falta (Sesiones B-D)

- **B:** Productos top dinámicos + Editorial (3 artículos)
- **C:** Origen Everlife (2019/Zardrin) + Labs aliados
- **D:** Newsletter prominente + sellos confianza + QA mobile + Lighthouse

Todas se montan dentro de `app/page.tsx` donde están los comentarios TODO.

---

## Checklist de cierre Sesión A

- [ ] 8 archivos subidos a GitHub
- [ ] Build verde en Vercel
- [ ] 6 imágenes de etapas generadas y subidas a /public/home/
- [ ] OG image subida
- [ ] Quiz completa flujo: etapa → objetivo → 3 productos → email → cupón
- [ ] Email de resultado llega con cupón WELCOME10
- [ ] Escape "ver catálogo" funciona
- [ ] Cards de etapas linkean a /tienda?etapa=X
- [ ] Caché funcionando (hit_count sube en repeticiones)
