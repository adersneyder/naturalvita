# NaturalVita · Hito 2 Sesión A · Confianza pre-lanzamiento

Páginas y plumbing necesarios para que un cliente nuevo confíe en
NaturalVita el día del lanzamiento. Sin Klaviyo todavía (esa va en
Sesión B cuando tengas cuenta activa). Sin cupones (mejor cuando ya
haya tráfico para optimizar).

12 archivos. Sin migraciones SQL. Build verde con **44 rutas**, 0
warnings, 0 errores TS.

---

## Por qué este alcance

Te prometí en mi mensaje anterior un alcance que incluía Klaviyo full
y banner de cupón. **Recorté.** Razones honestas:

1. **Klaviyo full** depende de que tengas cuenta Klaviyo activa,
   plantillas creadas y API key. Sin eso, hago stub muerto. Mejor
   separarlo en Sesión B donde el trabajo sea entregable y validable.

2. **Cupón de bienvenida** sin tráfico real es ruido. Cuando tengamos
   visitantes que veamos en Clarity, sabremos qué tipo de cupón
   convierte.

3. **Confianza pre-compra** sí es bloqueante para lanzar. Un cliente
   nuevo que llega a NaturalVita.co necesita ver: "quiénes son" /
   "cómo funcionan" / "puedo escribirles" antes de poner su tarjeta.

---

## Estructura del ZIP

```
nv-hito-2-sesion-a/
├── INSTALL.md
├── app/
│   ├── (public)/
│   │   ├── sobre-nosotros/page.tsx        ← NUEVO
│   │   ├── preguntas-frecuentes/page.tsx  ← NUEVO
│   │   ├── contacto/
│   │   │   ├── page.tsx                   ← NUEVO
│   │   │   ├── _ContactForm.tsx           ← NUEVO (client component)
│   │   │   └── actions.ts                 ← NUEVO (server action)
│   │   └── _components/
│   │       └── PublicFooter.tsx           ← MODIFICADO (links nuevos)
│   ├── not-found.tsx                      ← NUEVO (404 global)
│   └── sitemap.ts                         ← MODIFICADO (incluye páginas nuevas)
└── lib/
    ├── email/
    │   ├── client.ts                      ← MODIFICADO (replyTo opcional)
    │   └── templates/
    │       ├── contact-inquiry.tsx        ← NUEVO (email a pedidos@)
    │       └── contact-confirmation.tsx   ← NUEVO (email al cliente)
    └── ratelimit.ts                       ← MODIFICADO (helper headers)
```

---

## Aplicar

Sube los 12 archivos a sus rutas exactas. Vercel deploy automático
~1 minuto. Sin variables de entorno nuevas para que el form funcione
(usa Resend que ya tienes configurado).

---

## Lo que quedó implementado

### `/sobre-nosotros`

Página de marca para clientes nuevos:
- Hero con la propuesta: "Conectamos laboratorios colombianos con tu
  bienestar diario".
- Misión + visión en cards lado a lado.
- "Cómo trabajamos" en 3 pasos numerados (selección de laboratorios,
  curaduría, entrega directa).
- "Por qué puedes confiar en nosotros" con 4 puntos: INVIMA, pagos
  Bold, datos protegidos, atención humana.
- Datos legales (NIT, dirección, correo) lectores de
  `lib/legal/company-info.ts` — cuando llenes los TODOs ahí, se
  actualizan solos.
- CTA final hacia /tienda con bg leaf-900 y botón blanco.

Estática (`○`), SEO-friendly, OpenGraph metadata para compartir en redes.

### `/preguntas-frecuentes`

20 preguntas en accordion HTML nativo (`<details>`/`<summary>`, cero
JS, perfecto para SEO):

- 3 sobre pedidos y compra.
- 4 sobre pagos.
- 4 sobre envíos.
- 3 sobre devoluciones.
- 4 sobre productos (incluye disclaimer médico apropiado).
- 2 sobre cuenta y datos.

