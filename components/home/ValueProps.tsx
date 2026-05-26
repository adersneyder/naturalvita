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
          padding: 72px 20px;
          background: #FAF7F2;
        }
        .nv-values__inner {
          max-width: 1060px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 36px;
        }
        @media (max-width: 800px) {
          .nv-values__inner {
            grid-template-columns: 1fr;
            gap: 32px;
            max-width: 460px;
          }
        }
        .nv-values__item {
          text-align: center;
        }
        @media (max-width: 800px) {
          .nv-values__item {
            display: grid;
            grid-template-columns: 52px 1fr;
            grid-template-rows: auto auto;
            column-gap: 18px;
            text-align: left;
            align-items: center;
          }
          .nv-values__icon { grid-row: 1 / 3; }
        }
        .nv-values__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #F3EEFB;
          color: #4A2E9A;
          margin-bottom: 18px;
        }
        @media (max-width: 800px) {
          .nv-values__icon { margin-bottom: 0; }
        }
        .nv-values__title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 19px;
          font-weight: 400;
          color: #2A2722;
          margin: 0 0 8px;
        }
        .nv-values__body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14.5px;
          line-height: 1.65;
          color: #5C5048;
          margin: 0;
          max-width: 320px;
          margin-left: auto;
          margin-right: auto;
        }
        @media (max-width: 800px) {
          .nv-values__body { margin-left: 0; }
        }
      `}</style>
    </section>
  );
}
