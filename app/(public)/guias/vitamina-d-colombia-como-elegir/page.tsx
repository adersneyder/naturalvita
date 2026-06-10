import type { Metadata } from "next";
import Link from "next/link";
import ArticleLayout from "../_components/ArticleLayout";
import { loadMentions } from "@/lib/guias/load-mentions";
import { GUIAS_INDEX } from "@/lib/guias/registry";
import { COMPANY } from "@/lib/legal/company-info";

const ENTRY = GUIAS_INDEX.find(
  (g) => g.slug === "vitamina-d-colombia-como-elegir",
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

export default async function VitaminaDPage() {
  const productMentions = await loadMentions([
    {
      slug: "millenium-suplementos-dietarios-cal-mag-zinc-plus-vitamina-d-100-softgels-mns-100u",
      whyMentioned:
        "Combina calcio, magnesio, zinc y vitamina D en una sola toma. Opción cómoda para quienes buscan un soporte óseo integral más allá de la vitamina D aislada.",
    },
    {
      slug: "millenium-suplementos-dietarios-calcium-600-vitamina-d-100-softgels-mns-100u",
      whyMentioned:
        "Calcio 600 mg + vitamina D. Útil para mujeres adultas y adultos mayores que necesitan apoyo al calcio óseo junto con la vitamina que mejora su absorción.",
    },
    {
      slug: "millenium-suplementos-dietarios-coral-calcium-1000-mg-vitamin-d-60-softgels-mns-60u",
      whyMentioned:
        "Coral calcium con vitamina D. Dosis más alta de calcio (1000 mg) en menos cápsulas. Para quienes buscan reducir el número de tomas diarias.",
    },
  ]);

  return (
    <ArticleLayout
      slug={ENTRY.slug}
      title={ENTRY.title}
      dek={ENTRY.dek}
      tldr="La deficiencia de vitamina D es frecuente en Colombia pese al sol, sobre todo en quienes trabajan en oficina, viven en zonas urbanas o usan protector solar a diario. La dosis de mantenimiento típica para adultos es 1000–2000 UI/día. Si hay deficiencia confirmada por examen, el médico puede indicar dosis más altas por tiempo limitado. Toma la cápsula con una comida que tenga grasa para que se absorba (es vitamina liposoluble)."
      publishedDate={ENTRY.publishedDate}
      updatedDate={ENTRY.updatedDate}
      author={{ name: "Equipo editorial NaturalVita", role: "Curación clínica del catálogo" }}
      readingTime={ENTRY.readingTime}
      heroImage={ENTRY.heroImage}
      sections={[
        {
          id: "por-que-falta-en-colombia",
          heading: "Si hay tanto sol en Colombia, ¿por qué falta vitamina D?",
          body: (
            <>
              <p>
                Suena contraintuitivo, pero estudios en ciudades colombianas
                muestran prevalencias de insuficiencia de vitamina D del 40%
                al 60% en adultos urbanos. Las razones se acumulan:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Horarios de oficina (entrada antes de las 8, salida después
                  de las 5) coinciden con las horas en que la radiación UVB
                  hace al cuerpo sintetizar vitamina D.
                </li>
                <li>
                  El uso diario de protector solar — correcto para prevenir
                  cáncer de piel — bloquea también la síntesis cutánea.
                </li>
                <li>
                  Tonos de piel más oscuros requieren más exposición para la
                  misma síntesis.
                </li>
                <li>
                  Vidas indoor: trabajo, transporte, gimnasio, casa.
                </li>
                <li>
                  Pocos alimentos la aportan en cantidades útiles (pescados
                  grasos, huevo, lácteos fortificados).
                </li>
              </ul>
              <p>
                El resultado: el sol que hay no necesariamente se traduce en
                la vitamina D que el cuerpo necesita.
              </p>
            </>
          ),
        },
        {
          id: "como-saber-si-falta",
          heading: "Cómo saber si te falta (sin adivinar)",
          body: (
            <>
              <p>
                La forma seria es el examen{" "}
                <strong>25-hidroxivitamina D (25-OH-D)</strong> en sangre. Se
                pide con orden médica en cualquier laboratorio del POS o
                privado. Interpretación general:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>&lt; 20 ng/mL:</strong> deficiencia. Requiere dosis
                  terapéutica indicada por médico.
                </li>
                <li>
                  <strong>20–30 ng/mL:</strong> insuficiencia. Suplementación
                  de mantenimiento recomendable.
                </li>
                <li>
                  <strong>30–60 ng/mL:</strong> rango óptimo.
                </li>
                <li>
                  <strong>&gt; 100 ng/mL:</strong> posible exceso.
                </li>
              </ul>
              <p>
                Sin examen, una suplementación de mantenimiento (1000–2000
                UI/día) es segura para la mayoría de adultos sanos y rara vez
                lleva al exceso. Pero si tienes síntomas (fatiga persistente,
                dolor óseo difuso, infecciones respiratorias frecuentes),
                pedir el examen vale la pena.
              </p>
            </>
          ),
        },
        {
          id: "dosis-y-formas",
          heading: "Dosis: D3 vs D2, cuántas UI y con qué tomarla",
          body: (
            <>
              <p>
                <strong>D3 (colecalciferol)</strong> es la forma que el cuerpo
                produce con el sol y la que se encuentra en alimentos de origen
                animal. Es la más usada en suplementos y la que mejor eleva
                niveles en sangre. La <strong>D2 (ergocalciferol)</strong> es
                vegetal y se metaboliza menos eficientemente. Si tienes la
                opción, elige D3.
              </p>
              <p>Dosis típicas por escenario (siempre con criterio médico):</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Mantenimiento adulto sano:</strong> 1000–2000 UI/día.
                </li>
                <li>
                  <strong>Adultos mayores (&gt;65 años):</strong> 2000 UI/día
                  es razonable por la menor síntesis cutánea.
                </li>
                <li>
                  <strong>Deficiencia confirmada:</strong> el médico puede
                  indicar 50 000 UI semanales por 6–8 semanas y luego pasar a
                  mantenimiento. No automediques estas dosis.
                </li>
                <li>
                  <strong>Embarazo y lactancia:</strong> 600–1000 UI/día con
                  acompañamiento obstétrico.
                </li>
              </ul>
              <p>
                <strong>Cómo tomarla:</strong> con una comida que contenga
                grasa (almuerzo o cena). Es liposoluble, así que sin grasa se
                absorbe menos. Una cápsula al día es más cómodo que repartir.
              </p>
            </>
          ),
        },
        {
          id: "complementos",
          heading: "Vitamina D no anda sola: calcio, magnesio y vitamina K2",
          body: (
            <>
              <p>
                La vitamina D ayuda a absorber el calcio. Si la dieta es muy
                pobre en lácteos y no se compensa, sumar vitamina D sin calcio
                no mejora la salud ósea. Por eso muchas presentaciones
                combinan <strong>calcio + vitamina D</strong> en una misma
                cápsula.
              </p>
              <p>
                El <strong>magnesio</strong> participa en la activación de la
                vitamina D en el riñón y el hígado. En presencia de
                deficiencia importante de magnesio, la vitamina D no puede
                cumplir su función plena. Si suplementas alto en D, vale
                revisar también el aporte de magnesio (idealmente desde la
                dieta).{" "}
                <Link
                  href="/guias/mejor-magnesio-para-dormir-colombia"
                  className="text-[var(--color-iris-700)] underline"
                >
                  Más sobre magnesio →
                </Link>
              </p>
              <p>
                La <strong>vitamina K2</strong> ayuda a que el calcio se
                deposite en el hueso y no en arterias. Para quien suplementa
                D + calcio a dosis altas y por tiempo prolongado, K2 es una
                discusión razonable con su médico, no obligatoria para
                mantenimiento.
              </p>
            </>
          ),
        },
        {
          id: "errores",
          heading: "Errores comunes al comprar",
          body: (
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong>Confundir UI con mg.</strong> 1000 UI ≈ 25 µg. Si la
                etiqueta dice "vitamina D 25 mg" probablemente quisieron decir
                25 µg o el suplemento es sospechoso.
              </li>
              <li>
                <strong>Comprar D sin saber si te falta calcio.</strong> Si
                consumes pocos lácteos, una D pura suele ser insuficiente;
                conviene D+calcio.
              </li>
              <li>
                <strong>Tomarla con el desayuno bajo en grasa.</strong> Café
                con tostada apenas tiene grasa y la absorción cae. Mejor con
                el almuerzo o la cena.
              </li>
              <li>
                <strong>No verificar INVIMA.</strong> Productos importados
                informales pueden no tener registro válido en Colombia.{" "}
                <Link
                  href="/guias/como-verificar-invima-suplemento"
                  className="text-[var(--color-iris-700)] underline"
                >
                  Cómo verificar
                </Link>
                .
              </li>
            </ol>
          ),
        },
      ]}
      productMentions={productMentions}
      faqs={[
        {
          q: "¿La vitamina D engorda?",
          a: "No. La vitamina D es una vitamina liposoluble que regula el calcio y participa en funciones inmunes. Las cápsulas más vendidas tienen menos de 1 caloría. No produce aumento de peso por sí misma.",
        },
        {
          q: "¿Puedo tomar 5000 UI/día por mi cuenta?",
          a: "Mejor no si no tienes examen. La toxicidad por vitamina D es rara pero ocurre con dosis muy altas mantenidas en el tiempo. Para mantenimiento sin examen, quédate en 1000–2000 UI/día. Si crees que necesitas más, pide el examen de 25-OH-D primero.",
        },
        {
          q: "¿Qué pasa si dejo de tomarla?",
          a: "Los niveles bajan en semanas o pocos meses, especialmente si el motivo de la suplementación (vida indoor, dieta pobre en pescado) no cambió. La vitamina D no se acumula 'para siempre' como mito popular.",
        },
        {
          q: "¿La vitamina D protege del COVID-19 u otras infecciones?",
          a: "La vitamina D contribuye al funcionamiento normal del sistema inmune (declaración EFSA reconocida). La evidencia sobre prevención específica de COVID-19 es mixta y no autoriza claims de tratamiento. La línea segura es: mantener niveles normales aporta a la respuesta inmune general; no es una cura ni reemplazo de la vacuna.",
        },
        {
          q: "¿Puedo tomarla durante el embarazo?",
          a: "Sí, con dosis bajas (600–1000 UI/día es lo más respaldado) y siempre con tu médico obstetra. La deficiencia en embarazo se asocia con riesgos para la madre y el bebé, pero el exceso también; el seguimiento profesional es clave.",
        },
      ]}
    />
  );
}
