# Sprint 2 · Sesión B · Punto 2 — Header con acceso a cuenta

## Qué incluye

Un solo archivo, que REEMPLAZA el existente:

```
app/(public)/_components/AccountLink.tsx
```

El `PublicHeader.tsx` NO se toca: ya importa y posiciona `<AccountLink />`
en su sitio (entre el buscador y el carrito). Al reemplazar este componente,
el header muestra automáticamente la nueva versión.

## Qué cambia respecto a la versión anterior

Antes: un ícono que solo cambiaba el destino del link (/iniciar-sesion vs
/mi-cuenta) según hubiera sesión.

Ahora:
- **Sin sesión** → botón "Ingresar" explícito (ícono + texto) que invita a
  entrar. Lleva a /iniciar-sesion.
- **Con sesión** → ícono de usuario (en púrpura de marca, con punto verde) +
  el nombre del usuario + un menú desplegable con:
    · Mi cuenta  → /mi-cuenta
    · Cerrar sesión → signOut + redirect al Home

## Detalles de calidad

- **Nombre con cascada de fallback** (sin penalizar a visitantes anónimos):
  1. user_metadata.full_name / name (viene gratis en la sesión, sin query)
  2. customers.full_name (lectura ligera por id, RLS verificada: el usuario
     puede leer su propia fila)
  3. parte local del email (fallback final)
  Muestra solo el primer nombre, capitalizado (ej. "ADER" → "Ader").

- **Detección client-side** con onAuthStateChange: reactivo a login/logout
  sin recargar. No rompe el cacheo estático del Home (mismo enfoque del quiz).

- **Placeholder neutro mientras carga**: sin parpadeo de "Ingresar".

- **Menú accesible**: cierra al hacer click fuera o con Escape, atributos
  ARIA (role menu, aria-haspopup, aria-expanded).

- **Responsive**: en móvil muestra solo el ícono (el nombre y "Ingresar" se
  ocultan con sm:inline para no saturar el header estrecho).

- Type-check pasado en verde (tsc strict, 0 errores).

## Para subir

Reemplaza `app/(public)/_components/AccountLink.tsx` con este archivo
(abre en GitHub, selecciona todo, borra, pega, commit).

## Esto desbloquea el QA pendiente

Con el botón de cuenta visible en el header, ya puedes:
1. Iniciar sesión desde cualquier página.
2. Probar el QUIZ LOGUEADO: entra, ve al Home, haz el quiz. En el resultado
   debe mostrar "Guardar mi selección" (sin pedir email), en vez del campo
   de correo.
3. Validar las pestañas de /mi-cuenta (tras el fix de TrackingChip).
