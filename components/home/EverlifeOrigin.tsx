/**
 * components/home/EverlifeOrigin.tsx
 *
 * Sección "Origen Everlife" del Home. Sprint 2 Sesión B.
 *
 * Es el corazón narrativo del Home: cuenta de dónde viene NaturalVita
 * (marca hija de Everlife Colombia, 2019, primer producto Zardrin) y por
 * qué existe el diferenciador "del bebé al abuelo". Construye confianza
 * mostrando que detrás de la tienda hay una empresa real con trayectoria.
 *
 * Layout a dos columnas: relato a la izquierda, imagen a la derecha.
 * En móvil se apila (imagen arriba, texto abajo).
 *
 * Imagen esperada en /public/home/ (Flux Pro, según plan de imágenes):
 *   origen-everlife.avif  — sugerencia: laboratorio/manos con producto
 *   natural, tono cálido, profesional pero humano.
 *
 * Server component (estático): mejor LCP y SEO.
 *
 * NOTA: el texto de este componente es un BORRADOR redactado a partir del
 * contexto de marca conocido. Ader lo ajusta con la historia real.
 */

import Link from "next/link";
import Image from "next/image";

export function EverlifeOrigin() {
  return (
    <section className="nv-origin" aria-labelledby="nv-origin-title">
      <div className="nv-origin__inner">
        <div className="nv-origin__media">
          <div className="nv-origin__img-wrap">
            <Image
              src="/home/origen-everlife.avif"
              alt="Everlife Colombia, origen de NaturalVita"
              fill
              sizes="(max-width: 860px) 100vw, 520px"
              className="nv-origin__img"
              loading="lazy"
            />
          </div>
          <span className="nv-origin__badge">Desde 2019</span>
        </div>

        <div className="nv-origin__content">
          <p className="nv-origin__eyebrow">Nuestra historia</p>
          <h2 id="nv-origin-title" className="nv-origin__title">
            Nacimos de Everlife,
            <br />
            con una idea simple
          </h2>
          <div className="nv-origin__body">
            <p>
              En 2019, Everlife Colombia empezó con un propósito claro: que el
              bienestar natural fuera confiable y estuviera al alcance de
              cualquier familia. Nuestro primer producto, Zardrin, nació de esa
              búsqueda.
            </p>
            <p>
              NaturalVita es la cara online de ese trabajo. Reunimos en un solo
              lugar lo mejor de cada laboratorio, escogido con criterio, para
              que no tengas que adivinar qué sirve y qué no.
            </p>
            <p>
              Creemos que el bienestar no tiene una sola edad. Por eso
              acompañamos cada etapa de la vida —del bebé al abuelo— con
              productos pensados para cada momento, no para una sola tendencia.
            </p>
          </div>
          <Link href="/sobre-nosotros" className="nv-origin__cta">
            Conoce más sobre nosotros
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <style>{`
        .nv-origin {
          padding: 88px 20px;
          background: #FAF7F2;
        }
        .nv-origin__inner {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          align-items: center;
        }
        @media (max-width: 860px) {
          .nv-origin__inner {
            grid-template-columns: 1fr;
            gap: 36px;
          }
        }
        .nv-origin__media {
          position: relative;
        }
        .nv-origin__img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 5;
          border-radius: 22px;
          overflow: hidden;
          background: #FFFFFF;
          border: 1px solid #E8DFD0;
        }
        @media (max-width: 860px) {
          .nv-origin__img-wrap { aspect-ratio: 3 / 2; }
        }
        .nv-origin__img {
          object-fit: cover;
        }
        .nv-origin__badge {
          position: absolute;
          bottom: -14px;
          left: 28px;
          background: #1E7D2E;
          color: #FFFFFF;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.5px;
          padding: 9px 18px;
          border-radius: 999px;
          box-shadow: 0 8px 20px rgba(30, 125, 46, 0.25);
        }
        .nv-origin__eyebrow {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #1E7D2E;
          margin: 0 0 14px;
          font-weight: 600;
        }
        .nv-origin__title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(28px, 4.2vw, 40px);
          font-weight: 400;
          line-height: 1.18;
          color: #2A2722;
          margin: 0 0 22px;
          letter-spacing: -0.4px;
        }
        .nv-origin__body p {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 15.5px;
          line-height: 1.7;
          color: #5C5048;
          margin: 0 0 14px;
        }
        .nv-origin__body p:last-child {
          margin-bottom: 0;
        }
        .nv-origin__cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 26px;
          color: #4A2E9A;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.18s ease, gap 0.18s ease;
        }
        .nv-origin__cta:hover {
          border-color: #4A2E9A;
          gap: 12px;
        }
      `}</style>
    </section>
  );
}
