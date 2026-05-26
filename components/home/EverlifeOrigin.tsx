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
 * Layout a dos columnas: relato a la izquierda, composición de marca a la
 * derecha. En móvil se apila (composición arriba, texto abajo).
 *
 * La composición cuenta la genealogía de las marcas con un tallo que crece:
 * abajo Everlife (la raíz, marca madre 2019), un tallo continuo que sube,
 * arriba NaturalVita (la flor, la cara online que florece). Los logos van
 * como imágenes reales SIN alteración (manual de marca); la naturaleza
 * (tallo, hojas, brote, halo) es decoración dibujada en SVG.
 *
 * Logos requeridos en /public/home/:
 *   everlife-logo.png      (293×113, fondo transparente)
 *   naturalvita-logo.png   (816×502, fondo transparente)
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
          <div className="nv-origin__brand">
            {/* Fondo botánico: halo + tallo continuo que sube de la raíz a la flor */}
            <svg
              className="nv-origin__botanic"
              viewBox="0 0 400 500"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <circle cx="200" cy="210" r="120" fill="#1E7D2E" opacity="0.05" />
              <circle cx="200" cy="210" r="158" fill="#1E7D2E" opacity="0.03" />
              <g
                stroke="#1E7D2E"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                opacity="0.5"
              >
                <path d="M200 365 C200 320, 198 270, 200 205" />
                <path d="M200 320 C184 314, 174 303, 170 290 C183 290, 194 300, 200 313" />
                <path d="M200 300 C216 294, 226 283, 230 270 C217 270, 206 280, 200 293" />
                <path d="M200 270 C186 264, 177 254, 173 241 C185 241, 195 251, 200 263" />
                <path d="M200 248 C214 242, 223 232, 227 220 C215 220, 206 230, 200 241" />
              </g>
              <g fill="#1E7D2E" opacity="0.18">
                <path d="M170 290 C174 303, 184 314, 200 320 C194 300, 183 290, 170 290 Z" />
                <path d="M230 270 C226 283, 216 294, 200 300 C206 280, 217 270, 230 270 Z" />
              </g>
              <circle cx="200" cy="200" r="5" fill="#4A2E9A" opacity="0.45" />
              <circle cx="186" cy="208" r="3" fill="#4A2E9A" opacity="0.3" />
              <circle cx="214" cy="208" r="3" fill="#4A2E9A" opacity="0.3" />
            </svg>

            {/* Capa de contenido: la flor (NaturalVita) arriba, la raíz (Everlife) abajo */}
            <div className="nv-origin__brand-content">
              <div className="nv-origin__node nv-origin__node--flower">
                <span className="nv-origin__node-label">Florece en línea</span>
                <Image
                  src="/home/naturalvita-logo.png"
                  alt="NaturalVita"
                  width={816}
                  height={502}
                  className="nv-origin__logo nv-origin__logo--nv"
                  loading="lazy"
                />
              </div>

              <div className="nv-origin__node nv-origin__node--root">
                <Image
                  src="/home/everlife-logo.png"
                  alt="Everlife Colombia"
                  width={293}
                  height={113}
                  className="nv-origin__logo nv-origin__logo--ev"
                  loading="lazy"
                />
                <span className="nv-origin__node-label">Nuestra raíz</span>
              </div>
            </div>
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
        .nv-origin__brand {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 5;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid #E8DFD0;
          background: linear-gradient(165deg, #FFFFFF 0%, #FAF7F2 55%, #F2EFE4 100%);
        }
        @media (max-width: 860px) {
          .nv-origin__brand { aspect-ratio: 4 / 5; max-width: 420px; margin: 0 auto; }
        }
        .nv-origin__botanic {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .nv-origin__brand-content {
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 30px 30px 28px;
          box-sizing: border-box;
        }
        .nv-origin__node {
          text-align: center;
        }
        .nv-origin__node-label {
          display: block;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9.5px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #8B8881;
        }
        .nv-origin__node--flower .nv-origin__node-label {
          margin-bottom: 12px;
        }
        .nv-origin__node--root .nv-origin__node-label {
          margin-top: 12px;
        }
        .nv-origin__logo {
          display: block;
          margin: 0 auto;
          height: auto;
          width: auto;
        }
        .nv-origin__logo--nv {
          max-width: 158px;
          max-height: 100px;
        }
        .nv-origin__logo--ev {
          max-width: 150px;
          max-height: 58px;
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
