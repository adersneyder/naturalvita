import {
  Button,
  Heading,
  Hr,
  Img,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { EmailLayout } from "./_layout";
import type { MatchedProduct } from "@/lib/quiz/match-products";

/**
 * lib/email/templates/quiz-result.tsx
 *
 * Email de resultado del Quiz-Hero del Home. Sprint 2 Sesión A.
 *
 * Se envía cuando el usuario completa el quiz y deja su correo. Es un email
 * de MARKETING (sale desde hola@news.naturalvita.co), por eso usa
 * EmailLayout con unsubscribeUrl (RFC 8058), igual que newsletter-welcome.
 *
 * Contenido:
 *   - Selección que hizo (etapa · objetivo)
 *   - 3 productos recomendados con imagen, nombre, precio y razón IA
 *   - Cupón WELCOME10 destacado
 *   - CTA a la tienda
 *
 * Delega header y footer (dirección Medellín, info@) al EmailLayout
 * compartido para mantener coherencia visual con el resto de plantillas.
 */

interface QuizResultProps {
  products: MatchedProduct[];
  selectionLabel: string;
  couponCode: string;
  baseUrl: string;
  /** URL compartible del resultado (/quiz/r/[slug]). Opcional. */
  resultUrl?: string;
  /** URL de baja para el footer (RFC 8058). Opcional. */
  unsubscribeUrl?: string;
}

// Colores alineados con _layout.tsx (clientes de email no soportan CSS vars)
const C = {
  leaf700: "#2d5e4a",
  iris700: "#4a2e9a",
  iris600: "#5b3eb8",
  earth900: "#2c2520",
  earth700: "#5c5048",
  earth500: "#8a7e74",
  earth100: "#e8e2dc",
  earth50: "#f5f1ec",
  white: "#ffffff",
} as const;

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function QuizResult({
  products,
  selectionLabel,
  couponCode,
  baseUrl,
  resultUrl,
  unsubscribeUrl,
}: QuizResultProps) {
  return (
    <EmailLayout
      preview="Tu selección personalizada de bienestar te espera"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading
        as="h1"
        style={{
          fontSize: "24px",
          fontWeight: 400,
          color: C.earth900,
          margin: "0 0 8px",
        }}
      >
        Tu selección está lista
      </Heading>

      <Text
        style={{
          fontSize: "15px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        Con base en lo que nos contaste ({selectionLabel}), seleccionamos estos
        productos pensando en ti:
      </Text>

      {/* Productos */}
      <Section>
        {products.map((p) => (
          <Section
            key={p.id}
            style={{
              padding: "14px 0",
              borderBottom: `1px solid ${C.earth100}`,
            }}
          >
            <table cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
              <tbody>
                <tr>
                  {p.imageUrl ? (
                    <td style={{ width: "76px", verticalAlign: "top" }}>
                      <Img
                        src={p.imageUrl}
                        alt={p.name}
                        width="64"
                        height="64"
                        style={{
                          borderRadius: "8px",
                          border: `1px solid ${C.earth100}`,
                          objectFit: "cover",
                        }}
                      />
                    </td>
                  ) : null}
                  <td style={{ verticalAlign: "top" }}>
                    <Link
                      href={`${baseUrl}/producto/${p.slug}`}
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: C.earth900,
                        textDecoration: "none",
                        display: "block",
                        marginBottom: "2px",
                      }}
                    >
                      {p.name}
                    </Link>
                    <Text
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: C.leaf700,
                        margin: "2px 0",
                      }}
                    >
                      {formatCOP(p.priceCop)}
                    </Text>
                    {p.reason ? (
                      <Text
                        style={{
                          fontSize: "13px",
                          color: C.earth500,
                          fontStyle: "italic",
                          margin: "4px 0 0",
                          lineHeight: 1.5,
                        }}
                      >
                        {p.reason}
                      </Text>
                    ) : null}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
        ))}
      </Section>

      {/* Cupón */}
      <Section
        style={{
          margin: "24px 0",
          padding: "20px",
          backgroundColor: C.earth50,
          borderRadius: "10px",
          border: `1px dashed ${C.iris600}`,
          textAlign: "center",
        }}
      >
        <Text
          style={{
            fontSize: "12px",
            color: C.earth500,
            textTransform: "uppercase",
            letterSpacing: "1px",
            margin: "0 0 6px",
          }}
        >
          Tu cupón de bienvenida
        </Text>
        <Text
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: C.iris700,
            letterSpacing: "2px",
            margin: "0 0 6px",
          }}
        >
          {couponCode}
        </Text>
        <Text style={{ fontSize: "13px", color: C.earth700, margin: 0 }}>
          10% en tu primera compra. Aplícalo al pagar.
        </Text>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: "center", margin: "8px 0 16px" }}>
        <Button
          href={`${baseUrl}/tienda`}
          style={{
            backgroundColor: C.iris700,
            color: C.white,
            fontSize: "15px",
            fontWeight: 600,
            textDecoration: "none",
            padding: "13px 32px",
            borderRadius: "8px",
            display: "inline-block",
          }}
        >
          Explorar la tienda
        </Button>
      </Section>

      {resultUrl ? (
        <Text style={{ textAlign: "center", fontSize: "13px", margin: "0 0 8px" }}>
          <Link href={resultUrl} style={{ color: C.iris700, textDecoration: "underline" }}>
            Volver a ver tu selección
          </Link>
        </Text>
      ) : null}

      <Hr style={{ borderColor: C.earth100, margin: "24px 0 0" }} />
      <Text
        style={{
          fontSize: "13px",
          color: C.earth500,
          lineHeight: 1.6,
          margin: "16px 0 0",
        }}
      >
        Recibes este correo porque completaste nuestro cuestionario de
        bienestar en naturalvita.co.
      </Text>
    </EmailLayout>
  );
}

export default QuizResult;
