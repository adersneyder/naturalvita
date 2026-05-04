import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "../_components/Breadcrumbs";
import { COMPANY } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: `Respuestas a las preguntas más comunes sobre pedidos, envíos, pagos, devoluciones y productos en ${COMPANY.brandName}.`,
  alternates: { canonical: `${COMPANY.siteUrl}/preguntas-frecuentes` },
  openGraph: {
    title: `Preguntas frecuentes · ${COMPANY.brandName}`,
    description: `Pedidos, envíos, pagos, devoluciones y productos.`,
    url: `${COMPANY.siteUrl}/preguntas-frecuentes`,
    siteName: COMPANY.brandName,
    locale: "es_CO",
    type: "website",
  },
};

/**
 * Datos. Cada item: { category, q, a }. La categoría agrupa visualmente.
 * Mantén las respuestas honestas: no prometas tiempos que no podemos
 * cumplir, no afirmes propiedades médicas que el INVIMA no respalda.
 */
const FAQ_ITEMS = [
  // Pedidos y compra
  {
    category: "Pedidos y compra",
    q: "¿Cómo hago un pedido?",
    a: `Encuentra el producto que quieres, agrégalo al carrito desde la ficha o desde el listado, y cuando estés listo ve a "Mi carrito" en la parte superior. Allí verás el total con envío incluido y podrás continuar al pago. No necesitas crear cuenta para comprar, pero si lo haces guardamos tus direcciones para próximas compras.`,
  },
  {
    category: "Pedidos y compra",
    q: "¿Necesito crear cuenta para comprar?",
    a: `No. Puedes hacer toda tu compra como invitado y solo te pediremos correo, teléfono y dirección para enviarte el pedido. Si decides crear cuenta después, asociaremos automáticamente los pedidos hechos con el mismo correo.`,
  },
  {
    category: "Pedidos y compra",
    q: "¿Puedo modificar o cancelar un pedido después de pagarlo?",
    a: `Sí, mientras el pedido no haya sido despachado. Escríbenos a ${COMPANY.publicEmail} con tu número de pedido y te ayudamos. Si ya está en tránsito, debes esperar a recibirlo y aplicar el proceso de devolución.`,
  },

  // Pagos
  {
    category: "Pagos",
    q: "¿Qué medios de pago aceptan?",
    a: `Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express, Diners), PSE (débito desde tu banco), Nequi y código QR. Todos los pagos se procesan a través de Bold, una pasarela de pago colombiana autorizada y supervisada.`,
  },
  {
    category: "Pagos",
    q: "¿Mis datos de tarjeta están seguros?",
    a: `Sí. Nunca pasan por nuestros servidores. Cuando llegas al paso de pago, Bold gestiona toda la captura y procesamiento bajo estándares PCI DSS, los mismos que usan los grandes bancos. Nosotros solo recibimos la confirmación de que el pago fue aprobado.`,
  },
  {
    category: "Pagos",
    q: "¿Por qué mi pago fue rechazado?",
    a: `Las razones más comunes son: cupo insuficiente, tarjeta no autorizada para compras en línea, tarjeta vencida, o el banco bloqueó la transacción por seguridad. Verifica con tu banco o intenta con otro medio. Si el problema persiste, escríbenos a ${COMPANY.publicEmail}.`,
  },
  {
    category: "Pagos",
    q: "¿En qué moneda están los precios?",
    a: `Todos los precios están en pesos colombianos (COP) con IVA incluido. No realizamos conversiones a otras monedas; si tu tarjeta es internacional, tu banco hará la conversión al cambio del día.`,
  },

  // Envíos
  {
    category: "Envíos",
    q: "¿A qué ciudades hacen envíos?",
    a: `Despachamos a toda Colombia, incluyendo capitales de departamento, ciudades intermedias y municipios. El costo y tiempo varían por zona; lo verás antes de pagar al ingresar tu dirección.`,
  },
  {
    category: "Envíos",
    q: "¿Cuánto demora la entrega?",
    a: `Entre 2 y 5 días hábiles según el destino. Bogotá y municipios cercanos: 1 a 2 días. Capitales de departamento: 2 a 3 días. Municipios alejados: 3 a 5 días. El tiempo cuenta desde que el pedido es despachado, no desde que se hace el pago.`,
  },
  {
    category: "Envíos",
    q: "¿Cómo rastreo mi pedido?",
    a: `Cuando despachemos tu pedido recibirás un correo con el número de guía y un botón para rastrear directo en la página de la transportadora. También puedes ver el estado y el botón de rastreo en "Mi cuenta → Pedidos" en cualquier momento.`,
  },
  {
    category: "Envíos",
    q: "¿Qué transportadoras usan?",
    a: `Trabajamos con las principales del país: Servientrega, Coordinadora, Interrapidísimo, Envia.co, Deprisa y otras según la zona. Elegimos la transportadora con mejor cobertura y velocidad para cada destino.`,
  },

  // Devoluciones
  {
    category: "Devoluciones",
    q: "¿Puedo devolver un producto si no me gusta?",
    a: `Sí, dentro de los 5 días hábiles siguientes a recibir tu pedido, conforme a la ley colombiana de protección al consumidor (Estatuto del Consumidor, ley 1480 de 2011). El producto debe estar sin abrir, sin uso y en su empaque original. Lee los detalles en nuestra <a href="/legal/envios" class="text-[var(--color-iris-700)] underline">política de envíos y devoluciones</a>.`,
  },
  {
    category: "Devoluciones",
    q: "¿Qué pasa si llega un producto defectuoso o equivocado?",
    a: `Escríbenos a ${COMPANY.publicEmail} dentro de las primeras 48 horas con foto del producto y de la guía. Coordinamos la recogida sin costo y te enviamos el producto correcto o te reembolsamos el valor total a tu medio de pago original.`,
  },
  {
    category: "Devoluciones",
    q: "¿Cuánto demora un reembolso?",
    a: `Una vez aprobado el reembolso, el dinero llega a tu medio de pago original entre 3 y 10 días hábiles. El tiempo exacto depende de tu banco; nosotros lo procesamos el mismo día que aprobamos la devolución.`,
  },

  // Productos
  {
    category: "Productos",
    q: "¿Sus productos están aprobados por el INVIMA?",
    a: `Sí. Cada producto que vendemos cuenta con su número de registro sanitario INVIMA, visible en la ficha del producto. Solo trabajamos con laboratorios colombianos legalmente constituidos que cumplen los requisitos del Instituto Nacional de Vigilancia de Medicamentos y Alimentos.`,
  },
  {
    category: "Productos",
    q: "¿Pueden recomendarme un producto para una condición específica?",
    a: `No. Los suplementos y productos naturales que vendemos no son medicamentos ni reemplazan tratamientos médicos. Antes de iniciar cualquier suplemento, consulta con tu médico, especialmente si estás tomando medicación, en embarazo o lactancia, o si tienes alguna condición de salud previa.`,
  },
  {
    category: "Productos",
    q: "¿Los productos son originales?",
    a: `Sí. Compramos directamente a los laboratorios fabricantes, no a distribuidores intermedios ni revendedores. Cada lote llega con su factura y trazabilidad documentada.`,
  },
  {
    category: "Productos",
    q: "¿Por qué no encuentro un producto que vi antes en la tienda?",
    a: `Si un producto deja de aparecer es porque se agotó temporalmente o porque el laboratorio dejó de fabricarlo. Si te interesa un producto puntual que no encuentras, escríbenos a ${COMPANY.publicEmail} y te avisamos cuando vuelva al inventario.`,
  },

  // Cuenta y datos
  {
    category: "Cuenta y datos",
    q: "¿Cómo accedo a mi cuenta?",
    a: `Vamos a "Iniciar sesión" en la parte superior. Te enviamos un enlace mágico al correo: das un solo click y entras. No usamos contraseñas porque son una de las principales causas de hackeos.`,
  },
  {
    category: "Cuenta y datos",
    q: "¿Cómo elimino mi cuenta y mis datos?",
    a: `Escríbenos a ${COMPANY.publicEmail} con el asunto "Solicitud de eliminación de datos". Procesamos la solicitud en menos de 15 días hábiles, conforme a la ley 1581 de 2012. Conservamos solo la información que la ley nos exige (facturación e historial fiscal).`,
  },
];

