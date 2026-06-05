# NaturalVita — Contexto para Claude Code

> Documento de traspaso. Lo mantuvo Claude (chat) durante la construcción del
> sitio; ahora el trabajo de fondo continúa en Claude Code. Léelo completo antes
> de tocar código. **En los detalles está el éxito**: varias de las convenciones
> de abajo se aprendieron rompiendo el build en producción.

---

## 1. Qué es NaturalVita

E-commerce de suplementos y productos naturales en Colombia. Marca hija de
**Everlife Colombia S.A.S.** (fundada 2019; primer producto propio: Zardrin).
Modelo de **intermediación**: NaturalVita revende productos de laboratorios
colombianos (Sistema Natural, Cinat, Naturfar, Healthy America). Moneda única:
COP. Mercado: solo Colombia en Fase 1.

Visión omnicanal a futuro: tienda online → puntos naturistas físicos → IPS
(clínica con enfoque natural). Diferenciador central: **"del bebé al abuelo"**,
cobertura por etapa de vida. Dueño y director técnico: **Ader**
(adersneyder@gmail.com). Ader dirige producto y negocio; delega diseño e
implementación técnica al criterio de Claude ("usa tu lógica").

Soft launch objetivo: **3–4 de junio de 2026**.

---

## 2. Stack e infraestructura

- **Frontend/backend**: Next.js 15.5.18 (App Router) + TypeScript + Tailwind v4
- **DB / auth / storage**: Supabase — project_id **`qheynvhdjdnqywyaekpq`**
- **Hosting / CI**: Vercel (prj_XKOVcMohvrOAbsXDQU5PSVSITzSb), auto-deploy desde GitHub
- **Repo**: github.com/adersneyder/naturalvita (público, branch `main`)
- **Pagos**: Bold (tarjetas, PSE, Nequi, QR). `NEXT_PUBLIC_BOLD_ENVIRONMENT` conmuta TEST/PROD
- **Email (todo)**: Resend + react-email vía `sendEmail()` (`lib/email/client.ts`).
  **Pivote 14-may-2026**: se abandonó AWS SES (AWS negó la salida del sandbox); el
  adapter SES quedó dormido para reapelar en mes 2-3. La interfaz pública no cambió,
  así que plantillas y SAVIA siguen igual sobre Resend.
- **Email marketing**: SAVIA (motor propio de automatización — ver §7), sobre el mismo Resend
- **Rate limiting**: Upstash Redis
- **Analítica**: Vercel Analytics + Speed Insights, Microsoft Clarity (consent-gated)
- **SEO**: Ahrefs (vía MCP)

### Modelo de correo (definitivo)
- `info@naturalvita.co` — buzón humano público (Hostinger)
- `notificaciones@naturalvita.co` — Resend transaccional, sin buzón
- `hola@news.naturalvita.co` — marketing/SAVIA, sin buzón (subdominio aparte para
  aislar reputación)
- Reply-To por defecto a `info@`. DMARC `p=quarantine`, alineación estricta.

---

## 3. Convenciones CRÍTICAS (no negociables — rompen el build si se ignoran)

### 3.1 Estructura del repo: RAÍZ, no `src/`
El `tsconfig.json` tiene `"paths": { "@/*": ["./*"] }`. El alias `@/` apunta a la
**raíz**. Las carpetas viven en la raíz: `app/`, `components/`, `lib/`, `supabase/`,
`migrations/`, `public/`. **NUNCA** crear `src/`. Un import `@/lib/quiz/x` resuelve
a `lib/quiz/x` en la raíz. (Esto costó un deploy fallido y una carpeta huérfana.)

### 3.2 `tsconfig.json` excluye `supabase/`
Las Edge Functions son **Deno** (imports `jsr:...`). Si Next intenta compilarlas,
el build de Vercel **falla** con "Cannot find module 'jsr:@supabase/...'". El
`exclude` ya incluye `"supabase"`. No quitarlo. Si agregas Edge Functions, van
bajo `supabase/functions/` y NO deben entrar al type-check de Next.

### 3.3 Next.js 15: APIs async
`cookies()` es **async** (`await cookies()`). `headers()` también. Las páginas que
cargan datos del servidor son `async function`.

