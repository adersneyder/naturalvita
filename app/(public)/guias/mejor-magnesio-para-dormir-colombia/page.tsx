import type { Metadata } from "next";
import Link from "next/link";
import ArticleLayout from "../_components/ArticleLayout";
import { loadMentions } from "@/lib/guias/load-mentions";
import { GUIAS_INDEX } from "@/lib/guias/registry";
import { COMPANY } from "@/lib/legal/company-info";

const ENTRY = GUIAS_INDEX.find(
  (g) => g.slug === "mejor-magnesio-para-dormir-colombia",
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

export const revalidate = 604800; // 7 días

export default async function MagnesioParaDormirPage() {
  const productMentions = await loadMentions([
    {
      slug: "cinat-citrato-de-magnesio-liquido-500ml",
      whyMentioned:
        "Citrato de magnesio en presentación líquida. Buena absorción, fácil ajuste de dosis con la cucharita medidora. Útil cuando tragar cápsulas es incómodo.",
    },
    {
      slug: "naturfar-limonada-de-magnesio-250ml",
      whyMentioned:
        "Citrato de magnesio en bebida con sabor cítrico. Pensada para tomar antes de dormir; el sabor ayuda a la adherencia.",
    },
    {
      slug: "millenium-alimentos-citrato-de-magnesio-citrato-de-potasio-sabor-naranja-300-g-300g",
      whyMentioned:
        "Combina citrato de magnesio con citrato de potasio en polvo. Útil para deportistas o quienes pierden electrolitos por sudoración y, además, buscan apoyo al descanso.",
    },
    {
      slug: "naturfar-cloruro-de-magnesiocolgenovit-c-cpsulas-x-90-1u",
      whyMentioned:
        "Cloruro de magnesio en cápsulas con colágeno y vitamina C. El cloruro es más económico que el citrato, aunque su efecto laxante puede ser mayor en dosis altas.",
    },
  ]);

  return (
    <ArticleLayout
      slug={ENTRY.slug}
      title={ENTRY.title}
      dek={ENTRY.dek}
      tldr="Para apoyar el sueño, el citrato y el glicinato de magnesio son las formas con mejor evidencia. La dosis típica es 200–400 mg de magnesio elemental, tomada 30–60 minutos antes de dormir. En Colombia, exige siempre que la etiqueta declare el registro INVIMA y la cantidad de magnesio elemental por porción, no solo el peso de la sal."
      publishedDate={ENTRY.publishedDate}
      updatedDate={ENTRY.updatedDate}
      author={{ name: "Equipo editorial NaturalVita", role: "Curación clínica del catálogo" }}
      readingTime={ENTRY.readingTime}
      heroImage={ENTRY.heroImage}
      sections={[
        {
          id: "por-que-el-magnesio",
          heading: "Por qué el magnesio aparece tanto cuando uno busca dormir mejor",
          body: (
            <>
              <p>
                El magnesio participa en más de 300 reacciones del cuerpo, varias
                de ellas relacionadas con el sistema nervioso. Apoya la función
                normal del músculo, contribuye al funcionamiento del sistema
                nervioso y ayuda a reducir el cansancio según las declaraciones de
                propiedades autorizadas en Europa por la EFSA y reconocidas en
                Colombia por la regulación INVIMA.
              </p>
              <p>
                Quien duerme mal pocas veces tiene <em>una</em> sola causa. El
                magnesio no es un somnífero ni reemplaza la higiene del sueño:
                apoya la relajación y la función nerviosa cuando hay carencia.
                Cuando la dieta es pobre en hojas verdes, granos integrales,
                legumbres y frutos secos, la deficiencia subclínica es frecuente
                y el suplemento puede notarse.
              </p>
            </>
          ),
        },
        {
          id: "formas-de-magnesio",
          heading: "Citrato, cloruro, glicinato, óxido: ¿cuál sirve para dormir?",
          body: (
            <>
              <p>
                No todos los magnesios se absorben igual. Lo que ves en la
                etiqueta es la <strong>sal</strong>: el mineral magnesio va unido
                a otra molécula que cambia su absorción y su tolerancia digestiva.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Citrato de magnesio.</strong> Una de las formas con
                  mejor relación absorción/precio. Tolerancia digestiva buena en
                  dosis estándar. La más común en el mercado colombiano para
                  apoyar descanso.
                </li>
                <li>
                  <strong>Glicinato (o bisglicinato) de magnesio.</strong> Forma
                  quelada de muy buena absorción y muy suave para el intestino.
                  La opción preferida en literatura sobre sueño y ansiedad.
                  Suele ser más costosa.
                </li>
                <li>
                  <strong>Cloruro de magnesio.</strong> Económico, buena
                  biodisponibilidad. Puede tener efecto laxante notable en
                  dosis altas; útil cuando además hay estreñimiento leve.
                </li>
                <li>
                  <strong>Óxido de magnesio.</strong> El más barato, pero su
                  absorción es baja (~4%). Útil principalmente como laxante,
                  poco recomendable como aporte para dormir.
                </li>
              </ul>
              <p>
                Si tu objetivo es descanso y la dosis cuenta, prioriza{" "}
                <strong>citrato</strong> o <strong>glicinato</strong>. Si tu
                presupuesto manda y toleras bien, el cloruro funciona.
              </p>
            </>
          ),
        },
        {
          id: "dosis-correcta",
          heading: "Dosis correcta y cuándo tomarlo",
          body: (
            <>
              <p>
                Para apoyo del sueño la dosis habitual está entre{" "}
                <strong>200 y 400 mg de magnesio elemental</strong>, tomado{" "}
                <strong>30 a 60 minutos antes de acostarse</strong>. El número
                clave es el "magnesio elemental", no el peso del comprimido. Una
                cápsula de "1000 mg de citrato de magnesio" aporta apenas{" "}
                <em>~160 mg</em> de magnesio elemental.
              </p>
              <p>
                La Ingesta Diaria Recomendada para adultos en Colombia ronda los
                300–420 mg/día (todas las fuentes contadas, no solo el
                suplemento). Pasar de 350 mg/día <em>desde suplementos</em>{" "}
                aumenta el riesgo de diarrea sin beneficio extra. Si dudas,
                empieza por 200 mg y observa por dos semanas.
              </p>
              <p>
                Tomar con la cena o el snack nocturno reduce molestias
                gástricas. Evita combinarlo con dosis altas de calcio en la
                misma toma — compiten por el mismo canal de absorción.
              </p>
            </>
          ),
        },
        {
          id: "como-leer-etiqueta",
          heading: "Cómo leer la etiqueta antes de comprar",
          body: (
            <>
              <p>Antes de pagar, comprueba cuatro cosas en la etiqueta:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>
                  <strong>Forma química declarada.</strong> Debe decir
                  explícitamente "citrato de magnesio", "glicinato de magnesio",
                  etc. Si solo dice "magnesio" sin especificar, asume que es
                  óxido (lo más barato).
                </li>
                <li>
                  <strong>Magnesio elemental por porción.</strong> Busca la línea
                  "magnesio" en el cuadro de información nutricional, no el peso
                  total de la sal.
                </li>
                <li>
                  <strong>Registro INVIMA visible.</strong> Cualquier suplemento
                  vendido legalmente en Colombia debe declarar su registro
                  sanitario INVIMA. En NaturalVita aparece en cada ficha y se
                  puede verificar en{" "}
                  <a
                    href="https://datos.invima.gov.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-iris-700)] underline"
                  >
                    datos.invima.gov.co
                  </a>
                  . Si no aparece en ninguna parte, no es legal venderlo.{" "}
                  <Link
                    href="/guias/como-verificar-invima-suplemento"
                    className="text-[var(--color-iris-700)] underline"
                  >
                    Cómo verificarlo paso a paso
                  </Link>
                  .
                </li>
                <li>
                  <strong>Sin promesas médicas exageradas.</strong> "Cura el
                  insomnio" o "elimina la ansiedad" son declaraciones que
                  ningún suplemento puede hacer legalmente. Una etiqueta seria
                  habla de "apoyo", "contribuye a", "ayuda al funcionamiento
                  normal".
                </li>
              </ol>
            </>
          ),
        },
        {
          id: "cuando-evitar",
          heading: "Cuándo no tomarlo (precauciones)",
          body: (
            <p>
              El magnesio en dosis normales es seguro para la mayoría. Consulta
              con tu médico si tienes <strong>insuficiencia renal</strong>{" "}
              (el riñón excreta el exceso; si falla, se acumula), si tomas{" "}
              <strong>diuréticos, antibióticos del grupo de las quinolonas o
              bisfosfonatos</strong> (el magnesio puede interferir con su
              absorción — sepáralos por 2 horas), o si estás{" "}
              <strong>embarazada o lactando</strong>. Suspende y consulta si
              hay diarrea persistente, debilidad muscular o latidos irregulares.
            </p>
          ),
        },
      ]}
      productMentions={productMentions}
      faqs={[
        {
          q: "¿El magnesio es lo mismo que la melatonina?",
          a: "No. La melatonina es una hormona que ajusta el ritmo circadiano (útil sobre todo para desfases de horario y jet lag). El magnesio es un mineral que apoya la relajación muscular y nerviosa. Se pueden tomar juntos, pero no cumplen la misma función.",
        },
        {
          q: "¿Cuánto tarda en notarse el efecto del magnesio para dormir?",
          a: "Algunas personas notan cambios la primera semana (sueño menos fragmentado, menos calambres nocturnos). Otras necesitan 2 a 4 semanas, especialmente si parten de una deficiencia importante. Si después de 4 semanas con la dosis correcta no notas nada, probablemente tu problema de sueño no esté ligado al magnesio.",
        },
        {
          q: "¿Puedo tomar magnesio todos los días, sin descanso?",
          a: "Sí, no se requieren descansos. El magnesio es un mineral que el cuerpo usa diariamente y excreta el exceso por el riñón. Lo que sí conviene es revisar tu dosis: si la dieta mejora (más hojas verdes, granos integrales), quizás necesites menos suplemento.",
        },
        {
          q: "¿Por qué algunos magnesios dan diarrea?",
          a: "Porque el magnesio mal absorbido atrae agua al intestino y acelera el tránsito. Las formas de baja absorción (óxido) y las dosis altas son las que más causan este efecto. Si te pasa, baja la dosis o cambia a citrato/glicinato.",
        },
        {
          q: "¿Importa el momento del día para tomarlo?",
          a: "Si tu objetivo es apoyar el sueño, toma 30–60 minutos antes de acostarte, con la cena o un snack pequeño. Si lo tomas por otro motivo (calambres, energía), reparte en dos tomas diarias para mantener niveles estables.",
        },
      ]}
    />
  );
}
