import { z } from "zod";

/**
 * Schemas Zod compartidos entre cliente (validación en el form) y servidor
 * (validación en server actions). Centralizar evita drift entre la UI y la
 * persistencia.
 *
 * Reglas de Colombia:
 *   - Teléfono: 10 dígitos comenzando con 3 (móvil) o fijo de 7 dígitos.
 *     Aceptamos formato laxo (con espacios, +57, guiones) y normalizamos.
 *   - Cédula: 6-10 dígitos. NIT: 9-10 dígitos. CE: 6-12.
 *   - Código postal: 6 dígitos según DANE. Opcional (muchos clientes no lo
 *     conocen).
 */

const NAME_MIN = 2;
const NAME_MAX = 100;

/** Normaliza teléfono colombiano a solo dígitos, removiendo +57 si está */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  // Si empieza con 57 y tiene 12 dígitos en total, quitamos el indicativo
  if (digits.length === 12 && digits.startsWith("57")) return digits.slice(2);
  return digits;
}

const phoneSchema = z
  .string()
  .min(7, "El teléfono debe tener al menos 7 dígitos")
  .transform(normalizePhone)
  .refine(
    (v) => v.length === 7 || v.length === 10,
    "Ingresa un teléfono válido (móvil de 10 dígitos o fijo de 7)",
  );

const documentSchema = z
  .string()
  .min(6, "El documento debe tener al menos 6 dígitos")
  .max(15, "Documento demasiado largo")
  .regex(/^[0-9]+$/, "El documento solo puede contener números");

export const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "NIT", label: "NIT" },
  { value: "PA", label: "Pasaporte" },
  { value: "TI", label: "Tarjeta de identidad" },
] as const;

export const ContactSchema = z.object({
  full_name: z
    .string()
    .min(NAME_MIN, "Ingresa tu nombre completo")
    .max(NAME_MAX, "Nombre demasiado largo")
    .trim(),
  phone: phoneSchema,
  document_type: z.enum(["CC", "CE", "NIT", "PA", "TI"]),
  document_number: documentSchema,
  accepts_marketing: z.boolean().default(false),
});

export type ContactInput = z.infer<typeof ContactSchema>;

export const AddressSchema = z.object({
  recipient_name: z
    .string()
    .min(NAME_MIN, "Ingresa el nombre de quien recibe")
    .max(NAME_MAX, "Nombre demasiado largo")
    .trim(),
  phone: phoneSchema,
  department: z
    .string()
    .min(2, "Selecciona un departamento")
    .max(50, "Departamento inválido"),
  city: z
    .string()
    .min(2, "Ingresa o selecciona la ciudad")
    .max(80, "Ciudad inválida")
    .trim(),
  street: z
    .string()
    .min(5, "Dirección demasiado corta")
    .max(200, "Dirección demasiado larga")
    .trim(),
  details: z
    .string()
    .max(200, "Detalles demasiado largos")
    .trim()
    .optional()
    .or(z.literal("")),
  postal_code: z
    .string()
    .regex(/^[0-9]{6}$/, "Debe tener 6 dígitos")
    .optional()
    .or(z.literal("")),
  /** Etiqueta opcional para identificar la dirección ("Casa", "Oficina") */
  label: z
    .string()
    .max(40, "Etiqueta demasiado larga")
    .trim()
    .optional()
    .or(z.literal("")),
  is_default: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof AddressSchema>;

/**
 * Schema combinado que el server action recibe al "Confirmar pedido".
 * Incluye contacto + dirección + referencia opcional a una dirección
 * guardada (si el cliente eligió una existente en lugar de crear nueva).
 */
export const CheckoutSubmitSchema = z.object({
  contact: ContactSchema,
  address: AddressSchema,
  /** Si el cliente eligió una dirección guardada, viene su id y NO se crea nueva */
  use_existing_address_id: z.string().uuid().nullable(),
});

export type CheckoutSubmitInput = z.infer<typeof CheckoutSubmitSchema>;