### 3.4 Vercel serverless: usar `after()` para trabajo diferido
Promesas sueltas se pierden al congelarse el lambda (causa retrasos de minutos en
emails/webhooks). Patrón: responder rápido y diferir el trabajo no urgente con
`import { after } from "next/server"`. Crítico en el webhook de Bold (ack temprano,
procesar orden/stock dentro de la respuesta, diferir emails con `after()`).

### 3.5 IVA discriminado hacia atrás
El precio del laboratorio = PVP (precio al consumidor, ya incluye IVA). El IVA se
**extrae** (`base = price / (1 + rate/100)`), nunca se suma encima.

### 3.6 Disponibilidad = solo `is_active`
Modelo de intermediación: `track_stock=false` casi siempre (sin tope de stock).
`is_active` controla visibilidad total. Activo sin inventario = sin tope; activo
con número = tope N. El stock es **señal** (badge "Agotado"), no filtro duro.

### 3.7 RLS: validar CRUD completo al crear tablas
Faltar políticas INSERT/UPDATE/DELETE causa fallos silenciosos (datos que no se
escriben sin error claro). Al crear una tabla nueva, definir todas las políticas.

### 3.8 Migraciones por MCP, nunca SQL manual en producción
Todas las migraciones se aplican vía la herramienta de Supabase (o `supabase`
CLI con migraciones versionadas). El repo tiene `migrations/` y `supabase/migrations/`.

### 3.9 Sin estas librerías
NO usar shadcn/ui, Framer Motion, ni Zustand. Coherencia visual y arquitectónica
mantenida a mano. Estado con React (useState/useReducer/Context).

### 3.10 Secretos: SIEMPRE el dueño, nunca en código ni en chat
API keys y credenciales las introduce Ader directamente en los paneles (Vercel,
Supabase Edge Function secrets, Supabase Vault). Nunca en Git, nunca hardcoded,
todo por `process.env.*`. `.env.local` en `.gitignore`.

---

## 4. Identidad visual

"Orgánico contemporáneo", minimalista y aireado. Base **blanca**, no recargada.
- Crema: `#FAF7F2` / `#F5F1E8`  · Bordes: `#E8DFD0`
- Texto: `#2A2722` / `#5C5048` / `#8B8881`
- Verde (natural/confianza): `#1E7D2E`  · Púrpura (acento/CTA): `#4A2E9A`
- Titulares: **Georgia serif** (en algunos componentes Fraunces para títulos de producto)
- Componentes del Home usan **CSS-in-JS scoped con clases `nv-*`** y hex literales
  (no tokens Tailwind), para coherencia total. Español colombiano neutro en todo el sitio.

---

## 5. Estado del catálogo (verificado hoy, 1-jun-2026)

- 299 productos totales, **101 activos** (todos con ficha IA completa)
- 6 productos `is_featured` (curaduría manual para la fila del Home)
- 27 productos con `equivalence_group` asignado (deduplicación del quiz)
- 11 suscriptores de newsletter; 5 pedidos (de prueba — limpiar antes del launch)

---

## 6. Lo que YA está construido y vivo en producción

Catálogo público `/tienda` (filtros nuup URL, FTS con tsvector+GIN, sitemap, robots).
Auth multi-método (Google OAuth + email/password + magic link). `/mi-cuenta` con
pestañas reales. Carrito, checkout single-page con DIVIPOLA (32 deptos + ~350
municipios), Bold embebido con anti-tampering SHA-256 + webhook HMAC idempotente.
Emails transaccionales por SES (react-email). Admin: `/pedidos`, `/clientes`,
`/cupones`, `/newsletter`, configuración. Wishlist, reseñas con estrellas, schema.org.
Páginas `/sobre-nosotros`, `/preguntas-frecuentes`, `/contacto`, 404. Newsletter con
cupón WELCOME10. `llms.txt`, OrganizationSchema.

### Home (Sprint 2, completo)
10 secciones: HeroQuiz, LifeStages (6 etapas), FeaturedProducts, ValueProps,
EverlifeOrigin (2019/Zardrin), PartnerLabs, TrustBadges, + newsletter en footer.
Headline "Bienestar que crece contigo". Componentes en `components/home/`.

