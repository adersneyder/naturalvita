import type { Metadata } from "next";
import Link from "next/link";
import ArticleLayout from "../_components/ArticleLayout";
import { loadMentions } from "@/lib/guias/load-mentions";
import { GUIAS_INDEX } from "@/lib/guias/registry";
import { COMPANY } from "@/lib/legal/company-info";

const ENTRY = GUIAS_INDEX.find(
  (g) => g.slug === "multivitaminico-mujer-colombia",
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

export default async function MultivitaminicoMujerPage() {
  const productMentions = await loadMentions([
    {
      slug: "millenium-suplementos-dietarios-balanced-b-super-complex-100-softgels-mns-100u",
      whyMentioned:
        "Complejo B completo. Útil para mujeres con dietas vegetarianas o veganas (B12 limitada) y para quienes toman anticonceptivos orales (asociados a déficit subclínico de B6 y folatos).",
    },
    {
      slug: "millenium-suplementos-dietarios-cal-mag-zinc-plus-vitamina-d-100-softgels-mns-100u",
      whyMentioned:
        "Calcio + magnesio + zinc + vit D en una toma. Para perimenopausia y menopausia, donde la salud ósea pasa a primer plano.",
    },
    {
      slug: "naturfar-biotinazincselenio-cpsulas-x-60-1u",
      whyMentioned:
        "Biotina + zinc + selenio. Combinación clásica para apoyar piel, cabello y uñas en adultas que reportan caída de cabello o uñas frágiles.",
    },
    {
      slug: "millenium-suplementos-dietarios-folic-100-softgels-mns-100u",
      whyMentioned:
        "Ácido fólico. Esencial en preconcepción y primer trimestre de embarazo. La OMS recomienda 400 mcg/día desde antes de buscar embarazo.",
    },
  ]);

  return (
    <ArticleLayout
      slug={ENTRY.slug}
      title={ENTRY.title}
      dek={ENTRY.dek}
      tldr="No existe un 'mejor multivitamínico para mujer' universal: las necesidades cambian con la edad, la dieta y la etapa reproductiva. Lo más útil es identificar tres o cuatro nutrientes que probablemente te falten (hierro en edad fértil, ácido fólico antes y durante embarazo, calcio + vitamina D en menopausia, B12 si eres vegetariana) y suplementar esos con dosis específicas, en lugar de un multi genérico con 30 ingredientes a dosis insuficientes."
      publishedDate={ENTRY.publishedDate}
      updatedDate={ENTRY.updatedDate}
      author={{ name: "Equipo editorial NaturalVita", role: "Curación clínica del catálogo" }}
      readingTime={ENTRY.readingTime}
      heroImage={ENTRY.heroImage}
      sections={[
        {
          id: "estrategia",
          heading: "Por qué 'un multi para todas' rara vez es la mejor opción",
          body: (
            <>
              <p>
                La industria vende multivitamínicos como si la deficiencia
                fuera un fenómeno único. En la práctica, las mujeres adultas
                en Colombia tienen necesidades muy distintas según etapa de
                vida:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>20–35 años, edad fértil:</strong> ácido fólico (si
                  hay posibilidad de embarazo), hierro (las menstruaciones
                  pierden hierro mes a mes), vitamina D, B12 si dieta es
                  vegetariana.
                </li>
                <li>
                  <strong>35–45 años:</strong> a las anteriores se suma
                  preocupación por colágeno y antioxidantes (cambios de piel),
                  magnesio para sueño y estrés.
                </li>
                <li>
                  <strong>Perimenopausia y menopausia (45+):</strong> calcio +
                  vitamina D pasan a primera línea por la pérdida ósea
                  acelerada; magnesio para sofocos y sueño; omega-3 para perfil
                  cardiovascular.
                </li>
                <li>
                  <strong>Preconcepción y embarazo:</strong> ácido fólico
                  400–800 mcg/día desde 3 meses antes de buscar embarazo,
                  hierro según indicación obstétrica, DHA en el tercer
                  trimestre.
                </li>
              </ul>
              <p>
                Un multi genérico cubre poco de mucho. A dosis ridículas (10%
                de la IDR de cada cosa) no te resuelve ninguna deficiencia
                real. La estrategia más útil: identificar 2–4 nutrientes
                relevantes para tu caso y suplementarlos a dosis efectivas.
              </p>
            </>
          ),
        },
        {
          id: "nutrientes-clave",
          heading: "Los nutrientes que importan, por etapa",
          body: (
            <>
              <p>
                <strong>Ácido fólico (folato):</strong> 400 mcg/día como mínimo
                en preconcepción y primer trimestre. Reduce el riesgo de
                defectos del tubo neural. No esperes a saber que estás
                embarazada para empezar.
              </p>
              <p>
                <strong>Hierro:</strong> las mujeres con menstruaciones
                abundantes y dietas bajas en carne roja tienen mayor riesgo de
                deficiencia. Si te falta, vas a notar fatiga, palidez, caída
                de cabello. Un examen de ferritina sérica es lo que orienta;
                el hierro suplementado sin necesidad puede causar molestias y
                no se acumula bien.
              </p>
              <p>
                <strong>Calcio + vitamina D:</strong> después de los 50 años, la
                pérdida ósea acelera. La dieta debe aportar la mayor parte del
                calcio (lácteos, pescados pequeños con espina, semillas). La
                vit D ayuda a su absorción. {" "}
                <Link
                  className="text-[var(--color-iris-700)] underline"
                  href="/guias/vitamina-d-colombia-como-elegir"
                >
                  Más sobre vit D
                </Link>
                .
              </p>
              <p>
                <strong>Magnesio:</strong> apoya sueño, manejo del estrés y
                función muscular. Útil en menopausia para sofocos nocturnos.{" "}
                <Link
                  className="text-[var(--color-iris-700)] underline"
                  href="/guias/mejor-magnesio-para-dormir-colombia"
                >
                  Más sobre magnesio
                </Link>
                .
              </p>
              <p>
                <strong>Vitaminas del grupo B:</strong> B12 es crítica si eres
                vegetariana o vegana; B6 y folatos pueden caer con
                anticonceptivos orales de uso prolongado.
              </p>
              <p>
                <strong>Omega-3 (EPA/DHA):</strong> antiinflamatorio,
                cardiovascular, brain-friendly. Si no comes pescado graso 2
                veces por semana, suplementar tiene sentido.
              </p>
              <p>
                <strong>Colágeno:</strong> opcional pero con evidencia en piel
                y articulaciones a partir de los 35 años.{" "}
                <Link
                  className="text-[var(--color-iris-700)] underline"
                  href="/guias/colageno-hidrolizado-como-elegir"
                >
                  Más sobre colágeno
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          id: "leer-etiqueta",
          heading: "Cómo leer una etiqueta de multivitamínico",
          body: (
            <>
              <p>
                Cuando mires un multi en góndola, revisa cuatro cosas:
              </p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>
                  <strong>Forma química de los nutrientes.</strong> "Vitamina E
                  como d-alfa-tocoferol" (forma natural) absorbe mejor que
                  "dl-alfa-tocoferol" (sintética). "Folato como metilfolato"
                  funciona mejor que "ácido fólico" para quienes tienen
                  polimorfismos MTHFR. Estos detalles importan.
                </li>
                <li>
                  <strong>Dosis vs IDR.</strong> Apunta a productos que cubran
                  100% de la IDR de los nutrientes que necesitas; menos no te
                  resuelve nada.
                </li>
                <li>
                  <strong>Hierro: solo si te falta.</strong> Un multi con
                  hierro que no necesitas puede causar molestias gástricas y
                  estrés oxidativo. Mejor dos productos por separado: un multi
                  sin hierro + un hierro si tu médico lo indica.
                </li>
                <li>
                  <strong>Registro INVIMA.</strong> No negociable.{" "}
                  <Link
                    className="text-[var(--color-iris-700)] underline"
                    href="/guias/como-verificar-invima-suplemento"
                  >
                    Cómo verificar
                  </Link>
                  .
                </li>
              </ol>
            </>
          ),
        },
        {
          id: "errores",
          heading: "Errores comunes (y costosos)",
          body: (
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Comprar el más completo posible</strong> creyendo que
                más ingredientes = mejor. La realidad: dosis insuficientes en
                todos los componentes y mayor riesgo de interacciones.
              </li>
              <li>
                <strong>Tomar hierro por rutina sin examen.</strong> Si tu
                ferritina está bien, suplementar hierro causa molestias y no
                aporta. Si está baja, el médico ajusta dosis específica.
              </li>
              <li>
                <strong>Cambiar de marca cada mes.</strong> La consistencia es
                lo que produce efecto. Elige uno que toleres y mantenlo 3 meses.
              </li>
              <li>
                <strong>No reevaluar.</strong> Lo que necesitas a los 25 no es
                lo que necesitas a los 50. Cada 2–3 años conviene revisar con
                exámenes (hierro, vit D, B12) qué tiene sentido seguir.
              </li>
            </ul>
          ),
        },
      ]}
      productMentions={productMentions}
      faqs={[
        {
          q: "¿Debería tomar multivitamínico todos los días aunque coma bien?",
          a: "Si tu dieta es variada (frutas, verduras, proteínas, granos integrales), probablemente cubras la mayoría de necesidades sin suplemento. Las excepciones son vitamina D (poco común en alimentos), B12 si eres vegetariana, hierro si pierdes mucho con la menstruación, y ácido fólico si planeas embarazo. Para el resto, comida real > pastilla.",
        },
        {
          q: "¿Hay diferencias reales entre 'multivitamínico para mujer' y uno genérico?",
          a: "A veces sí, a veces es marketing. Los reales para mujer suelen tener menos hierro (o ninguno) y más calcio/biotina. Si el genérico tiene la composición que tú necesitas (revisas la etiqueta), funciona igual. Lo importante es la composición, no el envase rosa.",
        },
        {
          q: "¿Es mejor tomarlo en ayunas o con comida?",
          a: "Con comida. Las vitaminas liposolubles (A, D, E, K) requieren grasa para absorberse. Las del grupo B y la C pueden causar náusea si se toman con estómago vacío. Una sola toma con el desayuno o el almuerzo cumple ambas reglas.",
        },
        {
          q: "¿Puedo combinarlo con anticonceptivos orales?",
          a: "Sí, no hay interacción problemática. De hecho, los anticonceptivos orales se asocian con déficit subclínico de B6, B9 (folatos), B12, magnesio y zinc; un multi básico puede compensar. Lo que sí evita es mezclarlo en la misma toma con suplementos altos de calcio o hierro (compiten por absorción): sepáralos 2 horas.",
        },
        {
          q: "¿En menopausia, multi o suplementación dirigida?",
          a: "Dirigida casi siempre gana. En menopausia, los nutrientes que más rinden son: calcio + vitamina D (salud ósea), magnesio (sueño y sofocos), omega-3 (perfil cardiovascular y ánimo), y opcional colágeno (piel y articulaciones). Cuatro productos a dosis efectivas resuelven más que un multi general con 25 ingredientes.",
        },
      ]}
    />
  );
}
