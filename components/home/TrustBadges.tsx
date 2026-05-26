/**
 * components/home/TrustBadges.tsx
 *
 * Sección "Sellos de confianza" del Home. Sprint 2 Sesión B.
 *
 * Banda final de tranquilidad antes del footer: cuatro señales rápidas que
 * responden las objeciones típicas de una compra online en Colombia (¿es
 * seguro pagar?, ¿llega a mi ciudad?, ¿es confiable el producto?, ¿hay
 * alguien detrás?).
 *
 * Todo factual y verificable:
 *   - Pago seguro: Bold (tarjetas, PSE, Nequi).
 *   - Envíos a toda Colombia: 8 transportadoras configuradas.
 *   - Registro INVIMA: productos con registro sanitario.
 *   - Atención real: humano detrás, no solo un bot.
 *
 * Íconos de lucide-react. Server component (estático).
 */

import { ShieldCheck, Truck, BadgeCheck, MessageCircle } from "lucide-react";

interface Badge {
  icon: typeof ShieldCheck;
  title: string;
  caption: string;
}

const BADGES: Badge[] = [
  {
    icon: ShieldCheck,
    title: "Pago seguro",
    caption: "Tarjetas, PSE y Nequi con Bold",
  },
  {
    icon: Truck,
    title: "Envíos a toda Colombia",
    caption: "Con seguimiento de tu pedido",
  },
  {
    icon: BadgeCheck,
    title: "Registro INVIMA",
    caption: "Productos con respaldo sanitario",
  },
  {
    icon: MessageCircle,
    title: "Atención cuando la necesitas",
    caption: "Acompañamiento cercano, paso a paso",
  },
];

export function TrustBadges() {
  return (
    <section className="nv-trust" aria-label="Garantías de compra">
      <div className="nv-trust__inner">
        {BADGES.map((badge) => {
          const Icon = badge.icon;
          return (
            <div key={badge.title} className="nv-trust__item">
              <span className="nv-trust__icon">
                <Icon size={22} strokeWidth={1.7} />
              </span>
              <div className="nv-trust__text">
                <span className="nv-trust__title">{badge.title}</span>
                <span className="nv-trust__caption">{badge.caption}</span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .nv-trust {
          padding: 40px 20px;
          background: #FFFFFF;
          border-top: 1px solid #E8DFD0;
        }
        .nv-trust__inner {
          max-width: 1060px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        @media (max-width: 860px) {
          .nv-trust__inner { grid-template-columns: repeat(2, 1fr); gap: 28px 24px; }
        }
        @media (max-width: 440px) {
          .nv-trust__inner { grid-template-columns: 1fr; }
        }
        .nv-trust__item {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .nv-trust__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #E5F1E7;
          color: #1E7D2E;
          flex-shrink: 0;
        }
        .nv-trust__text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .nv-trust__title {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14.5px;
          font-weight: 600;
          color: #2A2722;
        }
        .nv-trust__caption {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12.5px;
          color: #8B8881;
          line-height: 1.4;
        }
      `}</style>
    </section>
  );
}
