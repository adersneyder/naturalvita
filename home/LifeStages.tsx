/**
 * components/home/LifeStages.tsx
 *
 * Sección de 6 etapas de vida del Home. Sprint 2 Sesión A.
 *
 * Muestra la cobertura única de NaturalVita: "del bebé al abuelo".
 * No es la navegación principal (eso es el quiz), sino evidencia visual
 * del diferenciador. Cada card linkea a /tienda?etapa=X.
 *
 * Imágenes: se esperan en /public/home/ con nombres:
 *   etapa-bebe.avif, etapa-nino.avif, etapa-adolescente.avif,
 *   etapa-adulto.avif, etapa-embarazo.avif, etapa-adulto-mayor.avif
 *
 * 4 son fotos humanas, 2 son composiciones abstractas (ver prompts).
 *
 * Server component (sin "use client"): es estático, mejor para LCP/SEO.
 */

import Link from "next/link";
import Image from "next/image";

interface StageCard {
  id: string;
  title: string;
  caption: string;
  image: string;
}

const CARDS: StageCard[] = [
  {
    id: "bebe",
    title: "Bebés",
    caption: "Desde la primera respiración",
    image: "/home/etapa-bebe.avif",
  },
  {
    id: "nino",
    title: "Niños",
    caption: "Para que crezcan fuertes",
    image: "/home/etapa-nino.avif",
  },
  {
    id: "adolescente",
    title: "Adolescentes",
    caption: "En plena transformación",
    image: "/home/etapa-adolescente.avif",
  },
  {
    id: "adulto",
    title: "Adultos",
    caption: "Para tu ritmo de vida",
    image: "/home/etapa-adulto.avif",
  },
  {
    id: "embarazo",
    title: "Embarazo",
    caption: "Acompañamos la gestación",
    image: "/home/etapa-embarazo.avif",
  },
  {
    id: "adulto-mayor",
    title: "Adultos mayores",
    caption: "Bienestar en cada año",
    image: "/home/etapa-adulto-mayor.avif",
  },
];

export function LifeStages() {
  return (
    <section className="nv-stages" aria-labelledby="nv-stages-title">
      <div className="nv-stages__inner">
        <header className="nv-stages__header">
          <p className="nv-stages__eyebrow">Del bebé al abuelo</p>
          <h2 id="nv-stages-title" className="nv-stages__title">
            Lo natural, seleccionado con criterio.
            <br />
            Para cada etapa de la vida.
          </h2>
        </header>

        <div className="nv-stages__grid">
          {CARDS.map((card, i) => (
            <Link
              key={card.id}
              href={`/tienda?etapa=${card.id}`}
              className="nv-stages__card"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="nv-stages__img-wrap">
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 380px"
                  className="nv-stages__img"
                  loading="lazy"
                />
              </div>
              <div className="nv-stages__caption">
                <span className="nv-stages__card-title">{card.title}</span>
                <span className="nv-stages__card-sub">{card.caption}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .nv-stages {
          padding: 80px 20px;
          background: #FFFFFF;
        }
        .nv-stages__inner {
          max-width: 1120px;
          margin: 0 auto;
        }
        .nv-stages__header {
          text-align: center;
          margin-bottom: 48px;
        }
        .nv-stages__eyebrow {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #1E7D2E;
          margin: 0 0 12px;
          font-weight: 600;
        }
        .nv-stages__title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 400;
          line-height: 1.25;
          color: #2A2722;
          margin: 0;
          letter-spacing: -0.3px;
        }
        .nv-stages__grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        @media (max-width: 1024px) {
          .nv-stages__grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .nv-stages__grid { grid-template-columns: 1fr; }
        }
        .nv-stages__card {
          display: block;
          text-decoration: none;
          border-radius: 18px;
          overflow: hidden;
          background: #FAF7F2;
          border: 1px solid #E8DFD0;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
          animation: nvStageIn 0.5s ease both;
        }
        @keyframes nvStageIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nv-stages__card { animation: none; }
        }
        .nv-stages__card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 34px rgba(42, 39, 34, 0.1);
        }
        .nv-stages__img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
        }
        .nv-stages__img {
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .nv-stages__card:hover .nv-stages__img {
          transform: scale(1.04);
        }
        .nv-stages__caption {
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .nv-stages__card-title {
          font-family: Georgia, serif;
          font-size: 19px;
          color: #2A2722;
        }
        .nv-stages__card-sub {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          color: #8B8881;
        }
      `}</style>
    </section>
  );
}
