# Fix del build · Sprint 2 Sesión A

## Qué arregla
El build falló con:
  Type error: 'quiz_properties' does not exist in type [newsletter_subscribers Update]

Causa: lib/supabase/types.ts del repo se generó ANTES de las migraciones del
quiz, así que no incluye la columna quiz_properties ni las tablas quiz_results
y quiz_match_cache. La columna SÍ existe en la base de datos; solo faltaba
actualizar el archivo de tipos.

## Qué hacer (1 solo paso)
Reemplaza el archivo:

  lib/supabase/types.ts

con la versión incluida en este ZIP (misma ruta). Sobrescribe el que ya existe.

Luego: commit + push. El redeploy de Vercel debería quedar verde.

## Cómo verificar que es el archivo correcto
La versión nueva incluye estas referencias (que la vieja no tenía):
  - quiz_properties (en newsletter_subscribers)
  - quiz_results (tabla)
  - quiz_match_cache (tabla)
  - increment_quiz_result_views (función)
  - cleanup_expired_quiz_cache (función)

Son 2265 líneas. Si tu archivo actual tiene menos y no menciona "quiz",
es el viejo y hay que reemplazarlo.
