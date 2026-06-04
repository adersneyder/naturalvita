/**
 * components/home/SectionDivider.tsx
 *
 * Divisor ornamental entre secciones del Home.
 *
 * Funciona como "respiración narrativa": una línea horizontal degradada
 * con un pequeño brote botánico en el centro. Hace de puntuación visual
 * sin cortar el flujo del storytelling.
 *
 * Variantes:
 *   - `tone="warm"` (defecto): se ve sobre fondo crema (#FAF7F2).
 *   - `tone="cool"`: se ve sobre fondo blanco (#FFFFFF).
 *
 * El componente es estático (server component), 0 JS al cliente.
 */

interface SectionDividerProps {
  tone?: "warm" | "cool";
}

export function SectionDivider({ tone = "warm" }: SectionDividerProps) {
  const bg = tone === "cool" ? "#FFFFFF" : "#FAF7F2";

  return (
    <div className="nv-divider" aria-hidden="true">
      <span className="nv-divider__line nv-divider__line--left" />
      <svg
        className="nv-divider__bud"
        viewBox="0 0 32 32"
        width="32"
        height="32"
        role="presentation"
      >
        {/* Hoja izquierda */}
        <path
          d="M16 20 C10 18, 6 14, 6 10 C12 11, 15 14, 16 18 Z"
          fill="#1E7D2E"
          opacity="0.22"
        />
        {/* Hoja derecha */}
        <path
          d="M16 20 C22 18, 26 14, 26 10 C20 11, 17 14, 16 18 Z"
          fill="#1E7D2E"
          opacity="0.22"
        />
        {/* Tallito */}
        <path
          d="M16 18 L16 26"
          stroke="#1E7D2E"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.55"
        />
        {/* Brote central púrpura */}
        <circle cx="16" cy="14" r="3" fill="#4A2E9A" opacity="0.55" />
        <circle cx="16" cy="14" r="1.5" fill="#4A2E9A" />
      </svg>
      <span className="nv-divider__line nv-divider__line--right" />

      <style>{`
        .nv-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 24px 20px;
          background: ${bg};
        }
        .nv-divider__line {
          flex: 1;
          max-width: 220px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(30,125,46,0.32) 50%,
            rgba(30,125,46,0.10) 100%
          );
        }
        .nv-divider__line--right {
          background: linear-gradient(
            90deg,
            rgba(30,125,46,0.10) 0%,
            rgba(30,125,46,0.32) 50%,
            transparent 100%
          );
        }
        .nv-divider__bud {
          flex-shrink: 0;
          display: block;
        }
      `}</style>
    </div>
  );
}
