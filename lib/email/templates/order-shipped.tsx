import { Section, Text } from "@react-email/components";
import { EmailLayout, EMAIL_COLORS as C } from "./_layout";

export type OrderShippedProps = {
  customerName: string;
  orderNumber: string;
  trackingNumber: string | null;
  carrier: string | null;
  shippingAddress: {
    recipient: string;
    street: string;
    details: string | null;
    city: string;
    department: string;
  };
  trackingUrl: string;
};

/**
 * Email enviado cuando el admin marca el pedido como shipped en
 * /admin/pedidos/[id]. Le avisa al cliente que su paquete ya salió.
 *
 * Si hay tracking_number lo destacamos. Si no, el email igual sale
 * pero sin el bloque de número (caso típico para pedidos en moto local
 * Bogotá donde aplican mensajería propia sin guía).
 */
export function OrderShipped({
  customerName,
  orderNumber,
  trackingNumber,
  carrier,
  shippingAddress,
  trackingUrl,
}: OrderShippedProps) {
  const firstName = customerName.split(" ")[0] || "Hola";

  return (
    <EmailLayout
      preview={`Tu pedido ${orderNumber} ya está en camino.`}
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
        ¡Tu pedido va en camino, {firstName}!
      </Text>
      <Text
        style={{
          fontSize: "14px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        Despachamos tu pedido <strong>{orderNumber}</strong>. Llegará a tu
        dirección en los próximos 2 a 5 días hábiles según el departamento.
      </Text>

      {trackingNumber && (
        <>
          <Text
            style={{
              fontSize: "11px",
              color: C.earth500,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              margin: "0 0 8px",
            }}
          >
            Número de guía
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
                fontSize: "16px",
                color: C.leaf900,
                margin: 0,
                fontFamily:
                  "Menlo, Monaco, Consolas, monospace",
                letterSpacing: "0.02em",
              }}
            >
              {trackingNumber}
            </Text>
            {carrier && (
              <Text
                style={{
                  fontSize: "12px",
                  color: C.earth700,
                  margin: "6px 0 0",
                }}
              >
                Transportadora: {carrier}
              </Text>
            )}
          </Section>
        </>
      )}

      <Text
        style={{
          fontSize: "11px",
          color: C.earth500,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          margin: "0 0 8px",
        }}
      >
        Llegará a
      </Text>
      <Text
        style={{
          fontSize: "13px",
          color: C.leaf900,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {shippingAddress.recipient}
        <br />
        {shippingAddress.street}
        {shippingAddress.details ? `, ${shippingAddress.details}` : ""}
        <br />
        {shippingAddress.city}, {shippingAddress.department}
      </Text>

      <Section style={{ textAlign: "center", margin: "28px 0 0" }}>
        <a
          href={trackingUrl}
          style={{
            display: "inline-block",
            backgroundColor: C.iris700,
            color: C.white,
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Ver detalle del pedido
        </a>
      </Section>
    </EmailLayout>
  );
}
