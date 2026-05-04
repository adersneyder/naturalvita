import { Text } from "@react-email/components";
import { EmailLayout, EMAIL_COLORS as C } from "./_layout";

export type ContactConfirmationProps = {
  customerName: string;
  subject: string;
};

/**
 * Email automático que se envía al cliente cuando llena el formulario
 * de /contacto, confirmando que recibimos su mensaje. Sin promesas
 * concretas de tiempo de respuesta más allá de "menos de un día hábil"
 * para que sea cumplible.
 */
export function ContactConfirmation({
  customerName,
  subject,
}: ContactConfirmationProps) {
  const firstName = customerName.split(" ")[0] || "Hola";

  return (
    <EmailLayout preview="Recibimos tu mensaje, te contestamos pronto">
      <Text
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "22px",
          color: C.leaf900,
          margin: "0 0 8px",
          lineHeight: 1.3,
        }}
      >
        Recibimos tu mensaje, {firstName}
      </Text>
      <Text
        style={{
          fontSize: "14px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 16px",
        }}
      >
        Gracias por escribirnos. Recibimos tu mensaje sobre{" "}
        <strong style={{ color: C.leaf900 }}>{subject}</strong> y un humano de
        nuestro equipo te responderá en menos de un día hábil al mismo correo
        desde el que escribiste.
      </Text>
      <Text
        style={{
          fontSize: "14px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        Mientras tanto, puedes seguir explorando nuestra tienda. Si tu mensaje
        es urgente y se relaciona con un pedido en curso, asegúrate de
        incluirnos el número del pedido para poder ayudarte más rápido.
      </Text>
      <Text
        style={{
          fontSize: "12px",
          color: C.earth500,
          margin: 0,
          fontStyle: "italic",
        }}
      >
        Este correo es automático para confirmarte que tu mensaje llegó. La
        respuesta personalizada llegará desde una persona del equipo.
      </Text>
    </EmailLayout>
  );
}