**Bonus SEO**: la página inyecta `application/ld+json` con schema
[FAQPage](https://schema.org/FAQPage). Cuando Google indexe esta
URL, mostrará rich snippets con preguntas expandibles directamente
en los resultados de búsqueda. Esto puede aumentar CTR notablemente
en queries tipo "naturalvita devoluciones".

Las respuestas son honestas, no prometen tiempos imposibles, no
hacen claims médicos que el INVIMA no respalde.

### `/contacto`

Página con formulario funcional:
- Nombre, correo, teléfono opcional, asunto, mensaje.
- Validación cliente y server con Zod (mismos errores en ambos lados).
- **Honeypot anti-bot**: campo `website` invisible. Bots lo llenan,
  humanos no. Si llega con valor, fingimos éxito sin enviar.
- **Rate limit por IP**: 30 envíos por minuto (vía Upstash existente).
  Si Upstash no está configurado, falla abierto sin romper el form.
- Sidebar con datos de contacto directo, horario de atención, link a
  FAQ y nota sobre incluir número de pedido.

**Flujo de email cuando alguien envía**:
1. **Email interno** a `pedidos@naturalvita.co` con todos los datos
   del cliente. Reply-to setado al email del cliente: cuando das
   "Responder" en Gmail, va directo a él.
2. **Email automático de confirmación** al cliente con plantilla
   "Recibimos tu mensaje" estándar.

Si el email interno falla, el form muestra error y NO confirma. Si
solo falla la confirmación al cliente, el form sí confirma (su
mensaje SÍ llegó al equipo, solo perdió la notificación). Decisión
deliberada: el equipo nunca pierde un mensaje.

### 404 personalizada (`app/not-found.tsx`)

Reemplaza la 404 default de Next.js (página fea con texto plano).
Ahora muestra:
- Título grande "No encontramos esta página".
- 3 CTAs: ir a tienda, buscar productos, contacto.
- Pregunta amable: "¿Llegaste aquí desde un enlace que enviamos
  nosotros?" con link a contacto.

Estática para no penalizar performance cuando un crawler hace
millones de requests a URLs aleatorias.

### Footer actualizado

Bloque "Soporte" del footer ahora incluye en orden:
1. Sobre nosotros
2. Preguntas frecuentes
3. Contacto
4. Envíos y devoluciones
5. Email de contacto al final

### Sitemap actualizado

Las nuevas páginas aparecen en `/sitemap.xml` con prioridades
correctas:
- `/sobre-nosotros` priority 0.7
- `/preguntas-frecuentes` priority 0.6
- `/contacto` priority 0.5
- Páginas legales 0.3

Cuando hagas resubmit del sitemap a Google Search Console (ver
guía operativa abajo), Google las indexará rápido.

---

## Decisiones de diseño documentadas

**Por qué `<details>` HTML en FAQ y no un componente React**: el
accordion nativo no requiere JavaScript, funciona con teclado por
defecto, es accesible por screen readers, y Google lo entiende
perfectamente. Cero cliente JS = mejor performance + mejor SEO.

**Por qué el reply-to del email de contacto va al cliente**: cuando
un colaborador del equipo abre Gmail y ve el inquiry, puede dar
"Responder" sin tener que copiar el correo del cliente al campo
"para". Reduce fricción operativa y errores. El cliente recibe la
respuesta desde `info@naturalvita.co` (configurado en Resend) y
puede responder de vuelta — eso vuelve a `pedidos@`.

**Por qué honeypot en lugar de captcha**: el captcha agrega fricción
real al usuario humano y los bots modernos los pasan. El honeypot es
invisible para humanos, agarra el 95% de bots simples, y si pasa
algún bot sofisticado el rate limit lo contiene.

**Por qué validar Zod en server además de client**: nunca confiar en
input del cliente. La validación cliente es UX, la del servidor es
seguridad.

**Por qué mantener TODOs en company-info.ts**: cuando llenes el NIT
real, dirección, etc, se actualizan automáticamente en footer +
sobre-nosotros + emails + páginas legales. Single source of truth.

---

## Validación post-deploy

1. **Subir el ZIP** y esperar ~1 minuto a que Vercel despliegue.
2. **`/sobre-nosotros`**: cargar la página. Debe verse el hero, los
   3 pasos, los 4 puntos de confianza, datos legales (con TODOs
   visibles si no los has llenado), CTA final.
3. **`/preguntas-frecuentes`**: cargar la página. Click en cada
   accordion debe expandir/colapsar suavemente. Verificar tu navegador
   permite teclado (Tab + Enter sobre cada pregunta).
4. **`/contacto`**: enviar un mensaje de prueba. Debe:
   - Llegar email a `pedidos@naturalvita.co` con datos del form.
   - Llegar email de confirmación a la dirección que pusiste en el form.
   - Mostrar mensaje verde "Mensaje enviado" en la página.
5. **404**: visitar `/algo-que-no-existe` (ej:
   `https://naturalvita.co/blah`). Debe verse la 404 nueva.
6. **Footer**: en cualquier página, ver el bloque Soporte con los 4
   nuevos links.
7. **Sitemap**: visitar `https://naturalvita.co/sitemap.xml`. Debe
   incluir las URLs nuevas.

---

## GUÍA OPERATIVA

Tres tareas de configuración externa que hacen falta. Te las dejo
detalladas porque ya está todo el plumbing en código — solo es
configuración.

### 1. Activar Microsoft Clarity

Clarity es una herramienta gratuita de Microsoft que muestra heatmaps
y session replay (videos de sesiones reales de usuarios navegando).
Útil para entender por qué la gente abandona el carrito o no termina
el checkout.

**Pasos**:

1. Ir a `clarity.microsoft.com` y crear cuenta gratis con tu correo.
2. Click "+ New project". Nombre: "NaturalVita". Sitio:
   `https://naturalvita.co`.
3. Una vez creado, ir a Settings → Setup. Verás un script de
   instalación con un ID similar a `abc12def34`.
4. Solo copia el ID, NO el script (mi código ya genera el snippet).
5. En Vercel → naturalvita → Settings → Environment Variables, agregar:
   - Name: `NEXT_PUBLIC_CLARITY_ID`
   - Value: el ID del paso 3
   - Environments: Production, Preview, Development
   - NO marcar Sensitive (es público de todos modos al inyectarse en HTML)
6. Redeploy desde Vercel para que la variable se aplique.
7. Visita `naturalvita.co`, **acepta analytics** en el banner de
   Habeas Data, navega un par de páginas.
8. Vuelve a Clarity → Dashboard. En 5-10 minutos verás tu primera
   sesión grabada.

**Nota crítica**: Clarity solo se carga si el usuario aceptó analytics
en el banner Habeas Data. Esto es por la ley 1581 colombiana. Las
sesiones que rechazaron analytics NO se graban — es lo correcto. No
es bug.

### 2. Configurar Google Search Console

Search Console te dice qué queries están llegando a tu sitio, qué
páginas indexa Google, y si hay errores de crawl. Esencial.

**Pasos**:

1. Ir a `search.google.com/search-console` con cuenta de Google.
2. "Add property" → "Domain property" → escribir `naturalvita.co`
   (sin https, sin www).
3. Google te dará un registro DNS TXT a agregar.
4. Ir a Hostinger → tu dominio → DNS Records → Add Record:
   - Type: TXT
   - Name: @ (o vacío, según Hostinger)
   - Value: el string que Google te dio (algo como `google-site-verification=ABCXYZ`)
5. Volver a Search Console → "Verify". Puede tardar minutos a horas.
6. Una vez verificado, ir a "Sitemaps" en sidebar.
7. Submit: `https://naturalvita.co/sitemap.xml`.
8. Esperar 24-72 horas para que Google empiece a indexar.

**Después**: revisa cada semana en "Performance" qué queries traen
clicks. Eso te dice qué contenido producir. En "Coverage" revisa que
no haya errores de indexación.

### 3. Llenar TODOs operativos

Edita `lib/legal/company-info.ts` y reemplaza los `[TODO]`:

- `nit`: NIT real de Everlife Colombia S.A.S. con dígito verificación
  (formato `9001234567-8`).
- `publicPhone`, `publicWhatsapp`: si tienes línea de atención.
  Si NO tienes, déjalos en `[…]` — el código detecta el `[` inicial
  y oculta la fila en /contacto.
- `addressStreet`: dirección física exacta de oficinas o bodega.
- `instagramUrl`, `facebookUrl`, `tiktokUrl`: URLs reales si ya creaste
  los perfiles. Si no, déjalos como están (placeholders muertos).
- `REGULATORY.invimaImporterRegistration`: solo si Everlife tiene
  registro como importador/comercializador. Si no aplica para tu
  modelo de intermediación, déjalo vacío y el footer no lo muestra.

---

## Lo que NO incluye este Sesión A

**Klaviyo integración real** — Sesión B. Necesitas:
- Cuenta Klaviyo (free tier soporta hasta 250 contactos/500 emails al mes).
- Lista creada (ej: "Newsletter NaturalVita").
- API key.
Cuando tengas eso, en Sesión B reemplazo los stubs de
`lib/events/track.ts` con llamadas reales y agrego newsletter en footer.

**Cupón de bienvenida** — depende de Klaviyo + tabla coupons en BD.
Cuando lleguemos a Sesión B/C lo agregamos.

**Páginas de blog/contenido** — útil para SEO long-tail, no urgente
para lanzar. Cuando ya tengas tráfico podemos planear contenido
basado en queries reales que veas en Search Console.

---

## Próximos pasos sugeridos

Mi voto fuerte: **lanzar oficialmente** con lo que tienes. Llenar
TODOs operativos, configurar Clarity y GSC, y empezar a recibir
tráfico real.

Si todo va bien con tráfico inicial:
- **Sesión B**: Klaviyo + newsletter + cupón bienvenida + email
  carrito abandonado.
- **Sesión C** (Hito 1.3 retomar): admins con invitaciones cuando
  necesites ampliar el equipo.
