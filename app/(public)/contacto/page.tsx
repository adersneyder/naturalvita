import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "../_components/Breadcrumbs";
import { COMPANY } from "@/lib/legal/company-info";
import ContactForm from "./_ContactForm";

export const metadata: Metadata = {
  title: "Contacto",
  description: `Escríbenos. Resolvemos preguntas sobre productos, pedidos, envíos y más en menos de un día hábil. ${COMPANY.brandName}.`,
  alternates: { canonical: `${COMPANY.siteUrl}/contacto` },
  openGraph: {
    title: `Contacto · ${COMPANY.brandName}`,
    description: `Estamos para ayudarte. Te respondemos en menos de un día hábil.`,
    url: `${COMPANY.siteUrl}/contacto`,
    siteName: COMPANY.brandName,
    locale: "es_CO",
    type: "website",
  },
};

export default function ContactoPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Contacto" }]} />

      <header className="mt-6 mb-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-iris-700)] font-medium mb-3">
          Hablemos
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight">
          Estamos para ayudarte
        </h1>
        <p className="mt-3 text-base text-[var(--color-earth-700)] max-w-2xl">
          Pregúntanos sobre productos, pedidos, envíos o devoluciones. Detrás
          de este formulario hay personas reales del equipo, no chatbots. Te
          respondemos en menos de un día hábil.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12">
        {/* Form */}
        <section>
          <h2 className="font-serif text-xl text-[var(--color-leaf-900)] mb-4">
            Escríbenos
          </h2>
          <ContactForm />
        </section>

        {/* Sidebar info contacto */}
        <aside className="space-y-6">
          <article className="p-5 rounded-xl bg-[var(--color-leaf-100)]/50 border border-[var(--color-leaf-700)]/15">
            <h2 className="font-serif text-base text-[var(--color-leaf-900)] mb-3">
              Datos directos
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-[var(--color-leaf-700)] font-medium">
                  Correo
                </dt>
                <dd className="text-[var(--color-leaf-900)] mt-0.5">
                  <a
                    href={`mailto:${COMPANY.publicEmail}`}
                    className="hover:underline break-all"
                  >
                    {COMPANY.publicEmail}
                  </a>
                </dd>
              </div>
              {!COMPANY.publicWhatsapp.startsWith("[") && (
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[var(--color-leaf-700)] font-medium">
                    WhatsApp
                  </dt>
                  <dd className="text-[var(--color-leaf-900)] mt-0.5 tabular-nums">
                    {COMPANY.publicWhatsapp}
                  </dd>
                </div>
              )}
              {!COMPANY.publicPhone.startsWith("[") && (
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[var(--color-leaf-700)] font-medium">
                    Teléfono
                  </dt>
                  <dd className="text-[var(--color-leaf-900)] mt-0.5 tabular-nums">
                    {COMPANY.publicPhone}
                  </dd>
                </div>
              )}
            </dl>
          </article>

          <article className="p-5 rounded-xl bg-white border border-[var(--color-earth-100)]">
            <h2 className="font-serif text-base text-[var(--color-leaf-900)] mb-3">
              Atención al cliente
            </h2>
            <p className="text-sm text-[var(--color-earth-700)] leading-relaxed">
              Lunes a viernes de 8:00 a.m. a 6:00 p.m., y sábados de 9:00 a.m.
              a 1:00 p.m. (hora Colombia). Por fuera de estos horarios igual
              recibimos tu mensaje y te respondemos al siguiente día hábil.
            </p>
          </article>

          <article className="p-5 rounded-xl bg-white border border-[var(--color-earth-100)]">
            <h2 className="font-serif text-base text-[var(--color-leaf-900)] mb-3">
              Antes de escribirnos
            </h2>
            <p className="text-sm text-[var(--color-earth-700)] leading-relaxed mb-3">
              Es probable que la respuesta a tu pregunta esté en nuestra
              sección de preguntas frecuentes. Allí cubrimos pedidos, pagos,
              envíos, devoluciones y productos.
            </p>
            <Link
              href="/preguntas-frecuentes"
              className="inline-block text-sm text-[var(--color-iris-700)] hover:underline font-medium"
            >
              Ver preguntas frecuentes →
            </Link>
          </article>

          <article className="p-5 rounded-xl bg-[var(--color-earth-50)] border border-[var(--color-earth-100)]">
            <h2 className="font-serif text-base text-[var(--color-leaf-900)] mb-2">
              Sobre tu pedido
            </h2>
            <p className="text-sm text-[var(--color-earth-700)] leading-relaxed">
              Si tu mensaje es sobre un pedido en curso, incluye el número de
              pedido (formato <span className="font-mono">NV-AAAAMMDD-XXXX</span>)
              en el asunto o cuerpo. Eso nos permite ayudarte más rápido.
            </p>
          </article>
        </aside>
      </div>
    </div>
  );
}
