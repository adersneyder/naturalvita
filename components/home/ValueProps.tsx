/**
 * components/home/ValueProps.tsx
 *
 * Sección "Propuestas de valor" del Home. Sprint 2 Sesión B.
 *
 * Tres razones para confiar y comprar, en una banda limpia de 3 columnas.
 * Resume el posicionamiento: curaduría con criterio, respaldo regulatorio,
 * y el diferenciador "del bebé al abuelo".
 *
 * Íconos de lucide-react (ya en el repo). Server component (estático).
 */

import { Sparkles, ShieldCheck, Users } from "lucide-react";

interface ValueProp {
  icon: typeof Sparkles;
  title: string;
  body: string;
}

const VALUES: ValueProp[] = [
  {
    icon: Sparkles,
    title: "Seleccionado con criterio",
    body: "No vendemos todo. Escogemos productos que valen la pena, de laboratorios que conocemos, para que no tengas que adivinar.",
  },
  {
    icon: ShieldCheck,
    title: "Respaldo que puedes verificar",
    body: "Productos de laboratorios de referencia, con registro sanitario INVIMA. Bienestar natural, sí, pero con seriedad.",
  },
  {
    icon: Users,
    title: "Para cada etapa de la vida",
    body: "Del bebé al abuelo. Acompañamos cada momento con lo que de verdad necesita, no con una sola moda pasajera.",
  },
];

export function ValueProps() {
  return (
    <section className="nv-values" aria-label="Por qué elegirnos">
      <div className="nv-values__inner">
        {VALUES.map((value) => {
          const Icon = value.icon;
          return (
            <div key={value.title} className="nv-values__item">
              <span className="nv-values__icon">
                <Icon size={26} strokeWidth={1.6} />
              </span>
              <h3 className="nv-values__title">{value.title}</h3>
              <p className="nv-values__body">{value.body}</p>
            </div>
          );
        })}
      </div>

      <style>{`
        .nv-values {
          padding: 88px 20px;
          background:
            radial-gradient(60% 50% at 50% 0%, rgba(74,46,154,.05), transparent 60%),
            #FAF7F2;
        }
        .nv-values__inner {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 800px) {
          .nv-values__inner {
            grid-template-columns: 1fr;
            gap: 20px;
            max-width: 500px;
          }
        }
        .nv-values__item {
          text-align: center;
          background: #FFFFFF;
          border: 1px solid #ECE4D4;
          border-radius: 20px;
          padding: 36px 28px;
          box-shadow: 0 1px 2px rgba(42,39,34,.03), 0 6px 20px rgba(42,39,34,.04);
          transition: transform .28s cubic-bezier(.2,.8,.2,1), box-shadow .28s ease, border-color .28s ease;
        }
        .nv-values__item:hover {
          transform: translateY(-4px);
          border-color: #D4C9B0;
          box-shadow: 0 4px 10px rgba(42,39,34,.05), 0 20px 40px rgba(42,39,34,.10);
        }
        @media (max-width: 800px) {
          .nv-values__item {
            display: grid;
            grid-template-columns: 56px 1fr;
            grid-template-rows: auto auto;
            column-gap: 18px;
            text-align: left;
            align-items: start;
            padding: 24px 22px;
          }
          .nv-values__icon { grid-row: 1 / 3; }
        }
        .nv-values__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: linear-gradient(135deg, #F3EEFB 0%, #E8E0F5 100%);
          color: #4A2E9A;
          margin-bottom: 20px;
          box-shadow: 0 1px 2px rgba(74,46,154,.06), 0 8px 18px rgba(74,46,154,.10);
        }
        @media (max-width: 800px) {
          .nv-values__icon { margin-bottom: 0; }
        }
        /* Variantes de color de ícono por columna — alterna verde y púrpura
           para dar vida sin perder coherencia. */
        .nv-values__item:nth-child(2) .nv-values__icon {
          background: linear-gradient(135deg, #E5F1E7 0%, #D4E8D8 100%);
          color: #1E7D2E;
          box-shadow: 0 1px 2px rgba(30,125,46,.06), 0 8px 18px rgba(30,125,46,.10);
        }
        .nv-values__title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 21px;
          font-weight: 400;
          color: #2A2722;
          margin: 0 0 10px;
          letter-spacing: -0.2px;
        }
        .nv-values__body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14.5px;
          line-height: 1.65;
          color: #5C5048;
          margin: 0 auto;
          max-width: 320px;
        }
        @media (max-width: 800px) {
          .nv-values__body { margin: 0; }
        }
      `}</style>
    </section>
  );
}
