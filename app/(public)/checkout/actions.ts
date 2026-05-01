"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/auth/customer-auth";
import {
  ContactSchema,
  AddressSchema,
  type ContactInput,
  type AddressInput,
} from "@/lib/checkout/schemas";

/**
 * Resultado uniforme para server actions consumidas desde formularios.
 * Permite renderizar errores de validación campo a campo y un mensaje
 * general cuando algo falla en BD.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: Record<string, string[]>; message?: string };

/**
 * Guarda los datos de contacto en customers. El cliente debe estar autenticado.
 * El email no se actualiza desde aquí: viene de Supabase auth y es la fuente
 * de verdad. Si el cliente quiere cambiar email, debe re-autenticarse.
 */
export async function saveContactInfo(
  input: ContactInput,
): Promise<ActionResult<{ updated: true }>> {
  const parsed = ContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Revisa los campos marcados",
    };
  }

  const customer = await requireCustomer({ redirectTo: "/checkout" });
  const supabase = await createClient();

  const { error } = await supabase
    .from("customers")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      document_type: parsed.data.document_type,
      document_number: parsed.data.document_number,
      accepts_marketing: parsed.data.accepts_marketing,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customer.id);

  if (error) {
    console.error("[saveContactInfo]", error.message);
    return { ok: false, message: "No pudimos guardar tus datos. Intenta de nuevo." };
  }

  revalidatePath("/checkout");
  revalidatePath("/mi-cuenta");
  return { ok: true, data: { updated: true } };
}

/**
 * Crea una nueva dirección o actualiza una existente. Si es la primera
 * dirección del cliente, se marca is_default=true automáticamente.
 *
 * @param input  Datos de la dirección
 * @param existingId  Si viene, actualiza esa fila en lugar de insertar nueva
 */
export async function saveAddress(
  input: AddressInput,
  existingId: string | null,
): Promise<ActionResult<{ id: string }>> {
  const parsed = AddressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Revisa los campos marcados",
    };
  }

  const customer = await requireCustomer({ redirectTo: "/checkout" });
  const supabase = await createClient();

  // Si is_default=true en el input, antes desmarcar las demás del cliente
  if (parsed.data.is_default) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("customer_id", customer.id);
  } else {
    // Si el cliente no tiene direcciones aún, esta queda como default
    const { count } = await supabase
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer.id);
    if (count === 0) parsed.data.is_default = true;
  }

  const payload = {
    customer_id: customer.id,
    label: parsed.data.label || null,
    recipient_name: parsed.data.recipient_name,
    phone: parsed.data.phone,
    department: parsed.data.department,
    city: parsed.data.city,
    street: parsed.data.street,
    details: parsed.data.details || null,
    postal_code: parsed.data.postal_code || null,
    country: "CO",
    is_default: parsed.data.is_default,
    updated_at: new Date().toISOString(),
  };

  if (existingId) {
    const { data, error } = await supabase
      .from("addresses")
      .update(payload)
      .eq("id", existingId)
      .eq("customer_id", customer.id) // defensa adicional sobre RLS
      .select("id")
      .single();
    if (error || !data) {
      console.error("[saveAddress update]", error?.message);
      return { ok: false, message: "No pudimos actualizar la dirección" };
    }
    revalidatePath("/checkout");
    return { ok: true, data: { id: data.id } };
  }

  const { data, error } = await supabase
    .from("addresses")
    .insert(payload)
    .select("id")
    .single();
  if (error || !data) {
    console.error("[saveAddress insert]", error?.message);
    return { ok: false, message: "No pudimos guardar la dirección" };
  }
  revalidatePath("/checkout");
  return { ok: true, data: { id: data.id } };
}
