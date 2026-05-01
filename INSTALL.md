# NaturalVita · Hito 1.7 Sesión B · Checkout (formulario + DIVIPOLA + persistencia)

Esta sesión arma el formulario completo de checkout: contacto, dirección
con catálogo DIVIPOLA, validación con Zod, server actions que persisten
en `customers` y `addresses`, paso de revisión, sidebar con resumen.

El botón "Confirmar y pagar" queda visible pero **deshabilitado** porque
Bold se integra en Sesión C. Esto permite hacer QA del flujo completo
hasta el punto del pago sin riesgo de checkout incompleto en producción.

Build limpio: 31 rutas, 0 errores TS. Ruta nueva: `/checkout` (22.3 kB).

---

## 0. Estado previo asumido

- Sesión A del Hito 1.7 aplicada y desplegada (preview verde).
- `lib/legal/company-info.ts` ya con datos reales de Everlife (o con
  placeholders, no bloquea el checkout, solo se ve mal en footer).
- Bulks IA siguen corriendo en paralelo en `/admin/productos`.

---

## 1. Estructura del ZIP

Antes de subir, verifica que la descompresión preservó esta estructura:

```
nv-hito-1.7-sesion-b/
├── INSTALL.md
├── package.json                                        ← MODIFICADO
├── app/
│   └── (public)/
│       └── checkout/
│           ├── page.tsx                                ← NUEVO
│           ├── _CheckoutClient.tsx                     ← NUEVO
│           ├── _OrderSummarySidebar.tsx                ← NUEVO
│           └── actions.ts                              ← NUEVO
└── lib/
    └── checkout/
        ├── schemas.ts                                  ← NUEVO
        └── divipola-data.ts                            ← NUEVO
```

Nota: la carpeta `(public)` con paréntesis es un route group de Next.
Es importante que GitHub respete los paréntesis en la ruta.

---

## 2. Subir a GitHub

Sigue tu flujo manual habitual. Sugerencia para evitar archivos perdidos:

1. **Sube `package.json` primero** desde la raíz del repo (es solo el archivo
   modificado). En el commit pon "deps: add zod 3.23.8".
2. Crea (o navega a) la carpeta `app/(public)/checkout/` y sube los 4
   archivos del checkout.
3. Crea (o navega a) la carpeta `lib/checkout/` y sube los 2 archivos.

Después de subir, abre `app/(public)/checkout/` en GitHub web y cuenta:
debe haber 4 archivos. Igual con `lib/checkout/`: 2 archivos.

---

## 3. Vercel: instalar nueva dependencia

`zod` es la única dep nueva. Vercel detecta el cambio en `package.json`
durante el build automático y la instala. No hay que tocar nada en el
panel de Vercel.

Si en local quieres probar antes:

```bash
npm install
npm run build
```

Espera ver en el build:

```
├ ƒ /checkout                            22.3 kB         133 kB
```

---

## 4. Cómo funciona el flujo

### Auth gate
La página `/checkout` es server component que llama `requireCustomer()`.
Si no hay sesión, redirige a `/iniciar-sesion?next=%2Fcheckout`. Después
del magic link, vuelve directo al checkout.

### Carrito vacío
Detectado en cliente (porque el carrito vive en `localStorage`). Si está
vacío, redirige a `/carrito` automáticamente desde `useEffect`.

### Sección 1 — Contacto
El email viene fijo desde la sesión. El cliente edita nombre, teléfono,
tipo y número de documento, y opt-in marketing. Al guardar, los datos
persisten en `customers` vía server action.

Si el cliente ya tenía datos guardados (de un checkout anterior), el form
viene precargado y la sección aparece como "completada" desde el inicio.

### Sección 2 — Dirección
- Si el cliente NO tiene direcciones guardadas: solo muestra formulario
  para nueva dirección. La primera dirección se marca `is_default=true`
  automáticamente.
- Si SÍ tiene: muestra tabs "Direcciones guardadas" / "Nueva dirección".
  En guardadas, radio button para elegir; en nueva, formulario.

El formulario incluye departamento (select con los 32 departamentos),
ciudad (select dinámico de municipios principales del departamento, con
opción "Otro municipio…" que abre input libre), dirección, detalles,
código postal opcional y etiqueta opcional.

### Sección 3 — Revisar y pagar
Aparece bloqueada (visible pero `pointer-events-none` y opacity 60%)
hasta que las dos secciones anteriores estén completas. Cuando se
desbloquea, muestra resumen del carrito y el botón "Confirmar y pagar"
**deshabilitado** con texto "Pago seguro por Bold · próximamente en esta
sesión".

Esto es deliberado: Sesión B termina aquí. Sesión C activa el botón.

