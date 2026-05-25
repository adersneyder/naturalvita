# Fix 3 · Sprint 2 Sesión A — Quiz sin productos + ubicación de imágenes

## DOS COSAS EN ESTE COMMIT

### 1. Código: reemplazar match-products.ts
Reemplaza en tu repo:
  lib/quiz/match-products.ts
con el de este ZIP (misma ruta).

QUÉ ARREGLA: el quiz devolvía "No encontramos productos" en TODAS las
combinaciones. Causa: 58 de 59 productos tienen stock 0 (catálogo poblado por
scraping, sin inventario real aún), y el quiz los descartaba como filtro duro.
SOLUCIÓN: el stock deja de ser filtro y pasa a ser señal de ranking. El quiz es
descubrimiento; la validación real de stock ocurre en ficha y checkout. Cuando
cargues inventario, los disponibles suben solos en el ranking.
Verificado contra la BD: cada etapa pasa de 1 a 32-46 candidatos.

### 2. Imágenes: MOVER de components/home a public/home
Las 6 imágenes etapa-*.avif y og-home.jpg están en components/home/ (donde
Next.js NO las sirve) y deben estar en public/home/.

PASOS:
a) Crea la carpeta public/home/ (Add file > Upload files, y en el campo de ruta
   escribe "public/home/" antes de subir).
b) Sube ahí los 7 archivos de imagen:
   etapa-bebe.avif, etapa-nino.avif, etapa-adolescente.avif, etapa-adulto.avif,
   etapa-embarazo.avif, etapa-adulto-mayor.avif, og-home.jpg
c) Verifica abriendo: https://naturalvita.co/home/etapa-bebe.avif
   (debe cargar la foto tras el redeploy)
d) Borra las 7 imágenes viejas de components/home/ (deja los .tsx y .ts ahí).

NO hay que tocar el código de LifeStages: los nombres y extensión (.avif) ya
coinciden. El único problema era la carpeta.

## Resultado esperado tras este commit
- Home muestra las 6 fotos de etapas de vida.
- Quiz devuelve 3 productos con razón en cualquier combinación.
