import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

/**
 * Layout base para todos los emails transaccionales de NaturalVita.
 *
 * Decisiones:
 *   - Colores hex hardcoded (no CSS vars) — los clientes de email no soportan
 *     CSS custom properties.
 *   - Tailwind compilado en el server (`@react-email/components` resuelve las
 *     classes a inline styles que sí funcionan en clientes de email).
 *   - Header sobrio con wordmark, no logo gráfico (mejor compatibilidad y
 *     más rápido de cargar).
 *   - Footer con info de Everlife + dirección física + unsubscribe (los
 *     transaccionales legalmente no requieren unsubscribe pero es buena
 *     práctica para marketing futuro).
 */

const COLORS = {
  leaf900: "#1a3a2e",
  leaf700: "#2d5e4a",
  leaf100: "#e8f0eb",
  earth900: "#2c2520",
  earth700: "#5c5048",
  earth500: "#8a7e74",
  earth100: "#e8e2dc",
  earth50: "#f5f1ec",
  iris700: "#4a2e9a",
  iris600: "#5b3eb8",
  white: "#ffffff",
} as const;

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body
          style={{
            backgroundColor: COLORS.earth50,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            margin: 0,
            padding: 0,
          }}
        >
          <Container
            style={{
              maxWidth: "560px",
              margin: "0 auto",
              padding: "32px 16px",
            }}
          >
            {/* Header */}
            <Section style={{ paddingBottom: "24px" }}>
              <Text
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "24px",
                  color: COLORS.leaf900,
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                NaturalVita
              </Text>
              <Text
                style={{
                  fontSize: "11px",
                  color: COLORS.earth500,
                  margin: "2px 0 0",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Productos naturales seleccionados
              </Text>
            </Section>

            {/* Card principal */}
            <Section
              style={{
                backgroundColor: COLORS.white,
                borderRadius: "12px",
                padding: "32px",
                border: `1px solid ${COLORS.earth100}`,
              }}
            >
              {children}
            </Section>

            {/* Footer */}
            <Section style={{ paddingTop: "24px" }}>
              <Hr style={{ borderColor: COLORS.earth100, margin: "16px 0" }} />
              <Text
                style={{
                  fontSize: "11px",
                  color: COLORS.earth500,
                  textAlign: "center",
                  margin: "4px 0",
                  lineHeight: 1.5,
                }}
              >
                NaturalVita es una marca de Everlife Colombia S.A.S.
                <br />
                Bogotá, Colombia · pedidos@naturalvita.co
              </Text>
              <Text
                style={{
                  fontSize: "11px",
                  color: COLORS.earth500,
                  textAlign: "center",
                  margin: "8px 0 0",
                }}
              >
                Este es un correo transaccional sobre tu pedido.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export const EMAIL_COLORS = COLORS;

/**
 * Helper de formato COP: mismo formato que en el sitio para consistencia.
 */
export function formatCopForEmail(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
