# NaturalVita · Sprint 2 Sesión B — Secciones de marca Everlife

Cuatro secciones nuevas para el Home, que cuentan quién está detrás de
NaturalVita y por qué confiar. Completan los TODOs que quedaban en el `page.tsx`.

---

## Archivos de este ZIP

```
components/home/ValueProps.tsx        → NUEVO   (propuestas de valor, 3 columnas)
components/home/EverlifeOrigin.tsx    → NUEVO   (origen de la marca, 2019/Zardrin)
components/home/PartnerLabs.tsx       → NUEVO   (laboratorios aliados, dinámico)
components/home/TrustBadges.tsx       → NUEVO   (sellos de confianza, cierre)
lib/catalog/partner-labs.ts          → NUEVO   (consulta de labs con catálogo vivo)
app/(public)/page.tsx                 → REEMPLAZA el Home actual
```

> Súbelos como archivo (drag & drop o "Upload files" en GitHub), NO copies y
> pegues en el editor web. Son archivos con JSX; el parser SWC de Next 15.5
> puede corromperse al pegar.

---

## Orden de las secciones en el Home (ya resuelto en page.tsx)

```
HeroQuiz → LifeStages → FeaturedProducts
  → ValueProps        (3 razones para confiar)
  → EverlifeOrigin    (historia de marca)
  → PartnerLabs       (laboratorios aliados)
  → TrustBadges       (sellos de confianza)
→ PublicFooter        (incluye el newsletter — viene del layout)
```

Criterio del orden: el visitante ya viene enganchado con producto desde la
"Selección destacada"; ahí entran las razones para confiar (valores, origen,
labs). Los sellos cierran pegados encima del footer, como último empujón antes
de decidir. El newsletter no es sección aparte: vive en el footer del layout.

---

## Imagen requerida

`EverlifeOrigin` espera una imagen en:

```
/public/home/origen-everlife.avif
```

Sugerencia (Flux Pro, según el plan de imágenes): laboratorio o manos con
producto natural, tono cálido, profesional pero humano. Si aún no existe, la
sección renderiza igual (el contenedor de imagen queda con fondo crema hasta
que la subas). Conviene subirla antes del launch.

---

## Notas de contenido (texto es borrador — ajústalo cuando quieras)

- **Origen Everlife:** redactado a partir del contexto conocido (2019, Zardrin,
  "del bebé al abuelo"). Es un borrador; el texto real de la historia lo
  defines tú. Está en `EverlifeOrigin.tsx`, fácil de editar.
- **Laboratorios aliados:** NO dice "colombianos" — se centra en la calidad del
  producto, porque las marcas son americanas, europeas y colombianas. Es
  dinámico: muestra solo laboratorios con productos activos (hoy: Millenium
  Natural Systems, Cinat, Naturfar). Cuando otro laboratorio cargue catálogo,
  aparece solo. Muestra los nombres en texto (los logos aún no están cargados);
  cuando subas logo_url, se cambia el render sin rehacer la sección.
- **Sellos de confianza:** la atención dice "Atención cuando la necesitas —
  acompañamiento cercano, paso a paso", reflejando el agente humanizado sin
  prometer que siempre responde una persona.

---

## Qué NO se toca
- El layout `(public)` (header, footer con newsletter, carrito) — sin cambios.
- HeroQuiz, LifeStages, FeaturedProducts — sin cambios (solo se importan).

---

## Verificación post-deploy
1. El Home muestra, bajo la selección destacada: valores → origen → labs → sellos.
2. La sección de aliados lista los 3 laboratorios reales; al hacer clic en uno,
   lleva a `/tienda?lab=slug`.
3. El origen muestra el relato; "Conoce más sobre nosotros" lleva a /sobre-nosotros.
4. Los sellos quedan justo encima del footer.
5. Responsive: en móvil, origen apila imagen sobre texto; valores y sellos se
   reorganizan en una columna.

## Calidad
- Type-check en verde (tsc strict, 0 errores).
- Estética coherente con LifeStages/HeroQuiz: CSS scoped, Georgia en titulares,
  paleta crema/blanco con acentos verde y púrpura.
