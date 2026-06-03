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
                <svg
                  className="nv-labs__check"
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="11" fill="#E5F1E7" />
                  <path
                    d="M7.5 12.2l3 3 6-6.5"
                    stroke="#1E7D2E"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <span className="nv-labs__chip-name">{lab.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        .nv-labs {
          padding: 64px 20px;
          background:
            radial-gradient(70% 50% at 50% 100%, rgba(30,125,46,.04), transparent 70%),
            #FFFFFF;
        }
        .nv-labs__inner {
          max-width: 1000px;
          margin: 0 auto;
          text-align: center;
        }
        .nv-labs__header {
          margin-bottom: 36px;
        }
        .nv-labs__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2.2px;
          color: #1E7D2E;
          margin: 0 0 14px;
          font-weight: 700;
        }
        .nv-labs__eyebrow::before,
        .nv-labs__eyebrow::after {
          content: "";
          width: 28px; height: 2px;
          background: #1E7D2E;
          border-radius: 2px;
        }
        .nv-labs__title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(26px, 4vw, 38px);
          font-weight: 400;
          line-height: 1.2;
          color: #2A2722;
          margin: 0 0 16px;
          letter-spacing: -0.5px;
        }
        .nv-labs__sub {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 15.5px;
          line-height: 1.65;
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
          gap: 12px;
        }
        .nv-labs__chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 22px;
          background: #FFFFFF;
          border: 1px solid #ECE4D4;
          border-radius: 999px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 17px;
          color: #2A2722;
          text-decoration: none;
          box-shadow: 0 1px 2px rgba(42,39,34,.03), 0 4px 14px rgba(42,39,34,.04);
          transition: border-color .22s ease, transform .22s ease, box-shadow .22s ease, color .22s ease;
        }
        .nv-labs__chip:hover {
          border-color: #1E7D2E;
          color: #1E5E34;
          transform: translateY(-3px);
          box-shadow: 0 2px 6px rgba(30,125,46,.06), 0 14px 28px rgba(30,125,46,.15);
        }
        .nv-labs__check { flex-shrink: 0; }
        .nv-labs__chip-name { line-height: 1; }
      `}</style>
    </section>
  );
}
