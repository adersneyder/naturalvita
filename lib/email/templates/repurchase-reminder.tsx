import { Section, Text } from "@react-email/components";
import { EmailLayout, EMAIL_COLORS as C } from "./_layout";

export type RepurchaseProduct = {
  name: string;
  url: string;
  imageUrl: string | null;
};

export type RepurchaseReminderProps = {
  customerName: string | null;
  shopUrl: string;
  unsubscribeUrl: string;
  /** Productos del último pedido, resueltos al despachar (#4). */
  products: RepurchaseProduct[];
};

/**
 * Email de recompra (~30 dias despues de la ultima compra).
 *
 * SIN cupon a proposito: es un cliente satisfecho cuyo producto se esta
 * acabando. No hay que erosionar margen para que vuelva; basta recordarle
 * y hacerle facil reordenar. El descuento se reserva para quien se enfria
 * de verdad (reactivacion a 60d).
 */
export function RepurchaseReminder({
  customerName,
  shopUrl,
  unsubscribeUrl,
  products,
}: RepurchaseReminderProps) {
  const greeting = customerName
    ? `${customerName.split(" ")[0]}, ya es momento de reabastecer?`
    : "Ya es momento de reabastecer?";

  return (
    <EmailLayout
      preview="Vuelve a pedir lo que ya conoces, en un toque."
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
        Hace unas semanas confiaste en estos productos. Si ya se estan
        terminando, reordenarlos toma solo un momento:
      </Text>

      {products.length > 0 && (
        <Section style={{ margin: "0 0 20px" }}>
          {products.map((p) => (
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
          Volver a pedir
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
        Mantener la constancia es lo que hace la diferencia en el bienestar.
      </Text>
    </EmailLayout>
  );
}
