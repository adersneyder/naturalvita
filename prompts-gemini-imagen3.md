# Prompts de imágenes · Sesión A · Etapas de vida

6 imágenes para las cards de `LifeStages.tsx`. Genera cada una en **Gemini Imagen 3** (Google AI Studio o la app de Gemini) y guárdalas con los nombres exactos indicados.

## Estética común (aplica a las 6)

Para mantener coherencia visual entre las 6 cards, todas comparten:

- **Paleta:** tonos cálidos tierra, marfil, beige, con toques verdes naturales suaves. Nada de colores saturados ni fríos.
- **Luz:** natural, suave, dorada, como luz de ventana por la mañana. Sombras suaves.
- **Mood:** sereno, cálido, confianza clínica sin frialdad. Minimalista, aireado.
- **Fondo:** limpio, desenfocado, sin desorden. Mucho espacio negativo.
- **NADA de:** texto, logos, marcas de agua, envases de medicamentos reconocibles, exceso de objetos, estética stock genérica, sonrisas exageradas tipo catálogo dental.
- **Formato:** relación de aspecto 4:3 (horizontal). Resolución alta.

## Post-procesamiento (después de generar)

1. Descarga cada imagen de Gemini (vienen en PNG o JPG).
2. Conviértelas a **AVIF** para optimizar peso. Puedes usar https://squoosh.app (gratis, de Google): sube cada imagen → formato AVIF → calidad ~60 → descarga.
3. Renómbralas exactamente como indica cada prompt.
4. Súbelas a `/public/home/` en el repo (GitHub → carpeta public/home → Add file → Upload).

---

## 1 · Bebés (HUMANO) → `etapa-bebe.avif`

```
A warm, tender close-up photograph of a happy healthy baby (around 8 months old, Latin American features) sitting on a soft cream blanket, gentle morning window light, soft golden tones, a mother's hands softly visible in soft focus background. Minimalist warm beige and ivory palette, natural soft lighting, shallow depth of field, serene and clean composition with negative space. Lifestyle wellness photography, no text, no logos. 4:3 aspect ratio.
```

## 2 · Niños (HUMANO) → `etapa-nino.avif`

```
A cheerful Latin American child (around 6 years old) at a bright kitchen table in the morning, holding a glass of natural juice, warm golden window light, soft ivory and warm wood tones, healthy and natural atmosphere. Minimalist warm palette, soft natural lighting, shallow depth of field, clean composition with negative space, lifestyle wellness photography, no text, no logos. 4:3 aspect ratio.
```

## 3 · Adolescentes (ABSTRACTO) → `etapa-adolescente.avif`

```
A minimalist still life flat-lay on a warm cream desk surface: an open notebook, a pencil, a glass of water, a few natural vitamin capsules in a small ceramic dish, soft morning light casting gentle shadows. Warm beige and terracotta palette, no people, calm and studious mood, lots of negative space, editorial wellness photography, soft natural lighting, no text, no logos. 4:3 aspect ratio.
```

## 4 · Adultos (ABSTRACTO) → `etapa-adulto.avif`

```
A serene minimalist close-up of two open hands gently holding a single natural supplement capsule, bathed in soft warm morning light, blurred natural background with hints of green plant. Warm ivory and earthy tones, calm and intentional mood, shallow depth of field, generous negative space, editorial wellness photography, soft golden lighting, no text, no logos. 4:3 aspect ratio.
```

## 5 · Embarazo (HUMANO) → `etapa-embarazo.avif`

```
A tender warm photograph of a pregnant woman (Latin American, second trimester) softly cradling her belly with both hands, wearing soft neutral cream clothing, standing in warm golden window light, peaceful and serene expression, soft focus. Warm ivory and beige palette, natural soft lighting, shallow depth of field, clean minimalist composition with negative space, lifestyle wellness photography, no text, no logos. 4:3 aspect ratio.
```

## 6 · Adultos mayores (HUMANO) → `etapa-adulto-mayor.avif`

```
A warm dignified photograph of a happy healthy Latin American elderly woman (around 70 years old) smiling gently in soft morning light, sitting near a window with a cup of herbal tea, natural grey hair, warm and serene expression. Warm ivory and earthy tones, natural soft golden lighting, shallow depth of field, clean composition with negative space, lifestyle wellness photography, no text, no logos. 4:3 aspect ratio.
```

---

## Imagen Open Graph (opcional, para compartir en redes) → `og-home.jpg`

Esta es la imagen que aparece cuando compartes naturalvita.co en WhatsApp/Facebook/LinkedIn. Formato distinto (1200×630, horizontal ancho).

```
A warm, editorial wide banner image representing family wellness across all ages: soft arrangement of natural supplements, fresh herbs, and a hint of warm sunlight on an ivory surface. Warm beige, terracotta and soft green palette, minimalist and elegant, lots of negative space on the left for text overlay, editorial wellness photography, soft natural lighting, no text, no logos. 1200x630 wide banner format.
```

Guárdala como `og-home.jpg` (JPG, no AVIF, porque algunos crawlers de redes no leen AVIF) en `/public/home/`.

---

## Resumen de archivos a subir a /public/home/

| Archivo | Tipo | Card |
|---|---|---|
| `etapa-bebe.avif` | AVIF | Bebés |
| `etapa-nino.avif` | AVIF | Niños |
| `etapa-adolescente.avif` | AVIF | Adolescentes |
| `etapa-adulto.avif` | AVIF | Adultos |
| `etapa-embarazo.avif` | AVIF | Embarazo |
| `etapa-adulto-mayor.avif` | AVIF | Adultos mayores |
| `og-home.jpg` | JPG | Open Graph (compartir) |

**Nota:** si una card no tiene su imagen aún, Next.js mostrará un espacio roto. Puedes subir las 6 de etapas primero (críticas) y la OG después. Mientras generas, el sitio funciona — solo se ven los marcos sin foto.
