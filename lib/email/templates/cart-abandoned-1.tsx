import { Section, Text } from "@react-email/components";
import { EmailLayout, EMAIL_COLORS as C, formatCopForEmail } from "./_layout";

export type CartAbandonedProduct = {
  name: string;
  url: string;
  imageUrl: string | null;
  quantity: number;
  priceCop: number;
};

export type CartAbandoned1Props = {
  customerName: string | null;
  cartUrl: string;
  unsubscribeUrl: string;
  items: CartAbandonedProduct[];
};

/**
 * Email 1 de la serie de carrito abandonado (1h despues).
 * Tono: recordatorio amable, SIN cupon. Recuperacion a costo cero.
 * Lo unico que ofrece es facilidad para volver y senales de confianza
 * (INVIMA, transporte) que probablemente eran la duda real.
 */
export function CartAbandoned1({
  customerName,
  cartUrl,
  unsubscribeUrl,
  items,
}: CartAbandoned1Props) {
  const greeting = customerName
    ? `${customerName.split(" ")[0]}, quedo algo en tu carrito`
    : "Quedo algo en tu carrito";

  return (
    <EmailLayout
      preview="Tu seleccion sigue lista para retomar."
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
        Guardamos tu seleccion para que no tengas que empezar de cero. Solo
        retoma cuando puedas:
      </Text>

      {items.length > 0 && (
        <Section style={{ margin: "0 0 20px" }}>
          {items.map((p) => (
            <a
              key={p.url}
              href={p.url}
              style={{
                display: "block",
                textDecoration: "none",
                padding: "12px",
                marginBottom: "8px",
                border: `1px solid ${C.earth100}`,
                borderRadius: "8px",
                color: C.leaf900,
              }}
            >
              <table style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    {p.imageUrl && (
                      <td style={{ width: "56px", verticalAlign: "middle" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          width={48}
                          height={48}
                          style={{
                            borderRadius: "6px",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      </td>
                    )}
                    <td style={{ verticalAlign: "middle" }}>
                      <Text
                        style={{
                          fontSize: "14px",
                          color: C.leaf900,
                          margin: 0,
                          fontWeight: 500,
                        }}
                      >
                        {p.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: "12px",
                          color: C.earth700,
                          margin: "2px 0 0",
                        }}
                      >
                        Cantidad {p.quantity} · {formatCopForEmail(p.priceCop)}
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </a>
          ))}
        </Section>
      )}

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
          Volver al carrito
        </a>
      </Section>

      <Text
        style={{
          fontSize: "12px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "16px 0 0",
        }}
      >
        Cada producto en NaturalVita cuenta con registro sanitario INVIMA y
        se despacha desde Bogota con transportadoras a toda Colombia.
      </Text>
    </EmailLayout>
  );
}
