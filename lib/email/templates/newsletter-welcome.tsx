import { Section, Text } from "@react-email/components";
import { EmailLayout, EMAIL_COLORS as C } from "./_layout";

export type NewsletterWelcomeProps = {
  /** Nombre del suscriptor si se conoce; null si solo dimos email */
  customerName: string | null;
  /** Código del cupón a mostrar prominente (ej: WELCOME10) */
  couponCode: string;
  /** Descripción humana del cupón (ej: "10% en tu primera compra") */
  couponDescription: string;
  /** URL absoluta a la tienda */
  shopUrl: string;
  /** URL absoluta a desuscripción (con token único) */
  unsubscribeUrl: string;
};

/**
 * Email de bienvenida al newsletter. Se envía cuando alguien se suscribe
 * desde el footer del sitio. Incluye cupón de bienvenida prominente.
 *
 * El cupón sirve como triple propósito:
 *   1. Recompensa el opt-in del usuario (incentivo).
 *   2. Confirmación implícita de la suscripción (si recibió esto, sí se suscribió).
 *   3. Conversión inmediata: ya tiene el código en mano, próxima visita lo aplica.
 */
export function NewsletterWelcome({
  customerName,
  couponCode,
  couponDescription,
  shopUrl,
  unsubscribeUrl,
}: NewsletterWelcomeProps) {
  const greeting = customerName
    ? `Bienvenido a NaturalVita, ${customerName.split(" ")[0]}`
    : "Bienvenido a NaturalVita";

  return (
    <EmailLayout
      preview={`Bienvenido a NaturalVita. Tu cupón ${couponCode} ya está listo.`}
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
  Gracias por sumarte a nuestra comunidad. Aquí seleccionamos suplementos y productos naturales de
  laboratorios verificados para acompañar tu bienestar cada día.
</Text>

      {/* Bloque del cupón — visualmente destacado */}
      <Section
        style={{
          backgroundColor: C.leaf100,
          border: `2px dashed ${C.leaf700}`,
          borderRadius: "12px",
          padding: "24px 16px",
          margin: "0 0 24px",
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
            margin: "0 0 8px",
          }}
        >
          Tu cupón de bienvenida
        </Text>
        <Text
          style={{
            fontFamily: "Menlo, Monaco, Consolas, monospace",
            fontSize: "32px",
            color: C.leaf900,
            margin: "0 0 8px",
            letterSpacing: "0.1em",
            fontWeight: 700,
          }}
        >
          {couponCode}
        </Text>
        <Text
          style={{
            fontSize: "13px",
            color: C.earth700,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {couponDescription}
        </Text>
      </Section>

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
          Ir a la tienda
        </a>
      </Section>

      <Text
        style={{
          fontSize: "13px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 16px",
        }}
      >
        Aplica el código <strong>{couponCode}</strong> al hacer tu compra.
        Recibirás novedades, lanzamientos de productos y descuentos exclusivos
        en tu correo, sin spam y sin compartir tu información con terceros.
      </Text>

      <Text
        style={{
          fontSize: "12px",
          color: C.earth500,
          margin: 0,
          fontStyle: "italic",
          lineHeight: 1.5,
        }}
      >
        ¿No te suscribiste tú? Es rápido salir de esta lista — solo da click
        en &ldquo;cancelar suscripción&rdquo; al final de este correo y no
        recibirás más mensajes nuestros.
      </Text>
    </EmailLayout>
  );
}
