/**
 * components/home/PartnerLabs.tsx
 *
 * Sección "Laboratorios aliados" del Home. Sprint 2 Sesión B.
 *
 * Señal de confianza: muestra los laboratorios colombianos cuyo catálogo
 * vendemos. Comunica curaduría ("trabajamos con laboratorios certificados")
 * y respaldo.
 *
 * Dinámica: lee getPartnerLabs() — solo laboratorios con productos activos.
 * Cuando un laboratorio nuevo cargue catálogo, aparece solo, sin tocar código.
 *
 * Por ahora se muestran los NOMBRES en tipografía cuidada, no logos: los
 * laboratorios aún no tienen logo_url en la base. Cuando Ader suba los logos,
 * se cambia el render del chip por <Image> sin rehacer la sección. El diseño
 * de chip con nombre se ve intencional y limpio, no como un placeholder vacío.
 *
 * Cada nombre enlaza a /tienda?lab=slug para explorar ese laboratorio.
 *
 * Server component (estático salvo la query): mejor LCP y SEO.
 */

import Link from "next/link";
import { getPartnerLabs } from "@/lib/catalog/partner-labs";

export async function PartnerLabs() {
  const labs = await getPartnerLabs();

  // Si no hubiera laboratorios con catálogo, no renderizamos la sección.
  if (labs.length === 0) return null;

  return (
    <section className="nv-labs" aria-labelledby="nv-labs-title">
      <div className="nv-labs__inner">
        <header className="nv-labs__header">
          <p className="nv-labs__eyebrow">Respaldo</p>
          <h2 id="nv-labs-title" className="nv-labs__title">
            Los mejores laboratorios, en un solo lugar
          </h2>
          <p className="nv-labs__sub">
            Reunimos marcas de referencia que encuentras en Colombia, escogidas
            por la calidad de sus productos. Cada uno con su registro sanitario.
          </p>
        </header>

        <ul className="nv-labs__list">
          {labs.map((lab) => (
            <li key={lab.slug} className="nv-labs__item">
              <Link href={`/tienda?lab=${lab.slug}`} className="nv-labs__chip">
                {lab.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        .nv-labs {
          padding: 72px 20px;
          background: #FFFFFF;
        }
        .nv-labs__inner {
          max-width: 1000px;
          margin: 0 auto;
          text-align: center;
        }
        .nv-labs__header {
          margin-bottom: 40px;
        }
        .nv-labs__eyebrow {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #1E7D2E;
          margin: 0 0 12px;
          font-weight: 600;
        }
        .nv-labs__title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(24px, 3.6vw, 34px);
          font-weight: 400;
          line-height: 1.25;
          color: #2A2722;
          margin: 0 0 14px;
          letter-spacing: -0.3px;
        }
        .nv-labs__sub {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 15px;
          line-height: 1.6;
          color: #8B8881;
          max-width: 560px;
          margin: 0 auto;
        }
        .nv-labs__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 14px;
        }
        .nv-labs__chip {
          display: inline-block;
          padding: 14px 26px;
          background: #FAF7F2;
          border: 1px solid #E8DFD0;
          border-radius: 12px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 17px;
          color: #2A2722;
          text-decoration: none;
          transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
        }
        .nv-labs__chip:hover {
          border-color: #4A2E9A;
          color: #4A2E9A;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(74, 46, 154, 0.1);
        }
      `}</style>
    </section>
  );
}
