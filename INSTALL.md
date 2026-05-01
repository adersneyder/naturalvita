# NaturalVita · Hito 1.7 Sesión A · Auth de cliente, /carrito, /mi-cuenta, legal y Habeas Data

Esta sesión sienta la base del Hito 1.7 (carrito y checkout). Aquí no
construimos checkout todavía: eso es Sesión B (formularios y dirección) y
Sesión C (Bold + envíos + Resend SMTP). Pero todo lo previo al checkout —
identidad del cliente, página completa del carrito, banner Habeas Data y
páginas legales — queda listo y deployable.

Build limpio: 30 rutas, 0 errores TS.

---

## 0. Estado previo asumido

- Hito 1.6 Sesión C aplicada y desplegada en producción.
- `npm install` ya ejecutado con todas las deps de Hito 1.6.
- Bulks IA corriendo en paralelo en `/admin/productos`.

**No hay deps nuevas en esta sesión.** Tampoco migraciones SQL: las
policies de `customers`, `addresses`, `carts`, `cart_items`, `orders` ya
están en Supabase con las reglas correctas (verifiqué via MCP antes de
codear). Aplicas el ZIP, build, commit y deploy.

---

## 1. Aplicar este paquete

Desde la raíz del repo:

```bash
cp -r nv-hito-1.7-sesion-a/. ./
```

### Archivos nuevos (14)

Identidad y consentimiento (`lib/`):
- `lib/legal/company-info.ts` — constantes de Everlife (NIT, dirección, contacto).
- `lib/auth/customer-auth.ts` — `requireCustomer()` y `getCurrentCustomer()` con auto-onboarding.
- `lib/cart/use-consent.ts` — hook + storage del consentimiento Habeas Data.

Componentes públicos:
- `app/(public)/_components/HabeasDataBanner.tsx` — banner sticky bottom con configuración granular (esencial / analítica / marketing).
- `app/(public)/_components/AccountLink.tsx` — icono de cuenta del header con estado reactivo a auth.

Páginas:
- `app/(public)/iniciar-sesion/page.tsx` + `_LoginForm.tsx` — magic link para clientes (separado del admin).
- `app/(public)/mi-cuenta/page.tsx` + `_LogoutButton.tsx` — dashboard mínimo del cliente.
- `app/(public)/carrito/page.tsx` + `_CartPageContent.tsx` — carrito en página completa.
- `app/(public)/legal/privacidad/page.tsx` — política de tratamiento de datos (ley 1581/2012).
- `app/(public)/legal/terminos/page.tsx` — términos y condiciones.
- `app/(public)/legal/envios/page.tsx` — política de envíos y devoluciones.

### Archivos modificados (6)

- `app/_components/SiteAnalytics.tsx` — Microsoft Clarity solo carga si el
  usuario aceptó "analytics" en el banner. Vercel Analytics + Speed Insights
  siguen siempre activos (anónimos).
- `app/(public)/layout.tsx` — monta `<HabeasDataBanner>`.
- `app/(public)/_components/PublicHeader.tsx` — agrega `<AccountLink>` y
  arregla los enlaces rotos del nav (`/colecciones` y `/laboratorios` que
  daban 404). El nav ahora es Tienda · Buscar · Envíos.
- `app/(public)/_components/PublicFooter.tsx` — footer enriquecido con
  cuatro columnas (marca, catálogo, soporte, legal), redes sociales, y
  bottom bar con NIT, dirección y registro INVIMA.
- `app/(public)/_components/CartDrawer.tsx` — botón "Proceder al pago"
  ahora es link activo a `/carrito` (antes estaba deshabilitado).
- `app/globals.css` — agrega keyframes `slide-in-up` para el banner.

---

## 2. Llenar datos de Everlife

**Importante antes del lanzamiento público.** Abre `lib/legal/company-info.ts`
y reemplaza los placeholders marcados con `[TODO]`:

```ts
nit: "[NIT pendiente]",                 // → "900.123.456-7"
publicPhone: "[Teléfono pendiente]",    // → "+57 300 123 4567"
publicWhatsapp: "[WhatsApp pendiente]", // idem
addressStreet: "[Dirección pendiente]", // → "Calle 100 # 10-20, Oficina 401"
```

Si Everlife tiene registro INVIMA propio (importador/comercializador),
ponlo en `REGULATORY.invimaImporterRegistration`. Si no aplica, déjalo
vacío y el footer no lo muestra. Las URLs de Instagram/Facebook ya están
con `naturalvita.co` como handle — confirma que esos perfiles existen o
ajústalos.

Estos datos aparecen en el footer y en las tres páginas legales. Si dejas
los placeholders, las páginas funcionan pero muestran texto de marcador
visible. Útil para QA, inaceptable para producción.

---

## 3. Build local

```bash
npm run build
```

Espera ver:

