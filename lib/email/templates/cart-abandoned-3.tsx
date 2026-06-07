import { Section, Text } from "@react-email/components";
import { EmailLayout, EMAIL_COLORS as C } from "./_layout";

export type CartAbandoned3Props = {
  customerName: string | null;
  cartUrl: string;
  unsubscribeUrl: string;
  couponCode: string;
  couponPercent: number;
  expiresInHours: number;
};

/**
 * Email 3 (ultimo) de la serie de carrito abandonado (72h despues).
 * Tono: cierre. UN cupon unico de un solo uso, expira en 48h. No se
 * vuelve a insistir despues. El descuento se reserva solo para quien
 * llego hasta aqui sin convertir.
 */
export function CartAbandoned3({
  customerName,
  cartUrl,
  unsubscribeUrl,
  couponCode,
  couponPercent,
  expiresInHours,
}: CartAbandoned3Props) {
  const greeting = customerName
    ? `${customerName.split(" ")[0]}, ultimo recordatorio`
    : "Ultimo recordatorio";

  return (
    <EmailLayout
      preview={`Tu beneficio ${couponCode} caduca en ${expiresInHours} horas.`}
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
        Como ultima muestra, generamos un beneficio especial solo para ti y
        solo para este carrito. No se reutiliza ni se comparte:
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
          {couponPercent}% de descuento · caduca en {expiresInHours} horas ·
          un solo uso
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, margin: "0 0 20px" }}>
        <a
          href={cartUrl}
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
          Retomar mi carrito
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
        Despues de este correo no insistiremos mas con este carrito.
      </Text>
    </EmailLayout>
  );
}
