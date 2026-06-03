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
              <defs>
                <radialGradient id="nvOrigHalo" cx="50%" cy="42%" r="55%">
                  <stop offset="0%" stopColor="#1E7D2E" stopOpacity="0.18" />
                  <stop offset="55%" stopColor="#1E7D2E" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#1E7D2E" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="nvOrigBloom" cx="50%" cy="40%" r="20%">
                  <stop offset="0%" stopColor="#4A2E9A" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#4A2E9A" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* Halo orgánico más visible */}
              <circle cx="200" cy="210" r="185" fill="url(#nvOrigHalo)" />
              <circle cx="200" cy="200" r="80" fill="url(#nvOrigBloom)" />
              {/* Tallo principal */}
              <g
                stroke="#1E7D2E"
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
              >
                <path d="M200 380 C200 330, 198 275, 200 210" />
                <path d="M200 330 C182 322, 170 309, 166 294 C181 296, 193 308, 200 322" />
                <path d="M200 305 C218 297, 230 284, 234 269 C219 271, 207 283, 200 297" />
                <path d="M200 270 C184 262, 174 250, 170 235 C184 237, 195 249, 200 263" />
                <path d="M200 246 C216 238, 226 226, 230 211 C216 213, 206 225, 200 239" />
              </g>
              {/* Hojas con fill */}
              <g fill="#1E7D2E" opacity="0.28">
                <path d="M166 294 C170 309, 182 322, 200 330 C193 308, 181 296, 166 294 Z" />
                <path d="M234 269 C230 284, 218 297, 200 305 C207 283, 219 271, 234 269 Z" />
                <path d="M170 235 C174 250, 184 262, 200 270 C195 249, 184 237, 170 235 Z" />
                <path d="M230 211 C226 226, 216 238, 200 246 C206 225, 216 213, 230 211 Z" />
              </g>
              {/* Flor en la punta — pétalos sutiles */}
              <g opacity="0.55">
                <circle cx="200" cy="200" r="7" fill="#4A2E9A" />
                <circle cx="184" cy="210" r="4" fill="#4A2E9A" opacity="0.7" />
                <circle cx="216" cy="210" r="4" fill="#4A2E9A" opacity="0.7" />
                <circle cx="192" cy="188" r="3.5" fill="#4A2E9A" opacity="0.6" />
                <circle cx="208" cy="188" r="3.5" fill="#4A2E9A" opacity="0.6" />
              </g>
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
          padding: 104px 20px;
          background:
            radial-gradient(70% 50% at 0% 100%, rgba(74,46,154,.04), transparent 60%),
            radial-gradient(60% 50% at 100% 0%, rgba(30,125,46,.04), transparent 60%),
            #FAF7F2;
        }
        .nv-origin__inner {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1.05fr;
          gap: 64px;
          align-items: center;
        }
        @media (max-width: 860px) {
          .nv-origin__inner {
            grid-template-columns: 1fr;
            gap: 44px;
          }
        }
        .nv-origin__media {
          position: relative;
        }
        .nv-origin__brand {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 5;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid #ECE4D4;
          background: linear-gradient(165deg, #FFFFFF 0%, #FAF7F2 55%, #F2EFE4 100%);
          box-shadow: 0 1px 2px rgba(42,39,34,.04), 0 24px 56px rgba(42,39,34,.10);
        }
        @media (max-width: 860px) {
          .nv-origin__brand { aspect-ratio: 4 / 5; max-width: 460px; margin: 0 auto; }
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
          max-width: 190px;
          max-height: 120px;
        }
        .nv-origin__logo--ev {
          max-width: 180px;
          max-height: 68px;
        }
        .nv-origin__badge {
          position: absolute;
          bottom: -16px;
          left: 30px;
          background: linear-gradient(135deg, #1E7D2E 0%, #176023 100%);
          color: #FFFFFF;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.6px;
          padding: 11px 22px;
          border-radius: 999px;
          box-shadow: 0 1px 2px rgba(30,125,46,.15), 0 12px 28px rgba(30,125,46,.30);
        }
        .nv-origin__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2.2px;
          color: #1E7D2E;
          margin: 0 0 16px;
          font-weight: 700;
        }
        .nv-origin__eyebrow::before {
          content: "";
          display: inline-block;
          width: 28px; height: 2px;
          background: #1E7D2E;
          border-radius: 2px;
        }
        .nv-origin__title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(32px, 4.8vw, 46px);
          font-weight: 400;
          line-height: 1.14;
          color: #2A2722;
          margin: 0 0 24px;
          letter-spacing: -0.6px;
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
          gap: 10px;
          margin-top: 30px;
          padding: 14px 22px;
          background: #FFFFFF;
          border: 1.5px solid #ECE4D4;
          border-radius: 999px;
          color: #4A2E9A;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 1px 2px rgba(42,39,34,.03), 0 6px 16px rgba(42,39,34,.06);
          transition: border-color .22s ease, transform .22s ease, box-shadow .22s ease;
        }
        .nv-origin__cta:hover {
          border-color: #4A2E9A;
          transform: translateY(-2px);
          box-shadow: 0 2px 6px rgba(74,46,154,.06), 0 14px 28px rgba(74,46,154,.16);
        }
        .nv-origin__cta span { transition: transform .22s ease; }
        .nv-origin__cta:hover span { transform: translateX(3px); }
      `}</style>
    </section>
  );
}
