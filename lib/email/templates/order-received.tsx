import { Section, Text } from "@react-email/components";
import {
  EmailLayout,
  EMAIL_COLORS as C,
  formatCopForEmail,
} from "./_layout";

export type OrderReceivedProps = {
  customerName: string;
  orderNumber: string;
  totalCop: number;
};

/**
 * Email enviado cuando el cliente termina el checkout y abre la pasarela
 * de Bold. Aún no sabemos si el pago se aprobó — eso llega por webhook
 * después y dispara `OrderPaid`.
 *
 * Propósito: dejar registro al cliente de que su intento de compra
 * quedó registrado, con su número de orden para soporte.
 */
export function OrderReceived({
  customerName,
  orderNumber,
  totalCop,
}: OrderReceivedProps) {
  const firstName = customerName.split(" ")[0] || "Hola";
  return (
    <EmailLayout
      preview={`Tu pedido ${orderNumber} fue registrado, estamos procesando tu pago.`}
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
        Hola {firstName}, registramos tu pedido
      </Text>
      <Text
        style={{
          fontSize: "14px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        Estamos procesando tu pago. Te enviamos otro correo en cuanto se
        confirme. Si necesitas comunicarte con nosotros, usa este número
        de pedido como referencia:
      </Text>

      <Section
        style={{
          backgroundColor: C.earth50,
          borderRadius: "8px",
          padding: "16px",
          margin: "0 0 24px",
        }}
      >
        <Text
          style={{
            fontSize: "10px",
            color: C.earth500,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            margin: 0,
          }}
        >
          Número de pedido
        </Text>
        <Text
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "18px",
            color: C.leaf900,
            margin: "4px 0 0",
            fontWeight: 600,
          }}
        >
          {orderNumber}
        </Text>
        <Text
          style={{
            fontSize: "12px",
            color: C.earth700,
            margin: "12px 0 0",
          }}
        >
          Total: <strong>{formatCopForEmail(totalCop)}</strong>
        </Text>
      </Section>

      <Text
        style={{
          fontSize: "13px",
          color: C.earth500,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        Si tu pago no se procesa exitosamente, no se realizará cobro alguno
        y podrás reintentar desde el sitio.
      </Text>
    </EmailLayout>
  );
}
