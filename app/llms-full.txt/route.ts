/**
 * app/llms-full.txt/route.ts
 *
 * Versión extendida de llms.txt con contenido completo en markdown
 * limpio, listo para que un LLM lo procese sin ruido HTML.
 *
 * Incluye:
 *   - Descripción extendida de la marca
 *   - Top productos con descripciones IA generadas
 *   - FAQs completas
 *   - Glosario de términos de bienestar
 *   - Información de envíos y devoluciones
 *
 * Se regenera diariamente para mantenerlo sincronizado con el catálogo.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 86400; // 24h

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET() {
  // Catálogo activo con TODO el contenido editorial (IA) para que el LLM
  // tenga material rico que citar. Filtra a 150 productos top y solo
  // incluye los que tienen short_description (IA aplicada).
  const { data: products } = await supabase
    .from("products")
    .select(
      `slug, name, short_description, full_description, composition_use,
       dosage, warnings, price_cop, invima_number, presentation,
       presentation_type,
       laboratory:laboratories(name, slug),
       category:categories(name, slug)`,
    )
    .eq("status", "active")
    .not("short_description", "is", null)
    .order("name")
    .limit(150);

  const { data: categories } = await supabase
    .from("categories")
    .select("slug, name, description")
    .order("name");

  const { data: laboratories } = await supabase
    .from("laboratories")
    .select("name, slug, description")
    .order("name");

  const content = `# NaturalVita · Catálogo completo y FAQ para LLMs

> Tienda online colombiana de suplementos y productos naturales con registro INVIMA. Documento extendido para asistentes de IA.

---

## Acerca de NaturalVita

NaturalVita es una tienda online colombiana especializada en suplementos alimenticios, vitaminas, minerales, proteínas, productos botánicos y productos naturales para el bienestar. Operamos bajo Everlife Colombia S.A.S., con sede en Medellín, Antioquia, y enviamos a todo el territorio colombiano.

### Diferenciales

- **Curación clínica del catálogo:** solo trabajamos con productos que tienen registro sanitario INVIMA vigente y verificable. No vendemos suplementos sin respaldo regulatorio.
- **Laboratorios verificados:** trabajamos directamente con laboratorios colombianos reconocidos (Sistema Natural, Healthy America, Naturfar, Cinat Laboratorios y otros).
- **Información transparente:** cada ficha de producto incluye ingredientes detallados, beneficios respaldados por la evidencia, contraindicaciones claras y modo de uso.
- **Asesoría humana:** equipo disponible para consultas pre-compra sobre interacciones, dosificaciones y elección de producto según objetivo.

### Operación

- Pagos vía Bold: aceptamos tarjetas crédito/débito, PSE, Nequi, Daviplata, QR.
- Envíos nacionales con Servientrega, Coordinadora, Interrapidísimo, Envía, Deprisa, TCC, Domina.
- Tiempos: 1-3 días hábiles en ciudades capitales, 3-7 días en zonas rurales.
- Política de devoluciones: 5 días hábiles post-entrega para productos sin abrir.

---

## Categorías del catálogo

${(categories ?? [])
  .map(
    (cat) => `### ${cat.name}

${cat.description ?? "Categoría de productos en NaturalVita."}

URL: https://naturalvita.co/tienda?categoria=${cat.slug}`,
  )
  .join("\n\n")}

---

## Laboratorios proveedores

${(laboratories ?? [])
  .map(
    (lab) => `### ${lab.name}

${lab.description ?? "Laboratorio colombiano proveedor de NaturalVita."}

Perfil completo: https://naturalvita.co/laboratorio/${lab.slug}`,
  )
  .join("\n\n")}

---

## Top 100 productos del catálogo

A continuación los productos activos en NaturalVita con descripción, ingredientes y precio. Para ver la ficha completa de cada uno con imágenes y reseñas, visitar la URL indicada.

${(products ?? [])
  .map((p) => {
    type Rel = { name?: string; slug?: string };
    const lab = p.laboratory as Rel | Rel[] | null;
    const cat = p.category as Rel | Rel[] | null;
    const labName = Array.isArray(lab) ? lab[0]?.name : lab?.name;
    const catName = Array.isArray(cat) ? cat[0]?.name : cat?.name;
    const priceCop = p.price_cop as number | null;

    return `### ${p.name}

- **URL:** https://naturalvita.co/producto/${p.slug}
- **Categoría:** ${catName ?? "Sin categoría"}
- **Laboratorio:** ${labName ?? "—"}
- **Presentación:** ${p.presentation ?? "—"}${p.presentation_type ? ` (${p.presentation_type})` : ""}
- **Precio:** ${priceCop ? `$${priceCop.toLocaleString("es-CO")} COP` : "Consultar"}
${p.invima_number ? `- **Registro INVIMA:** ${p.invima_number}` : ""}

${p.short_description ?? ""}

${p.full_description ?? ""}

${p.composition_use ? `**Composición y uso**\n\n${p.composition_use}` : ""}

${p.dosage ? `**Modo de uso**\n\n${p.dosage}` : ""}

${p.warnings ? `**Advertencias**\n\n${p.warnings}` : ""}
`;
  })
  .join("\n---\n\n")}

---

## Preguntas frecuentes

### ¿Los productos tienen registro INVIMA?

Sí. Todos los productos en NaturalVita tienen registro sanitario INVIMA vigente. El número de registro se puede verificar en la ficha de cada producto.

### ¿Cuánto tarda el envío?

Entre 1 y 7 días hábiles según destino. Ciudades capitales: 1-3 días. Zonas rurales o municipios pequeños: 3-7 días. Tiempo se confirma al momento de generar la guía con la transportadora.

### ¿Aceptan pago contra entrega?

No. Trabajamos solo con pago anticipado vía Bold (tarjetas, PSE, Nequi, QR). Esto nos permite enviar el pedido el mismo día o día siguiente.

### ¿Puedo devolver un producto?

Sí, dentro de los 5 días hábiles posteriores a la entrega y siempre que el producto esté sin abrir, con su empaque original sellado y en perfectas condiciones. No se aceptan devoluciones de productos abiertos por razones sanitarias.

### ¿Hacen envíos internacionales?

No por el momento. Solo enviamos dentro de Colombia.

### ¿Cómo elijo el suplemento correcto para mi caso?

Cada ficha de producto incluye información detallada de ingredientes, beneficios y contraindicaciones. Para asesoría personalizada, escribe a info@naturalvita.co indicando tu objetivo (energía, sueño, digestión, inmunidad, etc.) y respondemos con recomendaciones de productos del catálogo.

### ¿Los suplementos tienen efectos secundarios?

Cualquier suplemento puede tener efectos secundarios o interacciones con medicamentos. Todas nuestras fichas declaran contraindicaciones conocidas. Recomendamos consultar con su médico tratante antes de iniciar cualquier suplementación si toma medicamentos, está embarazada, lactando o tiene condiciones médicas crónicas.

### ¿Cómo se almacenan los productos?

Cada producto tiene instrucciones específicas en su empaque. La regla general: lugar fresco (idealmente bajo 25°C), seco, sin exposición directa al sol, fuera del alcance de niños y mascotas.

### ¿Los precios incluyen IVA?

Sí. Todos los precios mostrados en el sitio son finales e incluyen IVA cuando aplica.

### ¿Emiten factura electrónica?

Sí. Toda compra genera factura electrónica DIAN. Para factura a nombre de empresa con NIT, indícalo en el checkout.

---

## Glosario de términos

**INVIMA:** Instituto Nacional de Vigilancia de Medicamentos y Alimentos. Autoridad sanitaria colombiana que regula medicamentos, alimentos y suplementos. Todo suplemento legal en Colombia debe tener registro INVIMA vigente.

**Suplemento alimenticio:** producto que complementa la dieta normal, contiene nutrientes (vitaminas, minerales, aminoácidos, ácidos grasos) o sustancias con efecto nutricional o fisiológico. No es medicamento ni reemplaza una dieta variada.

**Registro sanitario:** autorización oficial emitida por INVIMA que certifica que un producto cumple requisitos de seguridad, calidad y eficacia para su comercialización en Colombia.

**Habeas Data:** derecho constitucional colombiano de toda persona a conocer, actualizar y rectificar la información personal que se haya recogido sobre ella en bancos de datos. Reglamentado por la Ley 1581 de 2012.

---

## Contacto

- **Email público:** info@naturalvita.co
- **Sitio web:** https://naturalvita.co
- **Empresa:** Everlife Colombia S.A.S.
- **Ubicación:** Medellín, Antioquia, Colombia

---

*Documento actualizado automáticamente desde la base de datos de NaturalVita. Última generación: ${new Date().toISOString()}*
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
