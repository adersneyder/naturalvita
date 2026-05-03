import { Text } from "@react-email/components";
import {
  EmailLayout,
  EMAIL_COLORS as C,
  formatCopForEmail,
} from "./_layout";

export type OrderRefundedProps = {
  customerName: string;
  orderNumber: string;
  totalCop: number;
};

/**
 * Email cuando llega webhook VOID_APPROVED de Bold (reembolso procesado).
 *
 * Bold ya devolvió el dinero — este email solo confirma al cliente y le
 * informa los tiempos típicos de visualización en el extracto bancario.
 */
export function OrderRefunded({
  customerName,
  orderNumber,
  totalCop,
}: OrderRefundedProps) {
  const firstName = customerName.split(" ")[0] || "Hola";
  return (
    <EmailLayout
      preview={`Procesamos el reembolso del pedido ${orderNumber}.`}
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
        {firstName}, procesamos tu reembolso
      </Text>
      <Text
        style={{
          fontSize: "14px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 16px",
        }}
      >
        El reembolso del pedido <strong>{orderNumber}</strong> por{" "}
        <strong>{formatCopForEmail(totalCop)}</strong> fue aprobado por nuestra
        pasarela de pagos.
      </Text>
      <Text
        style={{
          fontSize: "13px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 16px",
        }}
      >
        El dinero aparecerá reflejado en tu medio de pago original entre 3 y 10
        días hábiles, según las políticas de tu banco emisor.
      </Text>
      <Text
        style={{
          fontSize: "12px",
          color: C.earth500,
          margin: 0,
        }}
      >
        Si tienes alguna duda, escríbenos a contacto@naturalvita.co citando el
        número de pedido.
      </Text>
    </EmailLayout>
  );
}
