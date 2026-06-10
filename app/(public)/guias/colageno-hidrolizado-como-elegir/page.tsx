import type { Metadata } from "next";
import ArticleLayout from "../_components/ArticleLayout";
import { loadMentions } from "@/lib/guias/load-mentions";
import { GUIAS_INDEX } from "@/lib/guias/registry";
import { COMPANY } from "@/lib/legal/company-info";

const ENTRY = GUIAS_INDEX.find(
  (g) => g.slug === "colageno-hidrolizado-como-elegir",
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

export default async function ColagenoPage() {
  const productMentions = await loadMentions([
    {
      slug: "naturfar-colgeno-hidrolizadovit-c-cpsulas-x-60-2u",
      whyMentioned:
        "Colágeno hidrolizado con vitamina C en cápsulas (60 unidades). La vit C es necesaria para que el cuerpo use el colágeno para sintetizar tejido conectivo, así que combinarlos tiene lógica fisiológica.",
    },
    {
      slug: "millenium-suplementos-dietarios-collagen-plus-vitamin-c-100-softgels-mns-100u",
      whyMentioned:
        "Collagen Plus Vitamin C en softgels (100 unidades). Presentación para tratamiento de 3+ meses, ideal para quienes ya validaron tolerancia.",
    },
    {
      slug: "naturfar-cloruro-de-magnesiocolgenovit-c-cpsulas-x-90-1u",
      whyMentioned:
        "Combina cloruro de magnesio + colágeno + vit C. Suma el aporte mineral; útil para quienes además buscan apoyo articular y a la función nerviosa.",
    },
  ]);

  return (
    <ArticleLayout
      slug={ENTRY.slug}
      title={ENTRY.title}
      dek={ENTRY.dek}
      tldr="El colágeno hidrolizado tiene mejor evidencia para piel y articulaciones cuando se toma en dosis de 5–10 g/día por al menos 8–12 semanas. La vitamina C en la misma toma ayuda a su uso por el cuerpo. Exige que la etiqueta declare colágeno hidrolizado (no solo 'colágeno'), que esté en péptidos y que tenga registro INVIMA visible."
      publishedDate={ENTRY.publishedDate}
      updatedDate={ENTRY.updatedDate}
      author={{ name: "Equipo editorial NaturalVita", role: "Curación clínica del catálogo" }}
      readingTime={ENTRY.readingTime}
      heroImage={ENTRY.heroImage}
      sections={[
        {
          id: "que-es-el-colageno",
          heading: "Qué es el colágeno y qué cambia cuando es 'hidrolizado'",
          body: (
            <>
              <p>
                El colágeno es la proteína estructural más abundante del cuerpo
                humano: forma la piel, los tendones, los cartílagos, las
                paredes de los vasos sanguíneos y la matriz ósea. A partir de
                los 25–30 años, su producción cae aproximadamente 1% por año,
                y eso se nota como menos firmeza en la piel y rigidez
                articular incipiente.
              </p>
              <p>
                <strong>Hidrolizado</strong> significa que la molécula original
                fue partida en péptidos pequeños (2 000–5 000 Daltons), lo que
                permite que el intestino los absorba. El colágeno entero, en
                cambio, es demasiado grande y se digiere como proteína común,
                sin la señal específica que el cuerpo asocia a "reponer
                colágeno".
              </p>
              <p>
                En la etiqueta busca: <strong>"colágeno hidrolizado"</strong>,
                "péptidos de colágeno" o "colágeno tipo I y III hidrolizado".
                Si solo dice "colágeno" sin más, probablemente no esté
                hidrolizado y su utilidad es menor.
              </p>
            </>
          ),
        },
        {
          id: "tipos-de-colageno",
          heading: "Tipos I, II, III: ¿cuál sirve para qué?",
          body: (
            <>
              <p>
                Aunque existen unos 28 tipos en el cuerpo, en suplementación
                comercial los relevantes son tres:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Tipo I.</strong> Es el más abundante. Está en la
                  piel, los tendones, los huesos y los ligamentos. Es el
                  asociado a beneficios de piel y elasticidad.
                </li>
                <li>
                  <strong>Tipo II.</strong> Específico del cartílago articular.
                  Tiene su propia evidencia para apoyo articular (a menudo
                  como colágeno tipo II no desnaturalizado, UC-II, en dosis
                  mucho más bajas: 40 mg/día).
                </li>
                <li>
                  <strong>Tipo III.</strong> Acompaña al tipo I en piel y
                  vasos. Suele venir junto con el tipo I.
                </li>
              </ul>
              <p>
                Para la mayoría de propósitos (piel, articulaciones generales),
                un colágeno hidrolizado tipo I y III a dosis adecuada es la
                opción estándar. Si tu enfoque es estrictamente articular y
                buscas evidencia más reciente, UC-II tipo II es la otra vía,
                pero a dosis y propósito distintos.
              </p>
            </>
          ),
        },
        {
          id: "dosis-tiempo",
          heading: "Dosis efectiva y cuánto tiempo verlo funcionar",
          body: (
            <>
              <p>
                La literatura clínica usa típicamente <strong>5 a 10 g/día</strong>{" "}
                de péptidos de colágeno hidrolizado para resultados de piel
                (hidratación, elasticidad) y articulaciones. Los estudios de
                mejor calidad usan 8–12 semanas mínimo antes de medir efecto;
                no esperes notar nada en 2 semanas.
              </p>
              <p>
                Algunas presentaciones comerciales aportan dosis bajas
                (1–2 g por toma) para encajar en cápsulas chicas. Eso no es
                ineficaz necesariamente, pero requiere tomar varias cápsulas al
                día para llegar a la dosis estudiada. Lee con atención la
                cantidad de péptidos <em>por porción</em>, no por cápsula.
              </p>
              <p>
                <strong>Polvos</strong> (sticks o frascos) suelen tener
                ventaja de dosis: 10 g caben en una cucharada, se disuelven en
                agua o jugo, no tienes que tragar cápsulas. Su desventaja es
                la conveniencia para llevar a la oficina.
              </p>
              <p>
                <strong>Cápsulas</strong> son cómodas pero requieren tomar
                varias al día para alcanzar los gramos estudiados.{" "}
                <strong>Bebibles</strong> ya vienen mezclados, fácil cumplimiento.
              </p>
            </>
          ),
        },
        {
          id: "vit-c-cofactores",
          heading: "¿Por qué tantos productos llevan vitamina C?",
          body: (
            <p>
              La <strong>vitamina C</strong> es cofactor obligatorio para que
              las células sinteticen el colágeno en el cuerpo (literalmente:
              sin vitamina C, las enzimas que arman las fibras de colágeno no
              funcionan). Por eso muchas presentaciones combinan ambos en la
              misma cápsula o sobre. La lógica es buena: aportas materia prima
              (péptidos) y cofactor (vitamina C) en la misma toma. Otros
              cofactores que ayudan: zinc, cobre, manganeso, biotina, todos en
              dosis modestas que se cubren con dieta común o con un
              multivitamínico básico.
            </p>
          ),
        },
        {
          id: "criterios-compra",
          heading: "Cinco criterios al elegir el tuyo",
          body: (
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong>Hidrolizado / péptidos.</strong> Si la palabra no
                aparece, descarta.
              </li>
              <li>
                <strong>Dosis suficiente.</strong> Apunta a 5–10 g/día de
                péptidos. Si una cápsula tiene 250 mg, vas a necesitar 20
                cápsulas para 5 g. No es rentable ni práctico.
              </li>
              <li>
                <strong>Con vitamina C en la fórmula</strong> (preferible) o
                una cucharada de jugo cítrico al consumirlo.
              </li>
              <li>
                <strong>Sabor neutro o bien resuelto.</strong> Si no te gusta,
                no lo vas a tomar 12 semanas. En polvos, prueba sticks
                individuales antes que comprar el bote.
              </li>
              <li>
                <strong>Registro INVIMA vigente</strong> y fabricante
                identificable. Si vendes péptidos, no hay razón legítima para
                no declararlo. (
                <a
                  className="text-[var(--color-iris-700)] underline"
                  href={`${COMPANY.url}/guias/como-verificar-invima-suplemento`}
                >
                  Cómo verificar
                </a>
                ).
              </li>
            </ol>
          ),
        },
      ]}
      productMentions={productMentions}
      faqs={[
        {
          q: "¿El colágeno engorda?",
          a: "10 g de colágeno aportan unas 40 kcal — el equivalente a media cucharada de azúcar. En el contexto de una dieta normal el impacto en peso es despreciable. Lo que sí pueden engordar son las versiones azucaradas o con sabores muy dulces; revisa la etiqueta.",
        },
        {
          q: "¿Puedo tomarlo en el embarazo?",
          a: "El colágeno hidrolizado es esencialmente una proteína, segura en términos generales. Pero los suplementos que lo combinan con otros activos (vitaminas a dosis altas, plantas medicinales) pueden no ser apropiados en embarazo. Consulta con tu obstetra antes de cualquier suplementación durante la gestación.",
        },
        {
          q: "¿Funciona aplicado en cremas?",
          a: "El colágeno aplicado tópicamente no penetra la barrera cutánea (las moléculas son demasiado grandes). Las cremas con colágeno suelen funcionar como humectantes superficiales, no como reposición real. Para efecto en piel, la vía oral con dosis suficiente es lo respaldado por estudios.",
        },
        {
          q: "¿De origen marino o bovino: hay diferencia?",
          a: "El colágeno marino (de piel de pescado) tiene péptidos de menor peso molecular y mejor absorción reportada en algunos estudios. El bovino es más económico y bien tolerado por la mayoría. Si eres alérgico al pescado, evita el marino. En lo demás, ambos funcionan.",
        },
        {
          q: "¿Hay efectos secundarios?",
          a: "Para la mayoría, ninguno. Algunas personas reportan saciedad o reflujo si toman dosis altas con el estómago vacío; tomar con comida lo evita. Si tienes hipertensión, ten en cuenta que algunos polvos saborizados contienen sodio. Lee la tabla nutricional.",
        },
      ]}
    />
  );
}
