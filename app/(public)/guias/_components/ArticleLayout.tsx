import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "../../_components/Breadcrumbs";
import { COMPANY } from "@/lib/legal/company-info";

export type ArticleSection = {
  /** Slug del heading para el TOC y anchor links. */
  id: string;
  /** Texto del heading (H2). */
  heading: string;
  /** Contenido React de la sección. */
  body: ReactNode;
};

export type ArticleFAQ = {
  q: string;
  a: ReactNode;
};

export type ArticleProductMention = {
  slug: string;
  name: string;
  presentation: string | null;
  laboratory: string;
  priceCop: number;
  imageUrl: string | null;
  imageAlt: string | null;
  /** Una frase de por qué se cita en el contexto del artículo. */
  whyMentioned: string;
};

export type ArticleAuthor = {
  name: string;
  role: string;
  /** Opcional. Si no hay autor humano declarado, dejar undefined. */
  url?: string;
};

export type ArticleProps = {
  slug: string;
  title: string;
  /** Subtítulo / dek bajo el H1. */
  dek: string;
  /**
   * Respuesta directa en 40-60 palabras. Lo que Google extrae como
   * snippet para AI Overviews y ChatGPT cita textual.
   */
  tldr: string;
  publishedDate: string; // ISO yyyy-mm-dd
  updatedDate?: string;
  author: ArticleAuthor;
  /** Tiempo estimado de lectura (ej. "8 min"). */
  readingTime: string;
  /** Imagen de portada (OG y hero). */
  heroImage: { url: string; alt: string };
  sections: ArticleSection[];
  productMentions: ArticleProductMention[];
  faqs: ArticleFAQ[];
};

/**
 * Layout de artículo GEO de NaturalVita.
 *
 * Diseñado para que AI Overviews, ChatGPT, Perplexity y Google Search
 * extraigan los snippets correctos:
 *   - H1 que coincide con la query objetivo.
 *   - TL;DR inmediato (lo que la IA cita textualmente).
 *   - H2s con IDs (anchors) para deep links de IA.
 *   - Productos del catálogo con SKU, precio y enlace canónico.
 *   - FAQ schema al final.
 *   - Article schema con autor declarado y fechas.
 *
 * Reutilizable: cada artículo de /guias/[slug] lo invoca con su data.
 */
