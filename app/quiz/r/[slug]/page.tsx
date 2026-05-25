/**
 * app/quiz/r/[slug]/page.tsx
 *
 * Página pública del resultado del quiz. Sprint 2 Sesión A.2.
 *
 * - Server Component: cero JS pesado al cliente, LCP mínimo, ideal SEO.
 * - Reabre un resultado guardado por su slug (desde el email o compartido).
 * - Metadata dinámica + schema.org ItemList → indexable y AI-citable.
 * - Pública: cualquiera puede abrirla (no hay datos sensibles).
 * - Si el slug no existe → 404.
 *
 * Es la "persistencia" del resultado: el quiz en el Home es efímero, pero
 * cuando el usuario deja su email (o está logueado) se guarda y esta página
 * lo reabre indefinidamente.
 */

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getQuizResult } from "@/lib/quiz/save-result";
import { selectionLabel, getStage, getGoal } from "@/components/home/quiz-data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getQuizResult(slug);

  if (!result) {
    return { title: "Resultado no encontrado · NaturalVita" };
  }

  const label = selectionLabel(result.etapa, result.objetivo);
  const title = `Tu selección de bienestar · ${label} · NaturalVita`;
  const description = `Productos naturales seleccionados con criterio para ${label.toLowerCase()}. Recomendación personalizada de NaturalVita.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/quiz/r/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/quiz/r/${slug}`,
      siteName: "NaturalVita",
      locale: "es_CO",
      type: "website",
    },
    // Resultado individual: no es contenido que queramos indexar masivamente
    // (cada uno es personal). Permitimos seguir links pero no indexar el slug.
    robots: { index: false, follow: true },
  };
}

export default async function QuizResultPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getQuizResult(slug);

  if (!result) {
    notFound(); // lanza NEXT_NOT_FOUND, no continúa
  }

  // A partir de aquí result no es null. notFound() devuelve never en el repo
  // real (tipos de next/navigation); este non-null assertion es defensivo.
  const r = result!;
  const stage = getStage(r.etapa);
  const goal = getGoal(r.objetivo);
  const label = selectionLabel(r.etapa, r.objetivo);

  // schema.org ItemList para los productos recomendados
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Selección de bienestar · ${label}`,
    numberOfItems: r.products.length,
    itemListElement: r.products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/producto/${p.slug}`,
      name: p.name,
    })),
  };

  return (
    <main className="qr">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <div className="qr__inner">
        <p className="qr__eyebrow">Tu selección de bienestar</p>
        <h1 className="qr__title">
          Para {stage?.label.toLowerCase()}, enfocado en{" "}
          {goal?.label.toLowerCase()}
        </h1>
        <p className="qr__sub">
          Esto seleccionamos con criterio pensando en ti. Cada producto lo
          puedes agregar al carrito desde su ficha.
        </p>

        <div className="qr__products">
          {r.products.map((p) => (
            <Link key={p.id} href={`/producto/${p.slug}`} className="qr__product">
              {p.imageUrl ? (
                <Image
                  src={p.imageUrl}
                  alt={p.name}
                  width={72}
                  height={72}
                  className="qr__product-img"
                />
              ) : null}
              <div className="qr__product-info">
                <span className="qr__product-name">{p.name}</span>
                <span className="qr__product-price">{formatCOP(p.priceCop)}</span>
                {p.reason ? (
                  <span className="qr__product-reason">{p.reason}</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>

        <div className="qr__actions">
          <Link
            href={`/tienda?etapa=${r.etapa}&objetivo=${r.objetivo}`}
            className="qr__cta"
          >
            Ver más productos para {stage?.label.toLowerCase()}
          </Link>
          <Link href="/" className="qr__redo">
            Hacer el cuestionario de nuevo
          </Link>
        </div>
      </div>

      <style>{`
        .qr {
          min-height: calc(100vh - 80px);
          padding: 64px 20px;
          background:
            radial-gradient(ellipse 80% 50% at 50% 0%, #F3EEE4 0%, transparent 70%),
            linear-gradient(180deg, #FAF7F2 0%, #F5F1E8 100%);
        }
        .qr__inner { max-width: 620px; margin: 0 auto; text-align: center; }
        .qr__eyebrow {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px; text-transform: uppercase; letter-spacing: 2px;
          color: #1E7D2E; margin: 0 0 12px; font-weight: 600;
        }
        .qr__title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(26px, 5vw, 38px); font-weight: 400; line-height: 1.2;
          color: #2A2722; margin: 0 0 12px; letter-spacing: -0.4px;
        }
        .qr__sub {
          font-family: Arial, Helvetica, sans-serif; font-size: 15px;
          color: #6B6760; line-height: 1.6; margin: 0 auto 32px; max-width: 480px;
        }
        .qr__products { display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px; }
        .qr__product {
          display: flex; gap: 14px; align-items: center; padding: 14px;
          background: #FFFFFF; border: 1px solid #E8DFD0; border-radius: 12px;
          text-decoration: none; text-align: left;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .qr__product:hover { border-color: #C77D6D; box-shadow: 0 6px 18px rgba(199,125,109,0.12); }
        .qr__product-img { border-radius: 8px; object-fit: cover; flex-shrink: 0; }
        .qr__product-info { display: flex; flex-direction: column; gap: 2px; }
        .qr__product-name { font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #2A2722; }
        .qr__product-price { font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; color: #1E7D2E; }
        .qr__product-reason { font-family: Arial, Helvetica, sans-serif; font-size: 12.5px; color: #8B8881; font-style: italic; margin-top: 2px; }
        .qr__actions { display: flex; flex-direction: column; align-items: center; gap: 14px; }
        .qr__cta {
          display: inline-block; padding: 13px 32px; background: #4A2E9A; color: #FFFFFF;
          font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600;
          text-decoration: none; border-radius: 9px; transition: background 0.18s;
        }
        .qr__cta:hover { background: #3B248A; }
        .qr__redo {
          color: #8B8881; font-family: Arial, Helvetica, sans-serif; font-size: 14px;
          text-decoration: none; border-bottom: 1px solid transparent;
        }
        .qr__redo:hover { color: #4A2E9A; border-color: #4A2E9A; }
      `}</style>
    </main>
  );
}
