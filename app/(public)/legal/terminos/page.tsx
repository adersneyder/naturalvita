import type { Metadata } from "next";
import Breadcrumbs from "../../_components/Breadcrumbs";
import { COMPANY } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Términos y condiciones de uso de NaturalVita / Everlife Colombia.",
  alternates: { canonical: "https://naturalvita.co/legal/terminos" },
};

export default function TerminosPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Legal" }, { label: "Términos y condiciones" }]} />

      <header className="mt-6 mb-8">
        <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight">
          Términos y condiciones de uso
        </h1>
        <p className="mt-3 text-sm text-[var(--color-earth-700)]">
          Vigente desde el 1 de mayo de 2026.
        </p>
      </header>

      <div className="prose-content space-y-6 text-[var(--color-earth-900)] leading-relaxed">
        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            1. Aceptación
          </h2>
          <p>
            Al acceder y usar el sitio{" "}
            <strong>{COMPANY.siteUrl.replace(/^https?:\/\//, "")}</strong>{" "}
            aceptas estos términos en su totalidad. Si no estás de acuerdo, no
            uses el sitio.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            2. Quiénes somos
          </h2>
          <p>
            <strong>{COMPANY.legalName}</strong>, NIT {COMPANY.nit}, opera la
            tienda <strong>{COMPANY.brandName}</strong> y es responsable del
            sitio. Para contacto:{" "}
            <a
              href={`mailto:${COMPANY.publicEmail}`}
              className="text-[var(--color-iris-700)] hover:underline"
            >
              {COMPANY.publicEmail}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            3. Productos
          </h2>
          <p>
            Vendemos productos naturales y suplementos dietarios provenientes
            de laboratorios colombianos autorizados. Cada producto incluye su
            número de Registro Sanitario INVIMA cuando aplica. Las imágenes y
            descripciones son referenciales. Los productos no reemplazan
            consulta médica ni tratamientos prescritos por profesionales de
            la salud.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            4. Precios y pagos
          </h2>
          <p>
            Los precios se muestran en pesos colombianos (COP) e incluyen IVA
            cuando aplica. Nos reservamos el derecho de actualizar precios sin
            previo aviso. Los pagos se procesan a través de Bold con métodos
            como tarjetas de crédito y débito, PSE, Nequi y QR. La operación
            con la pasarela de pagos se rige por sus propios términos.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            5. Pedidos y envíos
          </h2>
          <p>
            Realizamos despachos a todo el territorio colombiano. Los tiempos
            estimados, costos y condiciones de envío están detallados en la{" "}
            <a
              href="/legal/envios"
              className="text-[var(--color-iris-700)] hover:underline"
            >
              política de envíos
            </a>
            . Los pedidos se procesan después de confirmar el pago.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            6. Derecho de retracto y devoluciones
          </h2>
          <p>
            Conforme a la Ley 1480 de 2011, tienes hasta cinco (5) días hábiles
            desde la entrega para ejercer derecho de retracto en compras
            realizadas por internet, siempre que el producto esté en su empaque
            original sin abrir. Quedan excluidos los productos perecederos y
            aquellos cuyo empaque esté abierto por razones de salubridad. Los
            costos de envío de retorno corren por cuenta del consumidor.
          </p>
          <p className="mt-3">
            Para iniciar un retorno escribe a{" "}
            <a
              href={`mailto:${COMPANY.publicEmail}`}
              className="text-[var(--color-iris-700)] hover:underline"
            >
              {COMPANY.publicEmail}
            </a>{" "}
            con tu número de pedido.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            7. Garantía
          </h2>
          <p>
            Todos los productos cuentan con la garantía legal mínima por
            defectos de fabricación. La garantía no aplica por mal uso,
            consumo posterior a la fecha de vencimiento, o productos que hayan
            sido manipulados de forma indebida.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            8. Propiedad intelectual
          </h2>
          <p>
            Todo el contenido del sitio (textos, imágenes, diseño, marcas) es
            propiedad de {COMPANY.legalName} o de sus respectivos titulares.
            No autorizamos el uso comercial sin permiso explícito por escrito.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            9. Limitación de responsabilidad
          </h2>
          <p>
            No nos hacemos responsables por el uso inadecuado de los productos
            ni por reacciones no previstas. Antes de iniciar cualquier
            suplementación, consulta a un profesional de la salud.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            10. Jurisdicción
          </h2>
          <p>
            Estos términos se rigen por las leyes de la República de Colombia.
            Las controversias se resolverán ante los jueces competentes de la
            ciudad de {COMPANY.addressCity}.
          </p>
        </section>
      </div>
    </article>
  );
}