export default function ArticleLayout(props: ArticleProps) {
  const {
    title,
    dek,
    tldr,
    publishedDate,
    updatedDate,
    author,
    readingTime,
    heroImage,
    sections,
    productMentions,
    faqs,
  } = props;

  const canonicalUrl = `${COMPANY.url}/guias/${props.slug}`;

  // ----- Schema.org (Article + FAQPage + Breadcrumbs) -----

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: tldr,
    image: heroImage.url,
    datePublished: publishedDate,
    dateModified: updatedDate ?? publishedDate,
    author: {
      "@type": "Person",
      name: author.name,
      ...(author.url ? { url: author.url } : {}),
    },
    publisher: {
      "@type": "Organization",
      "@id": `${COMPANY.url}#organization`,
      name: COMPANY.brand,
    },
    mainEntityOfPage: canonicalUrl,
    isAccessibleForFree: true,
    inLanguage: "es-CO",
  };

  const faqSchema =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: typeof f.a === "string" ? f.a : "",
            },
          })),
        }
      : null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: COMPANY.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guías",
        item: `${COMPANY.url}/guias`,
      },
      { "@type": "ListItem", position: 3, name: title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <Breadcrumbs
          items={[{ label: "Guías", href: "/guias" }, { label: title }]}
        />

        <header className="mt-6 mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-iris-700)] font-medium mb-3">
            Guía editorial
          </p>
          <h1 className="font-serif text-3xl md:text-5xl text-[var(--color-leaf-900)] tracking-tight leading-[1.1]">
            {title}
          </h1>
          <p className="mt-4 text-base md:text-lg text-[var(--color-earth-700)] leading-relaxed">
            {dek}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-earth-500)]">
            <span>
              Por <span className="text-[var(--color-leaf-900)] font-medium">{author.name}</span>
              {" · "}
              <span>{author.role}</span>
            </span>
            <span aria-hidden>·</span>
            <time dateTime={publishedDate}>
              Publicado {formatDate(publishedDate)}
            </time>
            {updatedDate && updatedDate !== publishedDate && (
              <>
                <span aria-hidden>·</span>
                <time dateTime={updatedDate}>
                  Actualizado {formatDate(updatedDate)}
                </time>
              </>
            )}
            <span aria-hidden>·</span>
            <span>{readingTime}</span>
          </div>
        </header>

        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-[var(--color-earth-50)] mb-10">
          <Image
            src={heroImage.url}
            alt={heroImage.alt}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
          />
        </div>

        {/* TL;DR: lo que AI Overviews cita textualmente */}
        <aside
          className="my-8 px-5 py-4 rounded-xl border-l-4 border-[var(--color-iris-700)] bg-[var(--color-iris-50)]/40"
          aria-label="Resumen"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-iris-700)] font-semibold mb-2">
            En breve
          </p>
          <p className="text-[15px] md:text-base text-[var(--color-leaf-900)] leading-relaxed m-0">
            {tldr}
          </p>
        </aside>

        {/* Tabla de contenidos */}
        {sections.length > 2 && (
          <nav
            aria-label="Tabla de contenidos"
            className="my-8 px-5 py-4 rounded-xl bg-[var(--color-earth-50)] border border-[var(--color-earth-100)]"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-earth-700)] font-semibold mb-3">
              En este artículo
            </p>
            <ol className="text-sm space-y-1.5">
              {sections.map((s, i) => (
                <li key={s.id} className="text-[var(--color-leaf-900)]">
                  <a
                    href={`#${s.id}`}
                    className="hover:text-[var(--color-iris-700)] hover:underline"
                  >
                    <span className="text-[var(--color-earth-500)] tabular-nums mr-2">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.heading}
                  </a>
                </li>
              ))}
              {productMentions.length > 0 && (
                <li className="text-[var(--color-leaf-900)]">
                  <a
                    href="#productos"
                    className="hover:text-[var(--color-iris-700)] hover:underline"
                  >
                    <span className="text-[var(--color-earth-500)] tabular-nums mr-2">
                      {String(sections.length + 1).padStart(2, "0")}
                    </span>
                    Productos disponibles en NaturalVita
                  </a>
                </li>
              )}
              {faqs.length > 0 && (
                <li className="text-[var(--color-leaf-900)]">
                  <a
                    href="#preguntas"
                    className="hover:text-[var(--color-iris-700)] hover:underline"
                  >
                    <span className="text-[var(--color-earth-500)] tabular-nums mr-2">
                      {String(sections.length + (productMentions.length > 0 ? 2 : 1)).padStart(2, "0")}
                    </span>
                    Preguntas frecuentes
                  </a>
                </li>
              )}
            </ol>
          </nav>
        )}

        {/* Cuerpo del artículo */}
        <div className="prose-article">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="mt-10 scroll-mt-24">
              <h2 className="font-serif text-2xl md:text-3xl text-[var(--color-leaf-900)] tracking-tight mb-4">
                {s.heading}
              </h2>
              <div className="space-y-4 text-[15px] md:text-base text-[var(--color-earth-900)] leading-relaxed">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        {/* Productos del catálogo citados */}
        {productMentions.length > 0 && (
          <section
            id="productos"
            className="mt-14 pt-10 border-t border-[var(--color-earth-100)] scroll-mt-24"
          >
            <h2 className="font-serif text-2xl md:text-3xl text-[var(--color-leaf-900)] tracking-tight mb-2">
              Productos disponibles en NaturalVita
            </h2>
            <p className="text-sm text-[var(--color-earth-700)] mb-6 max-w-prose">
              Estas son las opciones del catálogo que cumplen los criterios
              descritos arriba. Todas con registro INVIMA verificable y envío
              a toda Colombia.
            </p>
            <ul className="space-y-4">
              {productMentions.map((p) => (
                <li
                  key={p.slug}
                  className="flex gap-4 items-start p-4 rounded-xl border border-[var(--color-earth-100)] bg-white"
                >
                  {p.imageUrl && (
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--color-earth-50)]">
                      <Image
                        src={p.imageUrl}
                        alt={p.imageAlt ?? p.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-[var(--color-earth-500)] font-medium">
                      {p.laboratory}
                    </p>
                    <h3 className="font-serif text-lg text-[var(--color-leaf-900)] leading-tight mt-0.5">
                      <Link
                        href={`/producto/${p.slug}`}
                        className="hover:text-[var(--color-iris-700)]"
                      >
                        {p.name}
                      </Link>
                    </h3>
                    {p.presentation && (
                      <p className="text-xs text-[var(--color-earth-700)] mt-0.5">
                        {p.presentation}
                      </p>
                    )}
                    <p className="text-sm text-[var(--color-earth-700)] mt-2 leading-relaxed">
                      {p.whyMentioned}
                    </p>
                    <div className="flex items-baseline gap-3 mt-2">
                      <span className="text-base font-medium text-[var(--color-leaf-900)] tabular-nums">
                        ${p.priceCop.toLocaleString("es-CO")} COP
                      </span>
                      <Link
                        href={`/producto/${p.slug}`}
                        className="text-xs text-[var(--color-iris-700)] hover:underline"
                      >
                        Ver ficha completa →
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <section
            id="preguntas"
            className="mt-14 pt-10 border-t border-[var(--color-earth-100)] scroll-mt-24"
          >
            <h2 className="font-serif text-2xl md:text-3xl text-[var(--color-leaf-900)] tracking-tight mb-6">
              Preguntas frecuentes
            </h2>
            <dl className="space-y-6">
              {faqs.map((f, i) => (
                <div key={i}>
                  <dt className="font-medium text-[var(--color-leaf-900)] text-base mb-2">
                    {f.q}
                  </dt>
                  <dd className="text-[15px] text-[var(--color-earth-900)] leading-relaxed m-0">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Disclaimer regulatorio */}
        <footer className="mt-14 pt-8 border-t border-[var(--color-earth-100)]">
          <p className="text-xs text-[var(--color-earth-500)] leading-relaxed italic">
            Esta guía tiene fines informativos. Los suplementos alimenticios no
            son medicamentos y no están destinados a diagnosticar, tratar, curar
            o prevenir enfermedades. Consulta con un profesional de la salud
            antes de iniciar cualquier suplementación, especialmente si tomas
            medicamentos, estás embarazada, lactando o tienes condiciones
            médicas. Todos los productos citados cuentan con registro INVIMA
            vigente, verificable en datos.invima.gov.co.
          </p>
        </footer>
      </article>
    </>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
