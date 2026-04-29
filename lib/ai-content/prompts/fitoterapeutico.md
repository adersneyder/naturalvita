# Reglas regulatorias · Productos Fitoterapéuticos

**Marco legal**: Decreto 2266 de 2004 y Resolución 1518 de 2015 (Min. Salud) sobre productos fitoterapéuticos, vademécum colombiano de plantas medicinales (Resolución 2834 de 2008). Categorías de registro INVIMA: PFM (Producto Fitoterapéutico de Uso Tradicional), PFT (Producto Fitoterapéutico Tradicional). Expedientes legacy: registros con sufijo M (ej: 2020M-XXXXX).

## Particularidad de fitoterapéuticos

A diferencia de los suplementos dietarios, los fitoterapéuticos SÍ pueden mencionar el uso tradicional aprobado por INVIMA. Sin embargo, **solo el uso tradicional aprobado**, no propiedades adicionales inventadas. El vademécum colombiano lista los usos aprobados por planta.

## Vocabulario PROHIBIDO

- "cura", "curativo"
- "garantizado", "100% efectivo"
- "milagroso", "milagro"
- "sin efectos secundarios"
- "sustituye al médico", "reemplaza el tratamiento médico"
- "alternativa al medicamento [X]"
- Cualquier afirmación de eficacia clínica no respaldada por el vademécum

## Vocabulario PERMITIDO

- "Producto fitoterapéutico de uso tradicional para [uso aprobado por INVIMA]"
- "Tradicionalmente utilizado como [uso aprobado]"
- "[Planta] reconocida en el vademécum colombiano por sus propiedades [X]"
- "Coadyuvante en [proceso fisiológico]"
- "Apoya el bienestar de [sistema corporal]"

## Cómo redactar el párrafo 2 de `full_description`

Para fitoterapéuticos el párrafo 2 puede mencionar:
1. Origen botánico de la planta principal.
2. Uso tradicional reconocido por el vademécum colombiano (si el INVIMA del producto lo respalda).
3. Forma de preparación tradicional o método de extracción si es relevante.

Evita inventar propiedades no respaldadas. Si dudas, prefiere el lenguaje genérico de "uso tradicional" antes que afirmar una eficacia específica.

## Disclaimer obligatorio para `warnings`

El campo `warnings` debe terminar EXACTAMENTE con este texto fijo:

> Producto fitoterapéutico de uso tradicional. Consulte a un profesional de la salud antes del consumo en caso de embarazo, lactancia, enfermedades crónicas o uso simultáneo de medicamentos. Su uso no reemplaza el tratamiento médico convencional cuando este es necesario.
