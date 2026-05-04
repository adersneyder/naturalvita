import { Section, Text } from "@react-email/components";
import { EmailLayout, EMAIL_COLORS as C } from "./_layout";

export type OrderShippedProps = {
  customerName: string;
  orderNumber: string;
  trackingNumber: string | null;
  /** Nombre legible de la transportadora ("Servientrega", "Coordinadora", etc.) */
  carrier: string | null;
  /** URL deep-link a la página de tracking de la transportadora con
   * número pre-llenado, si la transportadora soporta deep-link. NULL si no. */
  carrierTrackingUrl: string | null;
  shippingAddress: {
    recipient: string;
    street: string;
    details: string | null;
    city: string;
    department: string;
  };
  /** URL al detalle del pedido en NaturalVita (siempre disponible) */
  orderUrl: string;
};

/**
 * Email enviado cuando el admin marca el pedido como shipped en
 * /admin/pedidos/[id]. Le avisa al cliente que su paquete ya salió.
 *
 * Lógica del botón de tracking:
 *   - Si hay carrierTrackingUrl: botón principal "Rastrear con [Carrier]"
 *     que lleva directo al tracking con el número pre-llenado.
 *   - Si no hay carrierTrackingUrl pero sí trackingNumber + carrier: bloque
 *     visible con el número y una nota para que el cliente lo busque manual.
 *   - Si no hay tracking: solo el botón secundario al detalle en NaturalVita.
 *
 * En todos los casos hay un botón secundario "Ver detalle del pedido" que
 * lleva a /mi-cuenta/pedido/[order_number] dentro de NaturalVita.
 */
export function OrderShipped({
  customerName,
  orderNumber,
  trackingNumber,
  carrier,
  carrierTrackingUrl,
  shippingAddress,
  orderUrl,
}: OrderShippedProps) {
  const firstName = customerName.split(" ")[0] || "Hola";
  const hasDeepLink = Boolean(carrierTrackingUrl);

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
              margin: "0 0 16px",
            }}
          >
            <Text
              style={{
                fontSize: "16px",
                color: C.leaf900,
                margin: 0,
                fontFamily: "Menlo, Monaco, Consolas, monospace",
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

          {/* Botón principal de tracking si hay deep link */}
          {hasDeepLink && carrierTrackingUrl && (
            <Section style={{ textAlign: "center", margin: "16px 0 24px" }}>
              <a
                href={carrierTrackingUrl}
                target="_blank"
                rel="noopener noreferrer"
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
                Rastrear con {carrier}
              </a>
            </Section>
          )}

          {/* Si no hay deep link pero hay carrier, mensaje informativo */}
          {!hasDeepLink && carrier && (
            <Text
              style={{
                fontSize: "12px",
                color: C.earth500,
                margin: "0 0 24px",
                lineHeight: 1.5,
                fontStyle: "italic",
              }}
            >
              Para rastrear el envío, copia el número de guía y búscalo en la
              página de {carrier}.
            </Text>
          )}
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

      {/* Botón secundario al detalle en NaturalVita */}
      <Section style={{ textAlign: "center", margin: "28px 0 0" }}>
        <a
          href={orderUrl}
          style={{
            display: "inline-block",
            backgroundColor: hasDeepLink ? C.white : C.iris700,
            color: hasDeepLink ? C.leaf900 : C.white,
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 500,
            border: hasDeepLink ? `1px solid ${C.earth100}` : "none",
          }}
        >
          {hasDeepLink ? "Ver detalle en NaturalVita" : "Ver detalle del pedido"}
        </a>
      </Section>
    </EmailLayout>
  );
}