```
├ ○ /carrito                             3.57 kB         114 kB
├ ○ /iniciar-sesion                      1.56 kB         166 kB
├ ƒ /mi-cuenta                             580 B         169 kB
├ ○ /legal/envios                          182 B         106 kB
├ ○ /legal/privacidad                      182 B         106 kB
├ ○ /legal/terminos                        182 B         106 kB
```

30 rutas en total.

---

## 4. Probar en local

```bash
npm run dev
```

Flujo de validación end-to-end del cliente:

1. **Banner Habeas Data**: abre `/` en navegador limpio (o `localStorage.clear()`
   en consola). Aparece banner abajo. Prueba "Personalizar" → toggle de
   analytics → "Guardar". El banner desaparece. Si recargas, no vuelve.
   En `localStorage` debe estar `nv:consent:v1` con tu decisión.

2. **Login cliente**: ve a `/iniciar-sesion`, ingresa tu email, recibes
   magic link en correo, click. Te lleva a `/mi-cuenta` mostrando tu email
   y los cards "Próximamente". Verifica que en Supabase ahora hay una fila
   nueva en `customers` con tu `id` y `email`.

3. **Cuenta visible en header**: el icono de usuario en el header tiene
   ahora un punto verde indicando sesión activa. Click → `/mi-cuenta`. En
   `/mi-cuenta` botón "Cerrar sesión" → vuelves a home con el icono sin
   punto.

4. **Carrito completo**: agrega 2-3 productos desde la tienda, abre el
   drawer, click "Ver carrito y pagar". Estás en `/carrito` con los items,
   stepper de cantidad funcional, eliminar item, vaciar carrito, link
   "Seguir comprando". Botón "Continuar al pago" lleva a `/checkout` (que
   por ahora dará 404 porque la armamos en Sesión B).

5. **Legal**: recorre `/legal/privacidad`, `/legal/terminos`, `/legal/envios`.
   Verifica que aparecen los placeholders de Everlife — eso te recuerda
   llenar `lib/legal/company-info.ts` antes de producción.

6. **Footer**: scroll hasta el footer. Cuatro columnas, redes, bottom bar
   con NIT y dirección. Todos los links funcionan.

---

## 5. Despliegue

```bash
git add .
git commit -m "feat(hito-1.7/A): auth cliente magic link + /carrito + /mi-cuenta + Habeas Data banner + paginas legales + footer enriquecido"
git push origin hito-1.7-sesion-a   # o la rama que estés usando
```

En el preview de Vercel:
- Confirma que `/iniciar-sesion` funciona y que el magic link llega y
  redirige correctamente.
- Confirma que el banner aparece en visita limpia.
- Si pusiste `NEXT_PUBLIC_CLARITY_ID` en Vercel, **rechaza analytics** en
  el banner y verifica que el script de Clarity NO carga (Network tab).
  Luego acepta analytics y verifica que carga. Esa es la prueba clave de
  cumplimiento Habeas Data.

---

## 6. Pendientes para Sesión B y siguientes

**Sesión B** (próxima): formulario de checkout con datos de contacto y
dirección, catálogo DIVIPOLA de departamentos y ciudades, validación con
Zod, persistencia en `addresses`, paso de revisión.

**Sesión C**: integración Bold por API REST (3DS, PSE, Nequi, QR),
shipping_rates por departamento, webhook `/api/webhooks/bold`, Resend SMTP
con templates transaccionales.

**Sesión D**: `/pedido/[order_number]` con tracking, /mi-cuenta enriquecida
con historial real de pedidos y direcciones guardadas, eventos a Klaviyo.

**Pendiente externo (tú)**: bulk de generación IA de las 299 fichas, llenar
los `[TODO]` de `lib/legal/company-info.ts` con datos reales de Everlife.

---

## Apéndice: notas técnicas

- **Auto-onboarding de cliente**: cuando un user entra por primera vez a
  `/mi-cuenta`, `requireCustomer()` detecta que no existe en `customers`,
  lo crea automáticamente con `id = auth.uid()` y `email`. Las policies
  de RLS lo permiten (verificadas en BD).
- **Aislamiento admin/cliente**: el mismo sistema de auth de Supabase
  sirve para ambos. La diferencia es la tabla: admins están en
  `admin_users`, clientes en `customers`. `getAdminUser()` y
  `requireCustomer()` filtran por su tabla. Si un admin entra a
  `/mi-cuenta`, se crea fila en `customers` para él (es lo correcto: él
  también puede comprar).
- **Banner Habeas Data**: el consentimiento vive en `localStorage`. Si en
  el futuro queremos consent management server-side (sincronizado entre
  dispositivos), es una migración pequeña: lectura desde `customers.preferences`
  cuando hay sesión, fallback a localStorage cuando no.
- **Sin shadcn**: mantengo la regla de Hito 1.6 — sigo construyendo
  componentes propios alineados con tokens leaf/earth/iris y Fraunces+Inter.
