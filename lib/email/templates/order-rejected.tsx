import { Section, Text } from "@react-email/components";
import {
  EmailLayout,
  EMAIL_COLORS as C,
  formatCopForEmail,
} from "./_layout";

export type OrderRejectedProps = {
  customerName: string;
  orderNumber: string;
  totalCop: number;
  reason?: string;
  retryUrl: string;
};

/**
 * Email cuando llega webhook SALE_REJECTED. Caso típico: tarjeta declinada
 * por el banco (sin fondos, antifraude del emisor, OTP fallido).
 *
 * Tono: empático, sin culpar, con CTA claro para reintentar. Es el email
 * más importante para recuperar ventas: estudios muestran que 30-40% de
 * pagos rechazados se recuperan si se les da opción inmediata de reintentar.
 */
export function OrderRejected({
  customerName,
  orderNumber,
  totalCop,
  reason,
  retryUrl,
}: OrderRejectedProps) {
  const firstName = customerName.split(" ")[0] || "Hola";
  return (
    <EmailLayout
      preview={`No pudimos procesar tu pago del pedido ${orderNumber}. Puedes reintentar.`}
    >
      <Text
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "22px",
          color: C.leaf900,
          margin: "0 0 8px",
          lineHeight: 1.3,
        }}
      >
        {firstName}, tu pago no se procesó
      </Text>
      <Text
        style={{
          fontSize: "14px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 16px",
        }}
      >
        El intento de pago para el pedido <strong>{orderNumber}</strong> por{" "}
        <strong>{formatCopForEmail(totalCop)}</strong> no se pudo completar.
        No se realizó ningún cobro.
      </Text>

      {reason && (
        <Section
          style={{
            backgroundColor: "#fef3f2",
            border: "1px solid #fee4e2",
            borderRadius: "8px",
            padding: "12px 16px",
            margin: "0 0 20px",
          }}
        >
          <Text
            style={{
              fontSize: "12px",
              color: "#b42318",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            <strong>Razón informada:</strong> {reason}
          </Text>
        </Section>
      )}

      <Text
        style={{
          fontSize: "13px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        Causas comunes: fondos insuficientes, datos incorrectos, o el banco
        emisor bloqueó la transacción. Te sugerimos verificar con tu banco
        o intentar con otro medio de pago (PSE, Nequi, otra tarjeta).
      </Text>

      <Section style={{ textAlign: "center", margin: "0 0 16px" }}>
        <a
          href={retryUrl}
          style={{
            display: "inline-block",
            backgroundColor: C.iris700,
            color: C.white,
            padding: "12px 28px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Reintentar el pago
        </a>
      </Section>

      <Text
        style={{
          fontSize: "12px",
          color: C.earth500,
          textAlign: "center",
          margin: 0,
        }}
      >
        Si necesitas ayuda, escríbenos a contacto@naturalvita.co
      </Text>
    </EmailLayout>
  );
}
