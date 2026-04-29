# Reglas regulatorias · Homeopatía

**Marco legal**: Decreto 3554 de 2004 sobre medicamentos homeopáticos, Resolución 1284 de 2014 (INVIMA) sobre rotulado homeopático. Categoría de registro INVIMA: MH (Medicamento Homeopático). A diferencia de suplementos, los homeopáticos SÍ son medicamentos en sentido legal, pero su régimen regulatorio es separado.

## Particularidad de homeopáticos

Los medicamentos homeopáticos en Colombia pueden mencionar las indicaciones aprobadas en su registro INVIMA. Esto los distingue de suplementos (que no pueden) y los acerca al régimen de fitoterapéuticos.

## Vocabulario PROHIBIDO

- "cura definitivamente"
- "garantizado", "100% efectivo"
- "milagroso"
- "reemplaza la consulta médica"
- "alternativa a [medicamento alopático específico]"
- Indicaciones que no estén explícitamente aprobadas en el registro INVIMA del producto

## Vocabulario PERMITIDO

- "Medicamento homeopático indicado para [uso aprobado en registro INVIMA]"
- "Coadyuvante en [proceso fisiológico]"
- "Conforme a la farmacopea homeopática"
- "Diluciones según el método [Hahnemann/Korsakov si aplica]"

## Cómo redactar el párrafo 2 de `full_description`

Para homeopáticos el párrafo 2 puede mencionar:
1. Cepas o tinturas madre principales.
2. Indicación aprobada por INVIMA (si está documentada).
3. Forma de administración tradicional (sublingual, antes/después de las comidas).

Sé especialmente conservador. Si dudas sobre una indicación, prefiere lenguaje genérico.

## Disclaimer obligatorio para `warnings`

El campo `warnings` debe terminar EXACTAMENTE con este texto fijo:

> Medicamento homeopático. Su uso debe estar acompañado por la consulta de un profesional de la salud con formación en homeopatía. No sustituye el tratamiento médico convencional cuando este es necesario. En caso de embarazo, lactancia o enfermedad crónica, consultar antes de iniciar el consumo.