### Sidebar derecho — Resumen
Sticky en desktop, debajo del form en mobile. Lista los items con thumb
y cantidad, subtotal, "envío calculado al confirmar", total estimado.

---

## 5. Probar en local

```bash
npm run dev
```

Flujo de QA:

1. **Sin sesión**: ve a `/checkout` → debe redirigir a
   `/iniciar-sesion?next=%2Fcheckout`. Login con magic link → vuelve a
   `/checkout`.
2. **Carrito vacío**: con sesión y carrito vacío, `/checkout` debe
   redirigir a `/carrito`.
3. **Carrito con items, primer checkout**:
   - Ve a `/tienda`, agrega 2-3 productos
   - Ve a `/checkout`
   - Sección 1 (Contacto): llena nombre, teléfono móvil de 10 dígitos
     (probar también con 7 fijos y con +57), tipo doc, número doc.
     Click "Guardar y continuar". Debe aparecer check verde.
   - Sección 2 (Dirección): llena los campos. Probar selección de
     departamento → ciudad cambia. Probar "Otro municipio". Click
     "Guardar dirección". Debe pasar a modo "Direcciones guardadas"
     mostrando la dirección recién creada.
   - Sección 3 (Revisar): debe estar visible y habilitada visualmente.
     Verifica que el botón "Confirmar y pagar" está deshabilitado y
     dice "próximamente".
4. **Carrito con items, checkout subsecuente** (segunda compra):
   - Refresca la página. Datos de contacto y dirección ya vienen
     llenos. Tabs "Direcciones guardadas" pre-seleccionada.
5. **Validaciones Zod**:
   - Probar teléfono "123" → error "El teléfono debe tener al menos 7 dígitos"
   - Probar nombre "A" → error "Ingresa tu nombre completo"
   - Probar dirección con menos de 5 caracteres → error
   - Probar código postal con 3 dígitos → error
6. **Persistencia BD**:
   - Después de guardar datos, verificar en Supabase Dashboard →
     `customers` y `addresses` que las filas se crearon/actualizaron
     correctamente con tu `id` de auth user.

---

## 6. Despliegue

```bash
# Tu flujo manual via GitHub web
```

En el preview de Vercel, repetir los pasos 1-5 contra el preview URL.
Verificar especialmente:
- El magic link ahora redirige bien a `/checkout` (no a `/admin`).
- Las server actions responden (Network tab: petición POST a la página).
- Los datos persisten al refresh.

---

## 7. Lo que cierra

Esta sesión deja:
- ✅ Auth gate de checkout funcional
- ✅ Form completo de contacto y dirección con validación Zod
- ✅ Catálogo DIVIPOLA con 32 departamentos y 350+ municipios principales
- ✅ Persistencia en `customers` y `addresses` con RLS
- ✅ Soporte para múltiples direcciones guardadas con default
- ✅ Resumen del pedido en sidebar sticky
- ✅ Sección de revisión preparada para Bold

**No deja:**
- ❌ Cálculo de envío por departamento (Sesión C)
- ❌ Integración Bold (Sesión C)
- ❌ Webhook de confirmación de pago (Sesión C)
- ❌ Email transaccional (Sesión C)
- ❌ Página `/pedido/[order_number]` post-pago (Sesión D)

---

## 8. Decisiones técnicas relevantes

**Single-page, no multi-step**. La conversión en mobile es mejor cuando
el usuario ve todo el flujo de un vistazo en lugar de saltar entre 3
páginas. Las secciones se desbloquean visualmente para guiar el orden.

**DIVIPOLA con municipios principales, no completo**. ~350 municipios
cubren ~90% de pedidos reales. Los demás casos los maneja el input
libre "Otro municipio". Cuando crezca el volumen y haya patrones reales
de pedidos a municipios pequeños, se reemplaza `divipola-data.ts` por el
dataset DANE completo sin tocar el resto.

**Zod compartido cliente/servidor**. Un solo schema en
`lib/checkout/schemas.ts` valida en el form (al hacer click "Guardar")
y en la server action (defensa en profundidad). Esto evita drift y es
el patrón canónico Next 15.

**Botón "Confirmar y pagar" deshabilitado en lugar de oculto**. El
usuario ve dónde irá a parar y entiende el flujo, en lugar de descubrir
una sección nueva en Sesión C.

**`recipient_name` y `phone` de la dirección NO se asumen iguales a los
del contacto**. Caso real: alguien compra para mandar a su mamá, o pide
con su número y manda al número del portero. El form pre-llena pero
permite editar.

**Auto-onboarding ya cubre el primer login**: si el cliente entra al
checkout sin haber pasado por `/mi-cuenta`, `requireCustomer()` crea su
fila en `customers` automáticamente (lógica de Sesión A).
