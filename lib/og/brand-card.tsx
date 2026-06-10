/**
 * lib/og/brand-card.tsx
 *
 * Tarjeta OG brandeada para categorías, colecciones y laboratorios.
 * Se renderiza con ImageResponse (next/og) en los archivos
 * opengraph-image.tsx de cada ruta — Satori solo soporta un subconjunto
 * de CSS (flex, sin grid), por eso el estilo es inline y simple.
 *
 * Identidad: fondo crema (#FAF7F2), tipografía oscura (#2A2722), verde
 * marca (#1E7D2E), acento púrpura (#4A2E9A). 1200x630 estándar OG.
 */

export const OG_SIZE = { width: 1200, height: 630 };

export function BrandOgCard({
  eyebrow,
  title,
  subtitle,
}: {
  /** Texto pequeño superior (ej. "Categoría", "Laboratorio aliado"). */
  eyebrow: string;
  /** Nombre grande (categoría/colección/lab). */
  title: string;
  /** Línea de apoyo (ej. "32 productos con registro INVIMA"). */
  subtitle?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#FAF7F2",
        padding: "72px 80px",
        fontFamily: "Georgia, serif",
      }}
    >
      {/* Barra de acento superior */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "14px",
          backgroundColor: "#1E7D2E",
          display: "flex",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 26,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#4A2E9A",
            fontFamily: "sans-serif",
            fontWeight: 600,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontSize: title.length > 28 ? 64 : 84,
            color: "#2A2722",
            marginTop: 28,
            lineHeight: 1.1,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              fontSize: 30,
              color: "#5C5048",
              marginTop: 24,
              fontFamily: "sans-serif",
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 40,
            color: "#1E7D2E",
            fontWeight: 700,
          }}
        >
          NaturalVita
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#8B8881",
            fontFamily: "sans-serif",
          }}
        >
          naturalvita.co · Registro INVIMA · Envíos a toda Colombia
        </div>
      </div>
    </div>
  );
}
