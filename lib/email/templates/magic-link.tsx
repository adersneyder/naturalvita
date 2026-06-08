import { Section, Text } from "@react-email/components";
import { EmailLayout, EMAIL_COLORS as C } from "./_layout";

export type MagicLinkEmailProps = {
  /** URL absoluta firmada por Supabase. Lleva token_hash + type. */
  actionLink: string;
  /** Para qué entorno se está autenticando (sólo informativo). */
  isAdmin?: boolean;
};

/**
 * Email de inicio de sesión sin contraseña.
 *
 * Tono transaccional (no marketing): tipografía simple, sin promociones,
 * un solo CTA. El asunto y From transaccional ('notificaciones@') ya los
 * resuelve lib/email/client.ts.
 *
 * NO usa PKCE. El link lo genera admin.generateLink en el backend con
 * token_hash, así que abrir el correo en otro navegador o dispositivo
 * funciona igual. Vigencia 1h (default de Supabase).
 */
export function MagicLinkEmail({ actionLink, isAdmin }: MagicLinkEmailProps) {
  return (
    <EmailLayout preview="Tu enlace de acceso a NaturalVita">
      <Text
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "20px",
          color: C.leaf900,
          margin: "0 0 12px",
          lineHeight: 1.3,
        }}
      >
        {isAdmin ? "Acceso al panel administrativo" : "Tu enlace de acceso"}
      </Text>

      <Text
        style={{
          fontSize: "14px",
          color: C.earth700,
          lineHeight: 1.6,
          margin: "0 0 20px",
        }}
      >
        Toca el botón para iniciar sesión. El enlace caduca en una hora y se
        puede usar una sola vez.
      </Text>

      <Section style={{ textAlign: "center" as const, margin: "0 0 24px" }}>
        <a
          href={actionLink}
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
          Iniciar sesión
        </a>
      </Section>

      <Text
        style={{
          fontSize: "12px",
          color: C.earth500,
          margin: "0 0 8px",
          lineHeight: 1.5,
        }}
      >
        Si el botón no funciona, copia y pega este enlace en tu navegador:
      </Text>
      <Text
        style={{
          fontSize: "11px",
          color: C.earth700,
          margin: "0 0 16px",
          wordBreak: "break-all" as const,
          fontFamily: "Menlo, Monaco, Consolas, monospace",
        }}
      >
        {actionLink}
      </Text>

      <Text
        style={{
          fontSize: "12px",
          color: C.earth500,
          margin: "16px 0 0",
          lineHeight: 1.5,
          fontStyle: "italic",
        }}
      >
        Si no solicitaste este enlace, ignora este correo. Tu cuenta sigue
        segura.
      </Text>
    </EmailLayout>
  );
}