### Quiz IA de recomendaciones (Sprint 2 SB, completo y verificado)
Motor pre-computado, objetivo-primero. Tablas: `quiz_needs` (8 activas:
digestion, belleza, defensas, huesos-musculos, calma, articulaciones, energia,
peso-metabolismo), `quiz_recommendations` (127 recos, tier direct/adjuvant, score,
suitable_stages, review_status), `quiz_results` (guardado), `quiz_reco_sync_runs`
(auditoría). Función `resolve_quiz(need_slug, stage, min_adjuvant_score)`.
- **Umbral**: máx 2 directas + 1 coadyuvante (≥45), tope 3, los dignos. Desempate:
  reseñas → novedad → id.
- **Filtros codificados** en el prompt: etapa+presentación (bebé no traga softgels;
  drops/syrup/powder pueden ser aptos niño/bebé; tópico apto todas). Seguridad:
  brandy/alcohol excluye bebé+embarazo; laxantes (sen/cáscara/ruibarbo) excluyen
  embarazo+niño; miel excluye bebé. Esencias florales → solo 'calma', lenguaje de
  acompañamiento, con su nombre real (Ader transfiere riesgo INVIMA al laboratorio).
- **Deduplicación por `equivalence_group`** (regla: principio activo + vía de consumo
  + composición; dos colágenos orales = mismo grupo, oral + crema conviven). Aplicada
  a todo el resultado, nunca dos del mismo grupo.
- **Recálculo automático** (verificado end-to-end): trigger de hash
  (`compute_reco_content_hash` + `trg_products_reco_hash`) marca productos "sucios"
  → vista `quiz_reco_dirty_products` → Edge Function **`quiz-reco-sync`** (v4,
  ACTIVE, verify_jwt=false, auth por header `x-sync-secret`) llama a Claude API,
  reclasifica y asigna grupo → crons `quiz-reco-debounce-sync` (*/15 min) y
  `quiz-reco-weekly-sync` (dom 3am). Botón admin: `QuizRecalcPanel`.
- **Secretos del quiz** (ya configurados): Vault tiene `project_url` y
  `quiz_sync_secret`; la Edge Function tiene `ANTHROPIC_API_KEY` y `QUIZ_SYNC_SECRET`.
- Código en `lib/quiz/` (types, queries, actions, admin-actions, `_internal/` con
  helpers autocontenidos: supabase, rate-limit, session). HeroQuiz en
  `components/home/HeroQuiz.tsx` (export named Y default).

### Fila de destacados del Home (recién hecho)
Función SQL **`get_home_featured(p_limit)`** con cascada de prioridad:
curado (`is_featured`) → más vendido 60d (pedidos `payment_status='paid'`) →
mejor calificado → novedad. `lib/home/home-featured.ts` la consume y mantiene el
tipo `PublicProductSummary`. Se auto-rellena con ventas reales post-launch.
Hay una RPC vieja `home_top_selling_product_ids` que quedó huérfana (no borrar aún).

### Catálogo público adicional (sesiones recientes)
- `/laboratorio` — índice con perfil de cada laboratorio aliado.
- Colección **"Más vendidos"** es *smart*: no se mantiene en `product_collections`,
  se computa en cada visita con cascada ventas reales (pedidos paid/shipped/
  delivered/completed) → `is_featured` → recientes, solo activos con imagen. Mismo
  origen de datos en el mosaico de portada de `/tienda` y en la página interior.
  Ver `listBestSellerProductIds()` / `listBestSellersThumbnails()` en
  `lib/catalog/listing-queries.ts`. Las demás colecciones destacadas sí viven en
  `product_collections`.

### Cimientos de correo (construidos — base de SAVIA)
El pivote a Resend (§2) dejó lista toda la fontanería de envío. Esto YA funciona:
- **Transporte unificado** `lib/email/client.ts`: `sendEmail()` sobre Resend, elige
  `from` por categoría, consulta `email_suppressions` antes de enviar, renderiza
  React → HTML **+ texto plano** automático, devuelve `messageId`.
- **Adapter de marketing** `lib/savia/transport/ses.ts` (nombre heredado, por debajo
  ya es Resend): inyecta `List-Unsubscribe` one-click (RFC 8058) y tags de flow/step/job.
- **Webhook de eventos** `/api/webhooks/resend`: firma Svix verificada; hard-bounce y
  complaint → `email_suppressions`. Los casos `email.opened`/`email.clicked` existen
  pero hoy solo loguean (pendiente: persistir en `email_events`, §7).
