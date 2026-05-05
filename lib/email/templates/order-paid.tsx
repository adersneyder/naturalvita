import { Hr, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  EMAIL_COLORS as C,
  formatCopForEmail,
} from "./_layout";

export type OrderPaidProps = {
  customerName: string;
  orderNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    line_total: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  /** COP descontados por cupón. 0 si no se aplicó cupón. */
  discount?: number;
  /** Código del cupón aplicado para mostrar al cliente. */
  couponCode?: string | null;
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
 * Email enviado cuando llega el webhook SALE_APPROVED de Bold.
 * Es el email "comercial" más importante: confirmación de pago, resumen
 * detallado del pedido, dirección de envío, tiempo estimado, link para
 * seguir el pedido en la cuenta.
 */
export function OrderPaid({
  customerName,
  orderNumber,
  items,
  subtotal,
  shipping,
  tax,
  total,
  discount = 0,
  couponCode,
  shippingAddress,
  trackingUrl,
}: OrderPaidProps) {
  const firstName = customerName.split(" ")[0] || "Hola";

  return (
    <EmailLayout
      preview={`Pago confirmado del pedido ${orderNumber}, ya estamos preparándolo.`}
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
        ¡Listo, {firstName}! Confirmamos tu pago
      </Text>
      <Text
        style={{
          fontSize: "14px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        Tu pedido <strong>{orderNumber}</strong> ya está en nuestra lista de
        despachos. Te avisaremos por correo cuando salga rumbo a tu
        dirección.
      </Text>

      {/* Resumen de items */}
      <Text
        style={{
          fontSize: "11px",
          color: C.earth500,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          margin: "0 0 12px",
        }}
      >
        Tu pedido
      </Text>
      <Section
        style={{
          backgroundColor: C.earth50,
          borderRadius: "8px",
          padding: "16px",
          margin: "0 0 16px",
        }}
      >
        {items.map((item, idx) => (
          <Section
            key={idx}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: idx === items.length - 1 ? "0" : "0 0 10px",
            }}
          >
            <Text
              style={{
                fontSize: "13px",
                color: C.leaf900,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {item.quantity}× {item.name}
            </Text>
            <Text
              style={{
                fontSize: "13px",
                color: C.leaf900,
                margin: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatCopForEmail(item.line_total)}
            </Text>
          </Section>
        ))}

        <Hr style={{ borderColor: C.earth100, margin: "12px 0" }} />

        <Section style={{ display: "flex", justifyContent: "space-between" }}>
          <Text style={{ fontSize: "12px", color: C.earth700, margin: "2px 0" }}>
            Subtotal
          </Text>
          <Text
            style={{
              fontSize: "12px",
              color: C.earth700,
              margin: "2px 0",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCopForEmail(subtotal)}
          </Text>
        </Section>
        <Section style={{ display: "flex", justifyContent: "space-between" }}>
          <Text style={{ fontSize: "12px", color: C.earth700, margin: "2px 0" }}>
            IVA
          </Text>
          <Text
            style={{
              fontSize: "12px",
              color: C.earth700,
              margin: "2px 0",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCopForEmail(tax)}
          </Text>
        </Section>
        <Section style={{ display: "flex", justifyContent: "space-between" }}>
          <Text style={{ fontSize: "12px", color: C.earth700, margin: "2px 0" }}>
            Envío
          </Text>
          <Text
            style={{
              fontSize: "12px",
              color: C.earth700,
              margin: "2px 0",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {shipping === 0 ? "Gratis" : formatCopForEmail(shipping)}
          </Text>
        </Section>
        {discount > 0 && (
          <Section
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <Text
              style={{
                fontSize: "12px",
                color: C.leaf700,
                margin: "2px 0",
              }}
            >
              Descuento{couponCode ? ` (${couponCode})` : ""}
            </Text>
            <Text
              style={{
                fontSize: "12px",
                color: C.leaf700,
                margin: "2px 0",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
              }}
            >
              −{formatCopForEmail(discount)}
            </Text>
          </Section>
        )}

        <Hr style={{ borderColor: C.earth100, margin: "12px 0 8px" }} />

        <Section style={{ display: "flex", justifyContent: "space-between" }}>
          <Text
            style={{
              fontSize: "14px",
              color: C.leaf900,
              margin: 0,
              fontWeight: 600,
            }}
          >
            Total pagado
          </Text>
          <Text
            style={{
              fontSize: "14px",
              color: C.leaf900,
              margin: 0,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCopForEmail(total)}
          </Text>
        </Section>
      </Section>

      {/* Dirección de envío */}
      <Text
        style={{
          fontSize: "11px",
          color: C.earth500,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          margin: "16px 0 8px",
        }}
      >
        Envío a
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

      <Text
        style={{
          fontSize: "12px",
          color: C.earth500,
          margin: "12px 0 0",
        }}
      >
        Tiempo estimado de entrega: 2 a 5 días hábiles según tu departamento.
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
