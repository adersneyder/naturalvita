"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/audit-log";
import { createAdminClient } from "@/lib/supabase/admin";

export type CouponActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

/**
 * Form schema compartido entre crear y editar. Validamos lo mínimo
 * server-side; el resto (UX) lo hace el form en cliente.
 *
 * code se normaliza a uppercase antes de persistir — los clientes lo
 * tipean a veces en minúsculas pero queremos consistencia.
 */
const CouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "El código debe tener al menos 3 caracteres")
      .max(50, "El código es muy largo")
      .regex(
        /^[A-Z0-9_-]+$/i,
        "Solo letras, números, guiones bajos y guiones",
      ),
    description: z
      .string()
      .trim()
      .min(3, "La descripción es obligatoria")
      .max(200, "La descripción es muy larga"),
    discount_type: z.enum(["percentage", "fixed"]),
    discount_value: z.coerce
      .number()
      .int("El descuento debe ser un número entero")
      .positive("El descuento debe ser mayor a cero"),
    min_order_cop: z.coerce.number().int().min(0).default(0),
    max_discount_cop: z.coerce.number().int().positive().nullable().optional(),
    max_total_uses: z.coerce.number().int().positive().nullable().optional(),
    max_uses_per_customer: z.coerce.number().int().min(1).default(1),
    starts_at: z.string().optional().nullable(),
    expires_at: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
  })
  .refine(
    (v) =>
      v.discount_type !== "percentage" ||
      (v.discount_value >= 1 && v.discount_value <= 100),
    { message: "Si es porcentaje, debe estar entre 1 y 100", path: ["discount_value"] },
  )
  .refine(
    (v) => {
      if (!v.starts_at || !v.expires_at) return true;
      return new Date(v.starts_at) < new Date(v.expires_at);
    },
    { message: "La fecha de expiración debe ser posterior al inicio", path: ["expires_at"] },
  );

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData);
  return CouponSchema.safeParse({
    ...raw,
    // FormData entrega strings — coerce a number ya lo hace Zod, pero
    // los nullables vacíos llegan como string "" y necesitan null.
    max_discount_cop: raw.max_discount_cop || null,
    max_total_uses: raw.max_total_uses || null,
    starts_at: raw.starts_at || null,
    expires_at: raw.expires_at || null,
    is_active: raw.is_active === "on" || raw.is_active === "true",
  });
}

export async function createCoupon(
  formData: FormData,
): Promise<CouponActionResult> {
  await requireRole(["owner", "admin"]);
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;
  const code = data.code.toUpperCase();

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("coupons")
    .insert({
      code,
      description: data.description,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      min_order_cop: data.min_order_cop,
      max_discount_cop: data.max_discount_cop ?? null,
      max_total_uses: data.max_total_uses ?? null,
      max_uses_per_customer: data.max_uses_per_customer,
      starts_at: data.starts_at,
      expires_at: data.expires_at,
      is_active: data.is_active,
    })
    .select("id, code")
    .single();

  if (error) {
    // Código duplicado: el constraint UNIQUE de Postgres habla aquí.
    if (error.message.toLowerCase().includes("duplicate")) {
      return { ok: false, error: `Ya existe un cupón con el código "${code}".` };
    }
    console.error("[createCoupon]", error.message);
    return { ok: false, error: "No pudimos crear el cupón" };
  }

  await logAdminAction({
    action: "coupon.create",
    entityType: "coupon",
    entityId: created.id,
    summary: `Creó cupón ${created.code}`,
    metadata: {
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      is_active: data.is_active,
    },
  });

  revalidatePath("/admin/cupones");
  redirect(`/admin/cupones/${created.id}`);
}

export async function updateCoupon(
  couponId: string,
  formData: FormData,
): Promise<CouponActionResult> {
  await requireRole(["owner", "admin"]);
  if (!z.string().uuid().safeParse(couponId).success) {
    return { ok: false, error: "ID inválido" };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;
  const code = data.code.toUpperCase();

  const admin = createAdminClient();
  const { error } = await admin
    .from("coupons")
    .update({
      code,
      description: data.description,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      min_order_cop: data.min_order_cop,
      max_discount_cop: data.max_discount_cop ?? null,
      max_total_uses: data.max_total_uses ?? null,
      max_uses_per_customer: data.max_uses_per_customer,
      starts_at: data.starts_at,
      expires_at: data.expires_at,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", couponId);

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { ok: false, error: `Ya existe un cupón con el código "${code}".` };
    }
    console.error("[updateCoupon]", error.message);
    return { ok: false, error: "No pudimos actualizar el cupón" };
  }

  await logAdminAction({
    action: "coupon.create",
    entityType: "coupon",
    entityId: couponId,
    summary: `Editó cupón ${code}`,
    metadata: { is_active: data.is_active },
  });

  revalidatePath("/admin/cupones");
  revalidatePath(`/admin/cupones/${couponId}`);
  return { ok: true, id: couponId };
}

/**
 * Toggle activo/inactivo. No reemplaza la desactivación "permanente" —
 * un cupón inactivo puede reactivarse; deshabilitar permanentemente es
 * marcar expires_at en el pasado.
 */
export async function toggleCoupon(
  couponId: string,
  active: boolean,
): Promise<CouponActionResult> {
  await requireRole(["owner", "admin"]);
  if (!z.string().uuid().safeParse(couponId).success) {
    return { ok: false, error: "ID inválido" };
  }

  const admin = createAdminClient();
  const { data: coupon } = await admin
    .from("coupons")
    .select("code")
    .eq("id", couponId)
    .maybeSingle();

  const { error } = await admin
    .from("coupons")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", couponId);

  if (error) {
    return { ok: false, error: "No pudimos cambiar el estado del cupón" };
  }

  await logAdminAction({
    action: "coupon.deactivate",
    entityType: "coupon",
    entityId: couponId,
    summary: `${active ? "Activó" : "Desactivó"} cupón ${coupon?.code ?? couponId}`,
    metadata: { active },
  });

  revalidatePath("/admin/cupones");
  revalidatePath(`/admin/cupones/${couponId}`);
  return { ok: true };
}
