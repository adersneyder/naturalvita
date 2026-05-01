import type { Metadata } from "next";
import Breadcrumbs from "../../_components/Breadcrumbs";
import { COMPANY } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Política de tratamiento de datos personales",
  description:
    "Política de tratamiento de datos personales de NaturalVita / Everlife Colombia, conforme a la ley 1581 de 2012.",
  alternates: { canonical: "https://naturalvita.co/legal/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <Breadcrumbs
        items={[{ label: "Legal" }, { label: "Política de tratamiento de datos" }]}
      />

      <header className="mt-6 mb-8">
        <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight">
          Política de tratamiento de datos personales
        </h1>
        <p className="mt-3 text-sm text-[var(--color-earth-700)]">
          Vigente desde el 1 de mayo de 2026. Última actualización: 1 de mayo de 2026.
        </p>
      </header>

      <div className="prose-content space-y-6 text-[var(--color-earth-900)] leading-relaxed">
        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            1. Responsable del tratamiento
          </h2>
          <p>
            <strong>{COMPANY.legalName}</strong>, identificada con NIT{" "}
            <strong>{COMPANY.nit}</strong>, con domicilio en{" "}
            {COMPANY.addressStreet}, {COMPANY.addressCity},{" "}
            {COMPANY.addressDepartment}, {COMPANY.addressCountry}, opera la
            tienda <strong>{COMPANY.brandName}</strong> en el dominio{" "}
            <a
              href={COMPANY.siteUrl}
              className="text-[var(--color-iris-700)] hover:underline"
            >
              {COMPANY.siteUrl.replace(/^https?:\/\//, "")}
            </a>
            . Para asuntos relacionados con tus datos personales puedes
            contactarnos en{" "}
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
            2. Marco legal
          </h2>
          <p>
            Esta política se rige por la Ley 1581 de 2012, el Decreto 1377 de
            2013 y las demás normas que las modifiquen, complementen o
            sustituyan en materia de protección de datos personales en Colombia.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            3. Datos que recolectamos
          </h2>
          <p>Recolectamos los siguientes datos personales:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Datos de identificación: nombre, tipo y número de documento.</li>
            <li>Datos de contacto: correo electrónico, teléfono.</li>
            <li>Datos de envío: dirección, ciudad, departamento.</li>
            <li>Datos de la transacción: productos comprados, montos, fecha.</li>
            <li>
              Datos de navegación: páginas visitadas, dispositivo, dirección IP
              (solo si has aceptado cookies de analítica).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            4. Finalidad del tratamiento
          </h2>
          <p>Tus datos se usan exclusivamente para:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Procesar y entregar tus pedidos.</li>
            <li>Enviar comunicaciones transaccionales (confirmaciones, envíos).</li>
            <li>Atender solicitudes de soporte y devoluciones.</li>
            <li>
              Cumplir obligaciones legales (facturación, registros contables).
            </li>
            <li>
              Si autorizas marketing: enviarte recomendaciones, ofertas y
              novedades de la marca. Puedes retirar este consentimiento en
              cualquier momento.
            </li>
            <li>
              Si autorizas analítica: medir cómo usas el sitio para mejorarlo.
              Los datos son agregados y no se comparten con terceros con fines
              de venta.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            5. Derechos del titular
          </h2>
          <p>Como titular de los datos tienes derecho a:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Conocer, actualizar y rectificar tus datos.</li>
            <li>Solicitar prueba del consentimiento otorgado.</li>
            <li>Ser informado sobre el uso de tus datos.</li>
            <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
            <li>
              Revocar el consentimiento y solicitar la supresión de los datos
              cuando no se respete la ley.
            </li>
            <li>Acceder de forma gratuita a tus datos.</li>
          </ul>
          <p className="mt-3">
            Para ejercer estos derechos escríbenos a{" "}
            <a
              href={`mailto:${COMPANY.publicEmail}`}
              className="text-[var(--color-iris-700)] hover:underline"
            >
              {COMPANY.publicEmail}
            </a>{" "}
            con asunto &quot;Derechos Habeas Data&quot;. Respondemos en máximo
            quince (15) días hábiles.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            6. Encargados del tratamiento
          </h2>
          <p>
            Para operar el sitio usamos proveedores que actúan como encargados
            del tratamiento bajo contratos que los obligan al mismo nivel de
            protección que esta política:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Supabase Inc. (Estados Unidos): base de datos y autenticación.</li>
            <li>Vercel Inc. (Estados Unidos): hosting del sitio.</li>
            <li>Bold S.A.S. (Colombia): procesamiento de pagos.</li>
            <li>Klaviyo Inc. (Estados Unidos): emails transaccionales y marketing.</li>
            <li>
              Microsoft Corporation (Estados Unidos): Clarity, analítica de
              comportamiento (solo con tu consentimiento).
            </li>
          </ul>
          <p className="mt-3">
            La transferencia internacional de datos hacia estos proveedores se
            realiza con base en cláusulas contractuales tipo y mecanismos
            equivalentes que garantizan un nivel adecuado de protección.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            7. Conservación de los datos
          </h2>
          <p>
            Conservamos tus datos durante el tiempo necesario para cumplir las
            finalidades descritas y los plazos legales. Los datos de
            transacciones se conservan al menos cinco (5) años por obligaciones
            tributarias. Puedes solicitar la supresión de los datos cuando ya
            no exista una obligación legal de mantenerlos.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            8. Cookies
          </h2>
          <p>
            Usamos cookies estrictamente necesarias para el funcionamiento del
            sitio (sesión y carrito). Otras cookies (analítica y marketing)
            solo se activan si aceptas explícitamente en el banner de
            consentimiento que aparece en tu primera visita. Puedes cambiar
            tus preferencias en cualquier momento limpiando los datos del sitio
            en tu navegador.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mt-8 mb-3">
            9. Cambios en la política
          </h2>
          <p>
            Esta política puede actualizarse para reflejar cambios legales o
            mejoras del servicio. Cuando los cambios sean sustanciales lo
            notificaremos por correo a los clientes registrados. La fecha de
            última actualización aparece al inicio del documento.
          </p>
        </section>
      </div>
    </article>
  );
}