// Agrupar por categoría preservando el orden
const FAQ_BY_CATEGORY = FAQ_ITEMS.reduce<Record<string, typeof FAQ_ITEMS>>(
  (acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  },
  {},
);

const CATEGORY_ORDER = Array.from(new Set(FAQ_ITEMS.map((i) => i.category)));

export default function FAQPage() {
  // JSON-LD Schema.org FAQPage para que Google muestre rich snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        // Quitamos HTML del schema (Google no lo procesa bien)
        text: item.a.replace(/<[^>]+>/g, ""),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <Breadcrumbs items={[{ label: "Preguntas frecuentes" }]} />

        <header className="mt-6 mb-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-iris-700)] font-medium mb-3">
            Ayuda
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-leaf-900)] tracking-tight">
            Preguntas frecuentes
          </h1>
          <p className="mt-3 text-base text-[var(--color-earth-700)]">
            Si no encuentras respuesta a tu pregunta, escríbenos a{" "}
            <a
              href={`mailto:${COMPANY.publicEmail}`}
              className="text-[var(--color-iris-700)] hover:underline"
            >
              {COMPANY.publicEmail}
            </a>{" "}
            o desde nuestra{" "}
            <Link
              href="/contacto"
              className="text-[var(--color-iris-700)] hover:underline"
            >
              página de contacto
            </Link>
            .
          </p>
        </header>

        <div className="space-y-10">
          {CATEGORY_ORDER.map((category) => (
            <section key={category}>
              <h2 className="font-serif text-xl text-[var(--color-leaf-900)] tracking-tight mb-4">
                {category}
              </h2>
              <ul className="space-y-2">
                {FAQ_BY_CATEGORY[category].map((item, idx) => (
                  <li key={idx}>
                    <details className="group rounded-xl bg-white border border-[var(--color-earth-100)] hover:border-[var(--color-leaf-700)]/30 transition-colors open:border-[var(--color-leaf-700)]/30">
                      <summary className="cursor-pointer list-none px-5 py-4 flex items-start justify-between gap-3">
                        <span className="font-medium text-[var(--color-leaf-900)] text-sm md:text-base leading-snug">
                          {item.q}
                        </span>
                        <span
                          aria-hidden
                          className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-[var(--color-earth-50)] flex items-center justify-center text-[var(--color-leaf-700)] group-open:rotate-45 transition-transform"
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </span>
                      </summary>
                      <div
                        className="px-5 pb-4 text-sm text-[var(--color-earth-900)] leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: item.a }}
                      />
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* CTA inferior */}
        <div className="mt-12 p-6 md:p-8 rounded-2xl bg-[var(--color-leaf-100)]/50 border border-[var(--color-leaf-700)]/15 text-center">
          <h3 className="font-serif text-lg text-[var(--color-leaf-900)] mb-2">
            ¿Tu pregunta no está aquí?
          </h3>
          <p className="text-sm text-[var(--color-earth-700)] mb-4">
            Escríbenos y te respondemos en menos de un día hábil.
          </p>
          <Link
            href="/contacto"
            className="inline-block px-5 py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)]"
          >
            Ir a contacto
          </Link>
        </div>
      </div>
    </>
  );
}
