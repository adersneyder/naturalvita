import type { Metadata } from "next";
import Breadcrumbs from "../../_components/Breadcrumbs";
import { COMPANY } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Política de envíos y devoluciones",
  description:
    "Tiempos, costos y condiciones de envío y devolución para pedidos de NaturalVita en Colombia.",
  alternates: { canonical: "https://naturalvita.co/legal/envios" },
};

export default function EnviosPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <Breadcrumbs
        items={[{ label: "Legal" }, { label: "Política de envíos y devoluciones" }]}
      />

      <header className="mt-6 mb-8">
        <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight">
          Política de envíos y devoluciones
        </h1>
        <p className="mt-3 text-sm text-[var(--color-earth-700)]">
          Vigente desde el 1 de mayo de 2026.
        </p>
      </header>

      <div className="prose-content space-y-6 text-[var(--color-earth-900)] leading-relaxed">
        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            Cobertura
          </h2>
          <p>
            Despachamos a todo el territorio colombiano. Algunas zonas
            apartadas pueden tener tiempos extendidos o costos adicionales,
            que se calculan al momento del pago.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            Tiempos de entrega
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Bogotá y área metropolitana:</strong> 1 a 3 días hábiles.
            </li>
            <li>
              <strong>Ciudades principales:</strong> 2 a 5 días hábiles.
            </li>
            <li>
              <strong>Resto del país:</strong> 3 a 7 días hábiles.
            </li>
          </ul>
          <p className="mt-3">
            Los tiempos cuentan desde la confirmación del pago. Los pedidos
            realizados en fines de semana o festivos se procesan el siguiente
            día hábil.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            Costos
          </h2>
          <p>
            El costo de envío se calcula al ingresar la dirección de entrega
            en el checkout. Aplican costos preferenciales para pedidos
            superiores a un monto mínimo, que se anuncia en el sitio cuando
            está vigente la promoción de envío gratis.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            Seguimiento
          </h2>
          <p>
            Cuando tu pedido sea despachado te enviamos por correo electrónico
            el número de guía y el operador logístico. Puedes consultar el
            estado en tiempo real en el sitio del transportador.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            Cambios y devoluciones
          </h2>
          <p>
            Conforme a la Ley 1480 de 2011, dispones de hasta cinco (5) días
            hábiles desde la entrega para ejercer derecho de retracto en
            compras hechas por internet, siempre que el producto esté en su
            empaque original cerrado.
          </p>
          <p className="mt-3">
            <strong>No aplica retracto</strong> en productos cuyo empaque haya
            sido abierto por razones de salubridad e higiene, en consumibles
            perecederos, ni en productos personalizados.
          </p>
          <p className="mt-3">
            Para iniciar un cambio o devolución, escribe a{" "}
            <a
              href={`mailto:${COMPANY.publicEmail}`}
              className="text-[var(--color-iris-700)] hover:underline"
            >
              {COMPANY.publicEmail}
            </a>{" "}
            indicando tu número de pedido y el motivo. Te respondemos en
            máximo 2 días hábiles con las instrucciones.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            Producto recibido en mal estado
          </h2>
          <p>
            Si tu pedido llega con empaque dañado o producto defectuoso,
            tienes 48 horas desde la entrega para reportarlo con foto a{" "}
            <a
              href={`mailto:${COMPANY.publicEmail}`}
              className="text-[var(--color-iris-700)] hover:underline"
            >
              {COMPANY.publicEmail}
            </a>
            . Reemplazamos el producto sin costo adicional.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            Pedidos no entregados
          </h2>
          <p>
            Si la transportadora no logra entregar el pedido por motivos
            ajenos a nosotros (dirección incompleta, ausencia repetida del
            destinatario), el pedido regresa a nuestras bodegas y te
            contactamos para coordinar nuevo envío. El costo del segundo
            despacho corre por cuenta del cliente.
          </p>
        </section>
      </div>
    </article>
  );
}
