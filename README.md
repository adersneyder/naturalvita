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
- **Email transaccional**: AWS SES (`@aws-sdk/client-sesv2`) + react-email
- **Email marketing**: SAVIA (motor propio, en construcción — ver §7). Transporte vía Resend
- **Rate limiting**: Upstash Redis
- **Analítica**: Vercel Analytics + Speed Insights, Microsoft Clarity (consent-gated)
- **SEO**: Ahrefs (vía MCP)

### Modelo de correo (definitivo)
- `info@naturalvita.co` — buzón humano público (Hostinger)
- `notificaciones@naturalvita.co` — SES transaccional, sin buzón
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

---

## 7. SAVIA — motor de email marketing propio (LO QUE SIGUE, prioridad alta)

Reemplaza a Klaviyo (descartado por branding + costo). Sistema propio en el repo,
datos en Supabase, envío vía Resend desde `hola@news.naturalvita.co` (API key
dedicada, reputación de subdominio aislada de la transaccional).

### Estado actual de Savia
- **YA existe** (de sesión previa): tablas `events` y `email_suppressions`.
- **FALTA crear**: `email_jobs`, `email_flows`, `email_flow_steps`, `email_events`.

### Plan de construcción (orden sugerido)
1. **Migración**: `email_jobs` (cola: scheduled_at, status, message_id, to, template,
   payload), `email_flows` (declarativo), `email_flow_steps`, `email_events` (open/
   click/bounce/complaint/delivered). RLS completa en todas.
2. **Transporte**: `lib/savia/transport/resend.ts` — `send(message)` con tracking de
   message_id y backoff ante 429. API key dedicada de Savia.
3. **Engine**: Edge Function `supabase/functions/savia-dispatch` que lee
   `email_jobs` con `scheduled_at <= now()`, envía, marca, registra evento. Throttle
   configurable (mes 1: **50/min** — warmup de reputación del subdominio nuevo).
4. **Cron**: pg_cron cada 1 min → `savia-dispatch`.
5. **Tracking**: `app/api/savia/open/[token]/route.ts` (pixel, filtra prefetch por
   User-Agent) y `app/api/savia/click/[token]/route.ts` (302 al destino).
6. **Webhook Resend**: `app/api/webhooks/resend/route.ts` con HMAC. Persiste eventos;
   hard bounces y complaints → `email_suppressions`.
7. **List-Unsubscribe RFC 8058**: header + `app/api/savia/unsubscribe`.
8. **Plain-text auto** desde react-email (cada envío con text y html).
9. **Welcome series**: template `emails/newsletter-welcome.tsx` (versión Savia) +
   flow declarativo `lib/savia/flows/welcome-series.ts` (trigger newsletter_subscribed
   → email 1 inmediato → delay 3d → email 2). Reemplazar `subscribeToNewsletter`
   para que encole en `email_jobs`.
10. **Validar**: mail-tester ≥9/10, e inbox real en Gmail/Outlook/Hotmail/Yahoo/iCloud.

### Aprendizaje aplicable
Reputación nueva del subdominio puede dar spam temporal en Outlook/Hotmail → warmup
gradual (50/min mes 1, escalar a 200/min mes 2). API format precision: validar
schemas con logs en vivo (un fallo silencioso de Klaviyo creó perfiles sin vincular).

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
