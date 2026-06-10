import type { Metadata } from "next";
import Link from "next/link";
import ArticleLayout from "../_components/ArticleLayout";
import { GUIAS_INDEX } from "@/lib/guias/registry";
import { COMPANY } from "@/lib/legal/company-info";

const ENTRY = GUIAS_INDEX.find(
  (g) => g.slug === "como-verificar-invima-suplemento",
)!;

export const metadata: Metadata = {
  title: ENTRY.title,
  description: ENTRY.dek,
  alternates: { canonical: `${COMPANY.url}/guias/${ENTRY.slug}` },
  openGraph: {
    title: ENTRY.title,
    description: ENTRY.dek,
    url: `${COMPANY.url}/guias/${ENTRY.slug}`,
    type: "article",
    images: [{ url: ENTRY.heroImage.url, alt: ENTRY.heroImage.alt }],
    publishedTime: ENTRY.publishedDate,
  },
};

export const revalidate = 604800;

export default function ComoVerificarInvimaPage() {
  return (
    <ArticleLayout
      slug={ENTRY.slug}
      title={ENTRY.title}
      dek={ENTRY.dek}
      tldr="Entra a datos.invima.gov.co, busca el producto por su nombre comercial o número de registro, y verifica que el estado figure como VIGENTE. Si no aparece, o aparece como vencido, suspendido o cancelado, no es legal venderlo en Colombia y no deberías comprarlo. Toda etiqueta legítima incluye el número de registro INVIMA visible."
      publishedDate={ENTRY.publishedDate}
      updatedDate={ENTRY.updatedDate}
      author={{ name: "Equipo editorial NaturalVita", role: "Curación clínica del catálogo" }}
      readingTime={ENTRY.readingTime}
      heroImage={ENTRY.heroImage}
      sections={[
        {
          id: "que-es-invima",
          heading: "¿Qué es el registro INVIMA y por qué importa?",
          body: (
            <>
              <p>
                El{" "}
                <strong>
                  Instituto Nacional de Vigilancia de Medicamentos y Alimentos
                </strong>{" "}
                (INVIMA) es la autoridad sanitaria colombiana que regula
                medicamentos, alimentos y suplementos. Para que un producto se
                comercialice legalmente en Colombia, debe contar con un{" "}
                <strong>registro sanitario INVIMA vigente</strong>.
              </p>
              <p>El registro garantiza tres cosas mínimas:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  El producto pasó por evaluación de seguridad y composición.
                </li>
                <li>
                  El fabricante (laboratorio) está identificado y supervisado.
                </li>
                <li>
                  Las declaraciones de la etiqueta tienen un marco regulatorio
                  que limita lo que se puede prometer.
                </li>
              </ul>
              <p>
                Comprar productos sin registro vigente es comprar a ciegas:
                composición sin verificar, sin trazabilidad de quien lo
                fabricó, sin garantía de buenas prácticas de manufactura.
              </p>
            </>
          ),
        },
        {
          id: "donde-encontrar-numero",
          heading: "Dónde está el número en el empaque",
          body: (
            <>
              <p>
                Toda etiqueta legítima incluye el número de registro INVIMA
                visible. Lo más común es encontrarlo:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Al lado o debajo de los ingredientes / información
                  nutricional.
                </li>
                <li>En la cara posterior o lateral del empaque.</li>
                <li>Cerca del lote y la fecha de vencimiento.</li>
              </ul>
              <p>
                Los formatos típicos son alguno de estos (todos válidos):
              </p>
              <ul className="list-disc pl-6 space-y-1 font-mono text-sm">
                <li>RSA-XXX-XXXXXXX</li>
                <li>RSAD-XXXX-2025</li>
                <li>INVIMA 20XXM-XXXXXXX</li>
                <li>NSOA-XXXX-2024 (para alimentos)</li>
                <li>NSA-XXXX-2024</li>
              </ul>
              <p>
                Las letras al inicio cambian según el tipo de producto
                (suplemento dietario, alimento, cosmético, fitoterapéutico).
                Lo importante es que la cadena exista y la verifiques.
              </p>
              <p>
                En NaturalVita, cada ficha de producto muestra el número del
                INVIMA al pie de la información de compra. Está hecho a
                propósito: que puedas verificarlo antes de pagar.
              </p>
            </>
          ),
        },
        {
          id: "paso-a-paso-consulta",
          heading: "Cómo consultarlo: paso a paso en 2 minutos",
          body: (
            <>
              <ol className="list-decimal pl-6 space-y-3">
                <li>
                  Entra a la consulta pública del INVIMA:{" "}
                  <a
                    href="https://datos.invima.gov.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-iris-700)] underline"
                  >
                    datos.invima.gov.co
                  </a>
                </li>
                <li>
                  En el menú principal, busca <strong>"Consulta de
                  registros sanitarios"</strong>. Suele estar bajo "Datos
                  abiertos" o "Consultas".
                </li>
                <li>
                  Elige la categoría que aplique (suplemento dietario,
                  fitoterapéutico, alimento, cosmético). Si dudas, "Consulta
                  general" funciona.
                </li>
                <li>
                  Pega el <strong>número de registro</strong> tal como aparece
                  en la etiqueta. También puedes buscar por{" "}
                  <strong>nombre comercial</strong> si no tienes el número a
                  mano.
                </li>
                <li>
                  Revisa que el resultado muestre:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>
                      <strong>Estado: VIGENTE.</strong> "Vencido", "Suspendido"
                      o "Cancelado" son banderas rojas.
                    </li>
                    <li>
                      <strong>Fabricante:</strong> que coincida con el que
                      aparece en la etiqueta.
                    </li>
                    <li>
                      <strong>Composición declarada:</strong> que se parezca a
                      los ingredientes del producto físico.
                    </li>
                    <li>
                      <strong>Fecha de vencimiento del registro:</strong> si ya
                      pasó, el producto no debería estar a la venta.
                    </li>
                  </ul>
                </li>
              </ol>
              <p>
                Si todo cuadra, estás comprando un producto legalmente
                comercializable en Colombia, con composición y fabricante
                verificados por la autoridad sanitaria.
              </p>
            </>
          ),
        },
        {
          id: "banderas-rojas",
          heading: "Banderas rojas: cuándo desconfiar",
          body: (
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>No hay INVIMA en el empaque.</strong> El vendedor te
                dice que "es importado" o "es para uso personal". Para vender
                en Colombia, el INVIMA es obligatorio. No hay excepciones.
              </li>
              <li>
                <strong>Promesas médicas explícitas.</strong> "Cura la
                diabetes", "elimina el cáncer", "reemplaza tu medicamento": un
                suplemento legal no puede hacer estas declaraciones. Si el
                vendedor o la etiqueta las hace, está fuera de norma.
              </li>
              <li>
                <strong>Estado del registro no vigente.</strong> Aunque haya
                número, si la consulta lo marca como vencido, suspendido o
                cancelado, no se puede comercializar.
              </li>
              <li>
                <strong>Composición que no calza.</strong> La etiqueta lista
                un ingrediente activo que el registro INVIMA no menciona. Es
                señal de que el producto físico no es el mismo que se registró.
              </li>
              <li>
                <strong>Vendedor sin trazabilidad.</strong> Cuenta de redes
                sociales sin información de empresa, sin políticas de
                devolución, sin canal de servicio al cliente. La regulación de
                comercio electrónico colombiano exige identificar al vendedor.
              </li>
            </ul>
          ),
        },
        {
          id: "naturalvita",
          heading: "Cómo lo hacemos en NaturalVita",
          body: (
            <>
              <p>
                Cada producto que llega al catálogo de NaturalVita pasa por
                verificación previa: confirmamos que el laboratorio cuente con
                su registro INVIMA al día y que el número que figura en la
                etiqueta coincida con el de la base pública.
              </p>
              <p>
                En la ficha pública, el número aparece visible. Si quieres
                verificarlo, puedes copiar y pegar directamente en{" "}
                <a
                  href="https://datos.invima.gov.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-iris-700)] underline"
                >
                  datos.invima.gov.co
                </a>{" "}
                — el proceso toma menos de 2 minutos.
              </p>
              <p>
                Si encuentras alguna discrepancia, escríbenos a{" "}
                <a
                  href={`mailto:${COMPANY.publicEmail}`}
                  className="text-[var(--color-iris-700)] underline"
                >
                  {COMPANY.publicEmail}
                </a>
                : tomamos esos reportes en serio.
              </p>
              <p>
                <Link
                  href="/tienda"
                  className="text-[var(--color-iris-700)] underline"
                >
                  Ver catálogo →
                </Link>
              </p>
            </>
          ),
        },
      ]}
      productMentions={[]}
      faqs={[
        {
          q: "¿Los productos importados necesitan INVIMA?",
          a: "Sí. Cualquier producto destinado a la comercialización en Colombia, sea fabricado aquí o importado, necesita registro sanitario INVIMA. La excepción es el uso estrictamente personal y en cantidades pequeñas que la persona traiga para sí, no para vender.",
        },
        {
          q: "¿Suplementos como creatina o proteínas también necesitan INVIMA?",
          a: "Sí. Suplementos dietarios, alimentos para deportistas y proteínas en polvo se registran como alimentos o suplementos dietarios ante el INVIMA. Si en Colombia un producto se vende sin registro, está fuera de norma.",
        },
        {
          q: "¿Y los productos naturales o fitoterapéuticos?",
          a: "Los productos fitoterapéuticos (a base de plantas) y las preparaciones homeopáticas tienen su propia vía de registro ante el INVIMA. El número va en la etiqueta y se verifica en la misma consulta pública.",
        },
        {
          q: "¿Qué hago si el producto que ya compré no tiene INVIMA?",
          a: "Primero, no lo consumas si tienes dudas serias sobre su composición o procedencia. Segundo, si lo compraste a un vendedor identificable, exige información del registro o solicita la devolución. Tercero, puedes reportarlo al INVIMA en su canal de denuncias para que investigue.",
        },
        {
          q: "¿Un producto con INVIMA vencido es peligroso?",
          a: "El estado 'vencido' del registro significa que el fabricante no lo renovó a tiempo, no necesariamente que el producto sea inseguro. Pero legalmente no debería estar a la venta. Para ti como consumidor, evita comprarlo: no hay garantía de que el lote en góndola sea el mismo que se aprobó en su momento.",
        },
      ]}
    />
  );
}
