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
          padding: 56px 20px;
          background:
            radial-gradient(80% 60% at 50% 0%, rgba(30,125,46,.04), transparent 70%),
            #FAF7F2;
        }
        .nv-trust__inner {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 860px) {
          .nv-trust__inner { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
        @media (max-width: 440px) {
          .nv-trust__inner { grid-template-columns: 1fr; }
        }
        .nv-trust__item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: #FFFFFF;
          border: 1px solid #ECE4D4;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 1px 2px rgba(42,39,34,.03), 0 4px 14px rgba(42,39,34,.04);
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }
        .nv-trust__item:hover {
          transform: translateY(-3px);
          border-color: #D4C9B0;
          box-shadow: 0 2px 6px rgba(42,39,34,.05), 0 14px 28px rgba(42,39,34,.08);
        }
        .nv-trust__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #E5F1E7 0%, #D4E8D8 100%);
          color: #1E7D2E;
          flex-shrink: 0;
          box-shadow: 0 1px 2px rgba(30,125,46,.06), 0 6px 14px rgba(30,125,46,.10);
        }
        .nv-trust__text {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .nv-trust__title {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14.5px;
          font-weight: 700;
          color: #2A2722;
          letter-spacing: -0.1px;
        }
        .nv-trust__caption {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          color: #8B8881;
          line-height: 1.45;
        }
      `}</style>
    </section>
  );
}
