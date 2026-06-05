import { Section, Text } from "@react-email/components";
import { EmailLayout, EMAIL_COLORS as C } from "./_layout";

export type WelcomeFollowupProduct = {
  name: string;
  url: string;
  imageUrl: string | null;
};

export type WelcomeFollowupProps = {
  /** Nombre del suscriptor si se conoce; null si solo dimos email. */
  customerName: string | null;
  /** Código del cupón a recordar (ej: WELCOME10). */
  couponCode: string;
  /** URL absoluta a la tienda (puede llevar atribución de Savia). */
  shopUrl: string;
  /** URL absoluta de desuscripción (con token único). */
  unsubscribeUrl: string;
  /**
   * Más vendidos resueltos en el momento del envío (render dinámico):
   * reflejan el catálogo actual, no el de cuando se encoló el correo.
   */
  bestSellers: WelcomeFollowupProduct[];
};

/**
 * Email 2 de la serie de bienvenida (se envía ~3 días después del primero).
 *
 * Propósito: recordar el cupón antes de que caduque mentalmente y empujar
 * el primer pedido mostrando los productos que más compra la gente. Los
 * productos se resuelven al despachar el correo, así que siempre están al
 * día con el catálogo.
 */
export function WelcomeFollowup({
  customerName,
  couponCode,
  shopUrl,
  unsubscribeUrl,
  bestSellers,
}: WelcomeFollowupProps) {
  const greeting = customerName
    ? `${customerName.split(" ")[0]}, tu cupón sigue activo`
    : "Tu cupón sigue activo";

  return (
    <EmailLayout
      preview={`Aún puedes usar ${couponCode} en tu primera compra.`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "24px",
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
          margin: "0 0 24px",
        }}
      >
        Sigue disponible tu código <strong>{couponCode}</strong> para tu
        primera compra. Para inspirarte, estos son los productos que más
        eligen nuestros clientes esta semana:
      </Text>

      {bestSellers.length > 0 && (
        <Section style={{ margin: "0 0 24px" }}>
          {bestSellers.map((p) => (
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

      <Section style={{ textAlign: "center" as const, margin: "0 0 24px" }}>
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
          Ver la tienda
        </a>
      </Section>

      <Text
        style={{
          fontSize: "12px",
          color: C.earth500,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Aplica <strong>{couponCode}</strong> al finalizar tu compra. Si no
        quieres recibir más correos, puedes cancelar la suscripción abajo.
      </Text>
    </EmailLayout>
  );
}
