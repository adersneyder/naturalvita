import { Section, Text } from "@react-email/components";
import { EmailLayout, EMAIL_COLORS as C } from "./_layout";

export type ContactInquiryProps = {
  fromName: string;
  fromEmail: string;
  fromPhone: string | null;
  subject: string;
  message: string;
  /** ISO de cuándo se envió */
  receivedAt: string;
};

/**
 * Email interno enviado a pedidos@naturalvita.co cuando un cliente
 * llena el formulario de /contacto. NO se envía al cliente; el cliente
 * recibe un email separado (ver `ContactConfirmation`) confirmando que
 * recibimos su mensaje.
 *
 * El reply-to se setea al email del cliente para que dar "Responder" en
 * Gmail vaya directo a él, no a info@naturalvita.co.
 */
export function ContactInquiry({
  fromName,
  fromEmail,
  fromPhone,
  subject,
  message,
  receivedAt,
}: ContactInquiryProps) {
  return (
    <EmailLayout preview={`Nuevo mensaje de contacto: ${subject}`}>
      <Text
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "20px",
          color: C.leaf900,
          margin: "0 0 8px",
        }}
      >
        Nuevo mensaje de contacto
      </Text>
      <Text
        style={{
          fontSize: "13px",
          color: C.earth700,
          margin: "0 0 24px",
        }}
      >
        Recibido el{" "}
        {new Intl.DateTimeFormat("es-CO", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "America/Bogota",
        }).format(new Date(receivedAt))}
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
            fontSize: "11px",
            color: C.earth700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 4px",
          }}
        >
          De
        </Text>
        <Text
          style={{
            fontSize: "15px",
            color: C.leaf900,
            margin: "0 0 4px",
            fontWeight: 500,
          }}
        >
          {fromName}
        </Text>
        <Text style={{ fontSize: "13px", color: C.earth700, margin: 0 }}>
          {fromEmail}
        </Text>
        {fromPhone && (
          <Text style={{ fontSize: "13px", color: C.earth700, margin: "2px 0 0" }}>
            Tel. {fromPhone}
          </Text>
        )}
      </Section>

      <Text
        style={{
          fontSize: "11px",
          color: C.earth700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "0 0 4px",
        }}
      >
        Asunto
      </Text>
      <Text
        style={{
          fontSize: "15px",
          color: C.leaf900,
          margin: "0 0 16px",
          fontWeight: 500,
        }}
      >
        {subject}
      </Text>

      <Text
        style={{
          fontSize: "11px",
          color: C.earth700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "0 0 4px",
        }}
      >
        Mensaje
      </Text>
      <Section
        style={{
          backgroundColor: C.white,
          border: `1px solid ${C.earth100}`,
          borderRadius: "8px",
          padding: "16px",
          margin: "0",
        }}
      >
        <Text
          style={{
            fontSize: "14px",
            color: C.leaf900,
            margin: 0,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </Text>
      </Section>

      <Text
        style={{
          fontSize: "12px",
          color: C.earth500,
          margin: "20px 0 0",
          fontStyle: "italic",
        }}
      >
        Para responder, simplemente da &ldquo;Responder&rdquo; en este correo —
        irá directo a {fromEmail}.
      </Text>
    </EmailLayout>
  );
}
