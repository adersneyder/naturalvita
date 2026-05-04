import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "../_components/Breadcrumbs";
import { COMPANY } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Sobre nosotros",
  description: `${COMPANY.brandName} es una tienda de suplementos y productos naturales en Colombia. Conoce nuestro modelo de intermediación con laboratorios verificados y nuestro compromiso con la calidad.`,
  alternates: { canonical: `${COMPANY.siteUrl}/sobre-nosotros` },
  openGraph: {
    title: `Sobre nosotros · ${COMPANY.brandName}`,
    description: `Marca colombiana que conecta laboratorios verificados con tu bienestar diario.`,
    url: `${COMPANY.siteUrl}/sobre-nosotros`,
    siteName: COMPANY.brandName,
    locale: "es_CO",
    type: "website",
  },
};

export default function SobreNosotrosPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Sobre nosotros" }]} />

      {/* Hero */}
      <header className="mt-6 mb-12 md:mb-16">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-iris-700)] font-medium mb-3">
          Sobre {COMPANY.brandName}
        </p>
        <h1 className="font-serif text-3xl md:text-5xl text-[var(--color-leaf-900)] tracking-tight leading-[1.1]">
          Conectamos laboratorios colombianos con tu bienestar diario
        </h1>
        <p className="mt-5 text-base md:text-lg text-[var(--color-earth-700)] leading-relaxed max-w-2xl">
          {COMPANY.brandName} es una marca de {COMPANY.parentBrand} que selecciona,
          curaduría y entrega suplementos y productos naturales a hogares en
          toda Colombia. Nuestro modelo es simple: trabajamos con laboratorios
          colombianos verificados y los acercamos a quienes buscan vivir mejor.
        </p>
      </header>

      {/* Misión + visión */}
      <section className="grid md:grid-cols-2 gap-6 mb-12">
        <article className="p-6 md:p-8 rounded-2xl bg-[var(--color-leaf-100)]/50 border border-[var(--color-leaf-700)]/15">
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mb-3">
            Nuestra misión
          </h2>
          <p className="text-sm text-[var(--color-earth-900)] leading-relaxed">
            Hacer que el bienestar natural sea accesible, transparente y
            confiable. Cada producto que listamos cumple con las exigencias
            del INVIMA y proviene de laboratorios cuya trazabilidad podemos
            verificar.
          </p>
        </article>
        <article className="p-6 md:p-8 rounded-2xl bg-[#F8F6FC] border border-[var(--color-iris-700)]/15">
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mb-3">
            Nuestra visión
          </h2>
          <p className="text-sm text-[var(--color-earth-900)] leading-relaxed">
            Ser el puente más confiable entre la industria natural colombiana
            y el consumidor final, expandiéndonos con presencia digital y
            física a las principales ciudades del país en los próximos años.
          </p>
        </article>
      </section>

      {/* Cómo trabajamos */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl md:text-3xl text-[var(--color-leaf-900)] tracking-tight mb-6">
          Cómo trabajamos
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Step
            number="1"
            title="Selección de laboratorios"
            description={`Trabajamos solo con laboratorios colombianos que cuentan con todos sus registros sanitarios al día. Antes de incluir un proveedor verificamos su INVIMA, sus certificados de buenas prácticas de manufactura y la consistencia de su catálogo.`}
          />
          <Step
            number="2"
            title="Curaduría de productos"
            description={`No listamos todo. De cada laboratorio escogemos los productos con mejor reputación, evidencia de uso y demanda real. Si un producto no convence, no entra.`}
          />
          <Step
            number="3"
            title="Entrega directa"
            description={`Recibimos tu pedido, lo despachamos desde Bogotá a toda Colombia con las principales transportadoras. Te acompañamos con seguimiento en tiempo real hasta tu puerta.`}
          />
        </div>
      </section>

      {/* Por qué confiar */}
      <section className="mb-12 p-6 md:p-10 rounded-2xl bg-[var(--color-earth-50)] border border-[var(--color-earth-100)]">
        <h2 className="font-serif text-2xl md:text-3xl text-[var(--color-leaf-900)] tracking-tight mb-6">
          Por qué puedes confiar en nosotros
        </h2>
        <ul className="space-y-4">
          <TrustItem
            title="Cumplimiento INVIMA en cada producto"
            text={`Cada producto en nuestra tienda incluye su número de registro sanitario INVIMA. Lo verificamos antes de publicarlo y lo dejamos visible en la ficha para que tú también puedas confirmarlo en la página oficial del Instituto.`}
          />
          <TrustItem
            title="Pagos seguros con Bold"
            text={`Tus datos financieros nunca pasan por nuestros servidores. Usamos Bold como pasarela de pago, autorizada y supervisada en Colombia, que procesa tarjetas de crédito, PSE, Nequi y QR de forma segura.`}
          />
          <TrustItem
            title="Datos personales protegidos"
            text={`Tratamos tus datos según la ley 1581 de 2012 (habeas data colombiano). Nunca compartimos tu información con terceros para marketing y puedes solicitar su eliminación en cualquier momento.`}
          />
          <TrustItem
            title="Atención humana, no chatbots"
            text={`Detrás del correo ${COMPANY.publicEmail} hay personas reales que responden en horas, no en días. Si algo no salió bien con tu pedido, queremos saberlo y resolverlo.`}
          />
        </ul>
      </section>

      {/* Datos legales */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl text-[var(--color-leaf-900)] tracking-tight mb-4">
          Datos legales
        </h2>
        <dl className="text-sm text-[var(--color-earth-900)] space-y-2">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-[var(--color-earth-700)]">Razón social:</dt>
            <dd className="font-medium">{COMPANY.legalName}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-[var(--color-earth-700)]">NIT:</dt>
            <dd className="font-medium tabular-nums">{COMPANY.nit}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-[var(--color-earth-700)]">Dirección:</dt>
            <dd>
              {COMPANY.addressStreet}, {COMPANY.addressCity},{" "}
              {COMPANY.addressDepartment}, {COMPANY.addressCountry}
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-[var(--color-earth-700)]">Correo:</dt>
            <dd>
              <a
                href={`mailto:${COMPANY.publicEmail}`}
                className="text-[var(--color-iris-700)] hover:underline"
              >
                {COMPANY.publicEmail}
              </a>
            </dd>
          </div>
        </dl>
      </section>

      {/* CTA */}
      <section className="text-center py-10 md:py-14 rounded-2xl bg-[var(--color-leaf-900)] text-white">
        <h2 className="font-serif text-2xl md:text-3xl tracking-tight mb-3">
          Listo para empezar
        </h2>
        <p className="text-white/80 mb-6 max-w-md mx-auto">
          Explora nuestra selección de productos naturales pensados para tu
          bienestar.
        </p>
        <Link
          href="/tienda"
          className="inline-block px-6 py-3 rounded-lg bg-white text-[var(--color-leaf-900)] text-sm font-medium hover:bg-[var(--color-earth-50)] transition-colors"
        >
          Ir a la tienda
        </Link>
      </section>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-white border border-[var(--color-earth-100)]">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-iris-700)] text-white text-sm font-medium mb-3 tabular-nums">
        {number}
      </span>
      <h3 className="font-serif text-base text-[var(--color-leaf-900)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-earth-700)] leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function TrustItem({ title, text }: { title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-[var(--color-leaf-700)] flex items-center justify-center"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <div>
        <h3 className="font-medium text-[var(--color-leaf-900)] mb-1">
          {title}
        </h3>
        <p className="text-sm text-[var(--color-earth-700)] leading-relaxed">
          {text}
        </p>
      </div>
    </li>
  );
}
