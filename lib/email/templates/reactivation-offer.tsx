import { Section, Text } from "@react-email/components";
import { EmailLayout, EMAIL_COLORS as C } from "./_layout";

export type ReactivationOfferProps = {
  customerName: string | null;
  shopUrl: string;
  unsubscribeUrl: string;
  couponCode: string;
  couponPercent: number;
  expiresInHours: number;
};

/**
 * Email de reactivacion (~60 dias sin comprar).
 *
 * Aqui SI va cupon unico: el cliente se enfrio y necesita un empujon real.
 * Code de un solo uso, expira en pocos dias, generado al despachar. No se
 * vuelve a insistir despues con esta ventana.
 */
export function ReactivationOffer({
  customerName,
  shopUrl,
  unsubscribeUrl,
  couponCode,
  couponPercent,
  expiresInHours,
}: ReactivationOfferProps) {
  const greeting = customerName
    ? `${customerName.split(" ")[0]}, te extranamos`
    : "Te extranamos";

  const days = Math.round(expiresInHours / 24);

  return (
    <EmailLayout
      preview={`Un beneficio especial para retomar tu bienestar.`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "22px",
          color: C.leaf900,
          margin: "0 0 12px",
          lineHeight: 1.3,
        }}
      >
        {greeting}
      </Text>

      <Text
        style={{
          fontSize: "14px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 20px",
        }}
      >
        Hace un tiempo confiaste en NaturalVita para tu bienestar. Queremos
        que vuelvas, y preparamos un beneficio personal para hacerlo mas
        facil:
      </Text>

      <Section
        style={{
          backgroundColor: C.leaf100,
          border: `2px dashed ${C.leaf700}`,
          borderRadius: "12px",
          padding: "20px 16px",
          margin: "0 0 20px",
          textAlign: "center" as const,
        }}
      >
        <Text
          style={{
            fontSize: "11px",
            color: C.leaf700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.15em",
            fontWeight: 600,
            margin: "0 0 6px",
          }}
        >
          Tu codigo personal
        </Text>
        <Text
          style={{
            fontFamily: "Menlo, Monaco, Consolas, monospace",
            fontSize: "24px",
            color: C.leaf900,
            margin: "0 0 6px",
            letterSpacing: "0.08em",
            fontWeight: 700,
          }}
        >
          {couponCode}
        </Text>
        <Text
          style={{
            fontSize: "12px",
            color: C.earth700,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {couponPercent}% de descuento · valido {days}{" "}
          {days === 1 ? "dia" : "dias"} · un solo uso
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, margin: "0 0 20px" }}>
        <a
          href={shopUrl}
          style={{
            display: "inline-block",
            backgroundColor: C.iris700,
            color: C.white,
            padding: "14px 32px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "15px",
            fontWeight: 500,
          }}
        >
          Retomar mi bienestar
        </a>
      </Section>

      <Text
        style={{
          fontSize: "12px",
          color: C.earth500,
          margin: "16px 0 0",
          lineHeight: 1.5,
        }}
      >
        Cada producto sigue con su registro sanitario INVIMA y envio a toda
        Colombia.
      </Text>
    </EmailLayout>
  );
}