- **Suppression list** `email_suppressions` (bounce/complaint/unsubscribe), respetada
  en cada envío.
- **Desuscripción** `/newsletter/desuscribir/[token]` + plantilla `newsletter-welcome.tsx`.
- **Welcome actual**: al suscribirse se envía un único correo **directo** (en
  `app/(public)/_actions/newsletter.ts` y `quiz-subscribe.tsx`). Aún NO es un flow
  encolado — eso es justo lo que falta del motor (§7).

---

## 7. SAVIA — motor de automatización de marketing (LO QUE SIGUE, prioridad alta)

### Propósito (no perderlo de vista)
**Savia decide, Resend entrega.** Separación estricta de responsabilidades:
Savia es el motor propio de **automatización** de marketing — flows, segmentación,
triggers, lógica de qué enviar a quién y cuándo. Resend es el ESP (SMTP, cartero
físico). Reemplaza a Klaviyo (descartado por branding del tier gratuito y costo
PayG). Norte en dos palabras: **automático y eficiente**.

- **Automático / hands-off**: dispara ante eventos del negocio (suscripción, carrito
  abandonado, recompra a 30d, reactivación a 60d) sin que nadie apriete un botón.
  Modelo a imitar: `quiz-reco-sync` (triggers + crons, una vez definido no se toca).
- **Eficiente / segura para la reputación**: **todo pasa por una cola** (nunca envío
  directo en marketing), **throttle de warmup** (50/min mes 1 → 200/min mes 2),
  **suppression** respetada en cada envío, **texto plano** automático, tracking
  open/click **reaprovechando el webhook nativo de Resend** (sin pixel propio).
- **Aislamiento de reputación**: envío desde `hola@news.naturalvita.co` con **API key
  dedicada** de Resend, distinta a la transaccional de `notificaciones@`.

### Estado real (verificado en BD y código)
Los cimientos de envío ya están (ver §6: transporte unificado sobre Resend,
`email_suppressions`, webhook Svix, List-Unsubscribe básico, texto plano,
desuscripción, plantilla welcome). Lo que falta es el **motor de automatización**:
- **Existe en BD**: `email_suppressions`, `events`, `newsletter_subscribers`.
- **NO existe**: `email_jobs`, `email_flows`, `email_flow_steps`, `email_events`;
  Edge Function `savia-dispatch`; cron de dispatch; `lib/savia/flows/`; y la
  **serie** de bienvenida (hoy es un único correo directo, sin cola ni delay).
- **Renombrar**: `lib/savia/transport/ses.ts` → `resend.ts` (el archivo ya manda por
  Resend; el nombre es heredado del Sprint 1).
- **Infraestructura SES/SNS dormida**: el Topic SNS
  `arn:aws:sns:us-east-1:264911721808:naturalvita-ses-events` queda en stand-by por si
  se reapela el sandbox de AWS en mes 2-3. Hoy NO se usa.

### Esquema concreto de las 4 tablas (Sesión B)

**`email_flows`** — definición declarativa de un flow.
```
id text PK              -- slug (ej. 'welcome-series')
name text not null
trigger_event text      -- 'newsletter_subscribed', 'cart_abandoned_1h', ...
active boolean default true
config jsonb            -- parámetros del flow (delays default, ramas, etc.)
created_at timestamptz default now()
```

**`email_flow_steps`** — pasos ordenados dentro de cada flow.
```
id uuid PK
flow_id text FK email_flows(id) on delete cascade
step_order int not null
delay_seconds int default 0   -- relativo al paso anterior (0 = inmediato)
template text not null        -- slug del template (lookup en registry)
subject text not null
active boolean default true
unique(flow_id, step_order)
```

**`email_jobs`** — la cola.
```
id uuid PK
to_email text not null
subject text not null
template text not null
payload jsonb               -- datos para render del template
scheduled_at timestamptz not null
status text not null        -- 'queued' | 'sending' | 'sent' | 'failed' | 'skipped'
attempts int default 0
message_id text             -- id devuelto por Resend (correlación con eventos)
flow_id text                -- nullable (envíos one-off no son de un flow)
flow_step_id uuid           -- nullable
idempotency_key text unique -- '{flow}:{step}:{enrollment}', evita doble-encolado
last_error text
created_at timestamptz default now()
updated_at timestamptz default now()
```
Índice: `(status, scheduled_at)` para el dispatcher; índice en `message_id` para correlación de eventos.

