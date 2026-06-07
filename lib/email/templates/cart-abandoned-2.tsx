import { Section, Text } from "@react-email/components";
import { EmailLayout, EMAIL_COLORS as C } from "./_layout";

export type CartAbandoned2Props = {
  customerName: string | null;
  cartUrl: string;
  unsubscribeUrl: string;
  itemNames: string[];
  /** Otros productos populares para sugerir (prueba social). */
  popularProducts: Array<{ name: string; url: string }>;
};

/**
 * Email 2 de la serie de carrito abandonado (24h despues).
 * Tono: prueba social y utilidad. SIN cupon todavia.
 * Apunta a convencer por valor, no por precio.
 */
export function CartAbandoned2({
  customerName,
  cartUrl,
  unsubscribeUrl,
  itemNames,
  popularProducts,
}: CartAbandoned2Props) {
  const greeting = customerName
    ? `${customerName.split(" ")[0]}, tu seleccion sigue ahi`
    : "Tu seleccion sigue ahi";

  const itemList =
    itemNames.length === 1
      ? itemNames[0]
      : itemNames.length === 2
        ? `${itemNames[0]} y ${itemNames[1]}`
        : `${itemNames.slice(0, -1).join(", ")} y ${itemNames[itemNames.length - 1]}`;

  return (
    <EmailLayout
      preview="Otros clientes han elegido los mismos productos."
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
          margin: "0 0 16px",
        }}
      >
        Sigues considerando {itemList}. Pensamos que te puede ayudar saber
        que es una eleccion frecuente entre quienes buscan productos
        respaldados por laboratorios verificados.
      </Text>

      {popularProducts.length > 0 && (
        <Section
          style={{
            backgroundColor: C.earth50,
            border: `1px solid ${C.earth100}`,
            borderRadius: "8px",
            padding: "16px",
            margin: "0 0 20px",
          }}
        >
          <Text
            style={{
              fontSize: "11px",
              color: C.earth700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.12em",
              fontWeight: 600,
              margin: "0 0 8px",
            }}
          >
            Tambien populares esta semana
          </Text>
          {popularProducts.map((p) => (
            <Text
              key={p.url}
              style={{
                fontSize: "13px",
                color: C.leaf900,
                margin: "4px 0",
              }}
            >
              <a
                href={p.url}
                style={{ color: C.leaf900, textDecoration: "none" }}
              >
                {p.name}
              </a>
            </Text>
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
          color: C.earth500,
          margin: "16px 0 0",
          lineHeight: 1.5,
        }}
      >
        Si no es el momento, esta bien. Tu seleccion seguira ahi.
      </Text>
    </EmailLayout>
  );
}
