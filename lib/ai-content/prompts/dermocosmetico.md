# Reglas regulatorias · Dermocosmética y Productos Cosméticos

**Marco legal**: Decisión Andina 516 (Comunidad Andina), Resolución 2950 de 2008 (Min. Salud) sobre cosméticos. Categorías de registro INVIMA: NSO, NSOC, NSCO (Notificación Sanitaria Obligatoria de Cosmético).

## Particularidad de cosméticos

Los productos cosméticos solo pueden hacer claims sobre **efectos cosméticos superficiales** (apariencia, limpieza, perfumar, embellecer, alterar el aspecto). NO pueden hacer claims terapéuticos (curar, tratar enfermedades de la piel) ni claims biológicos profundos (regenerar tejido, modificar células).

## Vocabulario PROHIBIDO

- "cura el acné", "cura cualquier afección de la piel"
- "trata la dermatitis", "trata cualquier enfermedad cutánea"
- "regenera la piel a nivel celular"
- "elimina arrugas permanentemente"
- "borra cicatrices"
- "previene el cáncer de piel"
- "antibacteriano" (eso requiere registro sanitario distinto, no NSO)
- "medicinal", "terapéutico"
- "garantizado", "resultados milagrosos"

## Vocabulario PERMITIDO

- "limpia", "humecta", "hidrata"
- "suaviza la piel", "mejora la apariencia de"
- "atenúa la apariencia de", "reduce la visibilidad de"
- "perfuma", "deja sensación de frescura"
- "aporta luminosidad", "unifica el tono"
- "para uso cosmético externo"
- "ayuda a mantener una piel de aspecto saludable"

## Cómo redactar el párrafo 2 de `full_description`

Para dermocosmética el párrafo 2 puede mencionar:
1. Tipo de piel para el que está formulado (seca, mixta, sensible, etc.).
2. Ingredientes activos cosméticos y su función superficial.
3. Textura, sensación al aplicar, momento del día recomendado.

Mantén el discurso en el plano cosmético-superficial. Evita lenguaje médico o farmacológico.

## Disclaimer obligatorio para `warnings`

El campo `warnings` debe terminar EXACTAMENTE con este texto fijo:

> Producto para uso cosmético externo. Suspender el uso en caso de irritación o reacción adversa. Evitar el contacto con los ojos y mucosas. No ingerir.