**`email_events`** — sumidero del webhook de Resend.
```
id uuid PK
job_id uuid FK email_jobs   -- nullable (correlación por message_id)
message_id text             -- siempre presente
event_type text             -- 'sent'|'delivered'|'opened'|'clicked'|'bounced'|'complained'|'failed'
metadata jsonb              -- payload original del webhook
created_at timestamptz default now()
```
Índice: `(job_id, event_type)` y `(message_id)`.

**RLS** en todas: SELECT/INSERT/UPDATE solo `service_role`. Sin acceso público.

### Plan vigente (orden de construcción — Sesión B)
1. **Migración por MCP** (las 4 tablas + RLS + índices).
2. **Transporte** — renombrar `lib/savia/transport/ses.ts` → `resend.ts`, alinear a la
   interfaz `SaviaMessage` del brief (`to`, `subject`, `react`, `unsubscribeToken`,
   `flowId`, `jobId?`). Pequeño refactor de `sendEmail()` para aceptar API key
   alternativa según categoría → `RESEND_SAVIA_API_KEY` para marketing,
   `RESEND_API_KEY` sigue para transaccional. Reintento exponencial en 429 (máx 3).
3. **List-Unsubscribe RFC 8058 completo**: header con `mailto:hola@news...?subject=unsubscribe`
   **+** `https://naturalvita.co/api/savia/unsubscribe?token=…`. Nuevo endpoint POST
   `app/api/savia/unsubscribe/route.ts` (one-click, añade a `email_suppressions`).
   La página GET `/newsletter/desuscribir/[token]` ya existe y se mantiene para confirmación humana.
4. **Edge Function** `supabase/functions/savia-dispatch/index.ts` (Deno, imports `npm:` y `jsr:`):
   lee hasta 50 jobs con `status='queued'` y `scheduled_at <= now()`, render con
   `@react-email/render`, envía vía transporte, registra evento en `email_events`,
   actualiza job a `sent`+`message_id` o `failed`+`attempts++`. Si `attempts >= 3`, queda
   `failed` definitivo. Protegida por `Authorization: Bearer SAVIA_DISPATCH_TOKEN`.
5. **pg_cron cada 1 min** → `savia-dispatch` (con token desde Vault). Mismo patrón que `quiz-reco-debounce-sync`.
6. **Ingesta de eventos**: ampliar `/api/webhooks/resend` para **persistir**
   open/click/delivered en `email_events` (hoy solo loguean). Correlación por `message_id`.
7. **Welcome series declarativa**: insertar el flow en BD + crear `lib/savia/flows/welcome-series.ts`
   (sólo la definición tipada y el enrolador `enrollInFlow(slug, subscriber, ctx)`) +
   **reemplazar el envío directo** del welcome actual en `app/(public)/_actions/newsletter.ts`
   y `app/_actions/quiz-subscribe.tsx` por `enrollInFlow('welcome-series', ...)`.
8. **Validar**: mail-tester ≥9/10 e inbox real en Gmail/Outlook/Hotmail/Yahoo/iCloud.

### Variables de entorno a configurar (Vercel + Edge Function secrets)
- `RESEND_SAVIA_API_KEY` — API key dedicada de Resend para `news.naturalvita.co` (reputación aislada).
- `SAVIA_DISPATCH_TOKEN` — Bearer 256-bit aleatorio para proteger el endpoint del dispatcher.
- (Existentes que se siguen usando): `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`,
  `RESEND_FROM_MARKETING`, `RESEND_REPLY_TO`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### Aprendizaje aplicable
Reputación nueva del subdominio puede dar spam temporal en Outlook/Hotmail → warmup
gradual (50/min mes 1, escalar a 200/min mes 2). **Por eso todo va por la cola con
throttle**, nunca envío directo en marketing. Precisión de schemas: validar con logs
en vivo (un fallo silencioso de Klaviyo creó perfiles sin vincular en el pasado).

---

## 8. Sprint 4 (tras Savia): operación + GEO + launch

