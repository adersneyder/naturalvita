"use server";

import { z } from "zod";
import { sendEmail } from "@/lib/email/client";
import { ContactInquiry } from "@/lib/email/templates/contact-inquiry";
import { ContactConfirmation } from "@/lib/email/templates/contact-confirmation";
import { COMPANY } from "@/lib/legal/company-info";
import { publicApiRatelimit, getClientIpFromHeaders } from "@/lib/ratelimit";

const ContactSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(100),
  email: z.string().trim().email("Correo inválido").max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
  subject: z.string().trim().min(3, "Asunto muy corto").max(150),
  message: z.string().trim().min(10, "Mensaje muy corto").max(2000),
  // Honeypot field: debe estar vacío. Si tiene contenido = bot.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type ContactFormState =
  | { kind: "idle" }
  | { kind: "ok" }
  | { kind: "error"; message: string; fieldErrors?: Record<string, string[]> };

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  // 1. Validar schema
  const raw = {
    name: formData.get("name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    subject: formData.get("subject")?.toString() ?? "",
    message: formData.get("message")?.toString() ?? "",
    website: formData.get("website")?.toString() ?? "",
  };

  const parsed = ContactSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      kind: "error",
      message: "Revisa los datos del formulario",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 2. Honeypot: si "website" trae contenido, es bot. Fingimos éxito.
  if (raw.website && raw.website.length > 0) {
    return { kind: "ok" };
  }

  // 3. Rate limit por IP. Si Upstash no está configurado, fallamos abierto
  // (mejor permitir el envío que romper el form completo).
  try {
    const ip = await getClientIpFromHeaders();
    const { success } = await publicApiRatelimit.limit(`contact:${ip}`);
    if (!success) {
      return {
        kind: "error",
        message:
          "Demasiados envíos en muy poco tiempo. Espera un par de minutos antes de intentar de nuevo.",
      };
    }
  } catch (err) {
    // Upstash no configurado o error temporal: log y continúa.
    console.warn("[contact] rate limit no disponible:", err);
  }

  const data = parsed.data;
  const phone = data.phone?.trim() || null;
  const receivedAt = new Date().toISOString();

  // 4. Enviar email interno a pedidos@ con reply-to al cliente
  const internalEmail = COMPANY.publicEmail;
  const inquiryRes = await sendEmail({
    to: internalEmail,
    subject: `Contacto: ${data.subject}`,
    react: ContactInquiry({
      fromName: data.name,
      fromEmail: data.email,
      fromPhone: phone,
      subject: data.subject,
      message: data.message,
      receivedAt,
    }),
    replyTo: data.email,
    tags: [{ name: "type", value: "contact_inquiry" }],
  });

  if (!inquiryRes.ok) {
    console.error("[contact] no se envió inquiry interno:", inquiryRes.error);
    return {
      kind: "error",
      message:
        "No pudimos enviar tu mensaje en este momento. Por favor intenta de nuevo en unos minutos o escríbenos directo a " +
        COMPANY.publicEmail,
    };
  }

  // 5. Enviar email de confirmación al cliente. Si falla este, NO
  // revertimos: el equipo ya tiene el inquiry, el cliente perdió la
  // notificación pero su mensaje sí llegó.
  const confirmRes = await sendEmail({
    to: data.email,
    subject: "Recibimos tu mensaje — NaturalVita",
    react: ContactConfirmation({
      customerName: data.name,
      subject: data.subject,
    }),
    tags: [{ name: "type", value: "contact_confirmation" }],
  });

  if (!confirmRes.ok) {
    console.warn(
      `[contact] confirmación no enviada a ${data.email}:`,
      confirmRes.error,
    );
  }

  return { kind: "ok" };
}
