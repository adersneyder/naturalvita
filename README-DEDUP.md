# NaturalVita · Quiz IA — Deduplicación por grupo de equivalencia

Esta entrega resuelve que el quiz no muestre **productos sustitutos** juntos
(ej. el mismo Colágeno en x60 y x100, o el mismo principio activo en dos labs),
conservando en cambio la **complementariedad** (productos distintos que atacan
la necesidad desde ángulos diferentes, tipo formulación médica).

## Estado: YA APLICADO EN PRODUCCIÓN

Todo esto ya está vivo en Supabase (qheynvhdjdnqywyaekpq) y verificado:
- Columna `products.equivalence_group` creada.
- `resolve_quiz` reescrita para deduplicar por grupo.
- Grupos asignados al catálogo activo actual (27 productos en grupos de sustitutos).
- Edge Function `quiz-reco-sync` v2 desplegada (asigna grupo a productos nuevos).

Este ZIP es para **versionar en el repo** lo que ya se aplicó. La estructura es
de RAÍZ (el repo usa `@/*` → `./*`, sin `src/`).

## Contenido

```
supabase/functions/quiz-reco-sync/index.ts   Edge Function v2 (ya desplegada; por versión)
supabase/migrations/20260601_quiz_equivalence_dedup.sql   Migración de referencia (ya aplicada)
```

## Cómo subirlo

Sube ambos archivos a su ruta en el repo. NO necesitas re-ejecutar la migración
ni redesplegar la función: ya están en Supabase. El repo solo refleja el estado.

La carpeta `supabase/` ya está excluida del build de Next en tu `tsconfig.json`,
así que estos archivos no afectan el deploy de Vercel.

## La regla de equivalencia

Dos productos son equivalentes (y el quiz muestra solo el mejor rankeado) cuando
coinciden en los TRES ejes:
  1. Principio activo / función esencial
  2. Vía de consumo (oral-sólido / líquido / polvo / tópico)
  3. Composición sustancialmente igual

Si difieren en cualquiera —sobre todo la vía— son distintos y pueden convivir.
Ejemplos reales del catálogo:
  - Collagen Plus x60 y x100 → mismo grupo (solo cambia tamaño) → se muestra uno.
  - Colágeno oral y Collagen Elastin Cream → grupos distintos (oral vs tópico) → conviven.
  - Citrato de magnesio cápsula y líquido → grupos distintos (distinta vía) → conviven.
  - Cal Mag Zinc x60 y x100 → mismo grupo → se muestra uno.

La regla aplica a TODO el resultado del quiz (directas y coadyuvante): nunca dos
del mismo grupo.

## Automatización (productos futuros)

La Edge Function v2 asigna `equivalence_group` automáticamente al clasificar cada
producto. Cuando agregues un producto nuevo en el admin:
  1. El trigger lo marca como "sucio".
  2. El cron (cada 15 min) o el botón de admin lo procesa.
  3. Claude le asigna su grupo de equivalencia según la regla de los 3 ejes.
No requiere mantenimiento manual de grupos.

## Pendiente futuro (post-launch, aprobado)

Cuando dos productos son equivalentes pero en distinta presentación consumible
(ej. cápsula vs polvo), hoy se muestra solo el mejor y se descarta el otro.
Mejora futura: en la tarjeta del producto mostrado, añadir un enlace/chip discreto
"también disponible en [forma]" hacia la ficha de la presentación alternativa.
El `equivalence_group` ya se guarda desde ahora, así que activar esto después NO
requerirá reclasificar el catálogo — solo ajustar `resolve_quiz` para devolver los
hermanos de grupo con distinta vía. Se hará con datos reales de uso del quiz.