- Carrito abandonado (1h + 24h, cupón opcional) + flujo recompra 30d + reactivación 60d
- Dashboard `/admin/savia` (bounce, complaint, open, click, suscriptores, revenue)
- Alertas si bounce >2% o complaint >0.1%
- Blog `/blog` con schema.org Article + 5 artículos GEO iniciales
  ("Mejor magnesio para dormir Colombia 2026", "Vitamina D Colombia",
  "Magnesio glicinato vs citrato", "Multivitamínico confiable Colombia",
  "INVIMA por qué importa") — cada uno H1 pregunta, respuesta 40-60 palabras, tabla,
  autor declarado, schema.org
- Hardening: rate limit Upstash + headers OWASP (securityheaders.com ≥A)
- Auditoría: tabla `audit_log` + `/admin/auditoria`
- Hito 4 MVP: `/admin/precios/sincronizar` (lector PDF/Excel con Claude API,
  matching semántico con score de confianza, buckets auto/aprobar/descartar)

---

## 9. Pendientes de Ader (validación manual, fuera de código)

- Confirmados como hechos por Ader: datos Everlife en `lib/legal/company-info.ts`,
  QA de Bold (montos 555001/002/020), validación auth multi-método en producción,
  `is_featured` poblado.
- **Antes del launch**: borrar los 5 pedidos de prueba (ensucian "más vendido" del
  Home y métricas). AWS Configuration Set + SNS HTTPS subscription si se retoma SES
  para algo de Savia.

---

## 10. Backlog post-launch (no construir todavía)

- Guest checkout (cuenta progresiva, touchpoints sin fricción)
- Chatbot Claude embebido (tablas `chat_conversations`/`chat_messages` ya existen)
- Tracking de visitante en tiempo real (`visitors`/`events` ya existen)
- Agente operador con capacidades tipadas, niveles de autonomía, guardrails
- DIAN/Alegra (factura electrónica), APIs Coordinadora/Servientrega (guías)
- Healthy America: pedir CSV al lab antes de intentar scraper/Playwright
- Mercado Pago como alternativa a Bold (Wompi descartado permanentemente)
- Hito 1.3 (pausado): gestión de invitaciones admin (`admin_invitations` existe)

---

## 11. Flujo de trabajo con Ader

- Idioma: español colombiano neutro, prosa densa, sin paja visual ni emojis.
- Decisiones antes que opciones: si hay recomendación técnica clara, darla primero;
  alternativas como contexto, no indecisión. Trade-offs honestos.
- Código completo, no fragmentos. Build verde (0 errores TS) antes de cerrar.
- Sprint tracker: `naturalvita-dashboard.html` (artifact HTML standalone con
  localStorage, 5 tabs). Regenerar con `lastSyncedAt` nuevo cuando Ader pida
  "dashboard"/"update"/"cómo va".
- Throttle de scraping/redownload: 1 producto a la vez (más causó problemas).
- Tras decisión importante, actualizar memoria/contexto y resumir estado.

---

## 12. Glosario de rutas clave

```
app/(public)/page.tsx              Home (async, carga needs del quiz + featured)
components/home/                   Secciones del Home (HeroQuiz, LifeStages, ...)
lib/quiz/                          Motor del quiz (queries, actions, _internal/)
lib/home/home-featured.ts          Fila de destacados (usa get_home_featured)
lib/legal/company-info.ts          Datos legales Everlife
supabase/functions/quiz-reco-sync/ Edge Function de reclasificación (Deno)
emails/                            Templates react-email
migrations/ y supabase/migrations/ Migraciones SQL
```

---

## 13. Funciones SQL relevantes (Supabase)

- `resolve_quiz(need_slug, stage, min_adjuvant_score=45)` — resultado del quiz, deduplica
- `get_home_featured(p_limit=8)` — fila destacados con cascada
- `compute_reco_content_hash(product_id)` — huella de contenido para detectar cambios
- `trigger_quiz_reco_sync(source)` — dispara la Edge Function si hay productos sucios
- `home_top_selling_product_ids(p_limit, p_days)` — huérfana (la reemplazó get_home_featured)

Crons activos: `quiz-reco-debounce-sync` (*/15 * * * *), `quiz-reco-weekly-sync` (0 3 * * 0).
