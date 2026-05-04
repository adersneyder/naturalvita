"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/auth/customer-auth";
import {
  ContactSchema,
  AddressSchema,
  type ContactInput,
  type AddressInput,
} from "@/lib/checkout/schemas";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Actualizar datos personales en `customers`. */
export async function updateCustomerProfile(
  input: ContactInput,
): Promise<ActionResult> {
  const customer = await requireCustomer({ redirectTo: "/mi-cuenta" });

  const parsed = ContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del formulario",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const { full_name, phone, document_type, document_number, accepts_marketing } =
    parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      full_name,
      phone,
      document_type,
      document_number,
      accepts_marketing,
    })
    .eq("id", customer.id);

  if (error) {
    console.error("[updateCustomerProfile]", error);
    return { ok: false, error: "No pudimos guardar tus datos" };
  }

  revalidatePath("/mi-cuenta");
  return { ok: true, message: "Datos actualizados" };
}

/** Crear o actualizar una dirección. Si trae id existente, actualiza; si no, crea. */
const SaveAddressSchema = AddressSchema.extend({
  id: z.string().uuid().optional().nullable(),
});

export async function saveAddress(
  input: z.infer<typeof SaveAddressSchema>,
): Promise<ActionResult & { addressId?: string }> {
  const customer = await requireCustomer({ redirectTo: "/mi-cuenta" });

  const parsed = SaveAddressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del formulario",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const { id, ...addressData } = parsed.data;

  const supabase = await createClient();

  // Si esta dirección será default, des-marcamos la default actual primero
  if (addressData.is_default) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("customer_id", customer.id);
  }

  if (id) {
    const { error } = await supabase
      .from("addresses")
      .update({
        recipient_name: addressData.recipient_name,
        phone: addressData.phone,
        department: addressData.department,
        city: addressData.city,
        street: addressData.street,
        details: addressData.details || null,
        postal_code: addressData.postal_code || null,
        label: addressData.label || null,
        is_default: addressData.is_default,
      })
      .eq("id", id)
      .eq("customer_id", customer.id);

    if (error) {
      console.error("[saveAddress update]", error);
      return { ok: false, error: "No pudimos actualizar la dirección" };
    }
    revalidatePath("/mi-cuenta");
    return { ok: true, addressId: id };
  }

  // Si es la primera dirección del cliente, hacer default automático
  const { count } = await supabase
    .from("addresses")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id);
  const isFirst = (count ?? 0) === 0;

  const { data, error } = await supabase
    .from("addresses")
    .insert({
      customer_id: customer.id,
      recipient_name: addressData.recipient_name,
      phone: addressData.phone,
      department: addressData.department,
      city: addressData.city,
      street: addressData.street,
      details: addressData.details || null,
      postal_code: addressData.postal_code || null,
      label: addressData.label || null,
      is_default: addressData.is_default || isFirst,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[saveAddress insert]", error);
    return { ok: false, error: "No pudimos crear la dirección" };
  }

  revalidatePath("/mi-cuenta");
  return { ok: true, addressId: data.id };
}

export async function deleteAddress(addressId: string): Promise<ActionResult> {
  const customer = await requireCustomer({ redirectTo: "/mi-cuenta" });

  if (!z.string().uuid().safeParse(addressId).success) {
    return { ok: false, error: "ID de dirección inválido" };
  }

  const supabase = await createClient();

  // Verificar que la dirección a eliminar no esté siendo usada en pedidos pendientes
  // (las pasadas conservan snapshot, así que es seguro eliminar de addresses).
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", customer.id);

  if (error) {
    console.error("[deleteAddress]", error);
    return { ok: false, error: "No pudimos eliminar la dirección" };
  }

  revalidatePath("/mi-cuenta");
  return { ok: true };
}

export async function setDefaultAddress(addressId: string): Promise<ActionResult> {
  const customer = await requireCustomer({ redirectTo: "/mi-cuenta" });

  if (!z.string().uuid().safeParse(addressId).success) {
    return { ok: false, error: "ID de dirección inválido" };
  }

  const supabase = await createClient();
  await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("customer_id", customer.id);
  const { error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("customer_id", customer.id);

  if (error) {
    console.error("[setDefaultAddress]", error);
    return { ok: false, error: "No pudimos cambiar la predeterminada" };
  }

  revalidatePath("/mi-cuenta");
  return { ok: true };
}
