# Fix 2 del build · Sprint 2 Sesión A — Tipos JSONB

## Qué arregla
Tras el fix de types.ts, el build avanzó y falló en:
  Type 'MatchedProduct[]' is not assignable to type 'Json'

Causa: las columnas JSONB de Supabase (products, quiz_properties,
recommendations) están tipadas como `Json`. Pasarles un tipo concreto como
MatchedProduct[] requiere un cast explícito, porque TypeScript no asume que
un tipo concreto cumple la "index signature" de Json. Los datos son válidos;
solo faltaba el cast.

## Qué hacer
Reemplaza estos 3 archivos en tu repo con los de este ZIP (mismas rutas):

  lib/quiz/save-result.ts
  lib/quiz/match-products.ts
  app/_actions/quiz-subscribe.tsx

Luego commit + push.

## Qué cambió exactamente (4 puntos)
1. save-result.ts: products casteado a Json al insertar (+ import de Json)
2. save-result.ts: lectura de products con `as unknown as MatchedProduct[]`
3. match-products.ts: recommendations casteado a Json en upsert + lectura (+ import)
4. quiz-subscribe.tsx: quizProperties anotado como `Json` (+ import)

## Validación
Los 6 patrones de lectura/escritura JSONB se verificaron contra el cliente
@supabase/supabase-js tipado con tu Database real, con las mismas opciones de
compilación que usa tu repo (strict + skipLibCheck). Compilan sin errores.

## Importante
Este ZIP NO incluye types.ts. Ya subiste la versión correcta en el fix anterior
(commit 718ee29). No lo toques.
