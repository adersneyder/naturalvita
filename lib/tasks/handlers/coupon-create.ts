import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TaskHandler } from "./index";

/**
 * Handler: crea un cupón con los parámetros propuestos.
 *
 * Shape esperado en proposed_action:
 *   {
 *     code: string,
 *     discount_type: 'percentage' | 'fixed',
 *     discount_value: number,
 *     description: string,
 *     max_discount_cop?: number,    // tope para porcentual
 *     min_order_cop?: number,        // mínimo de compra
 *     max_total_uses?: number,       // tope global
 *     max_uses_per_customer?: number, // default 1
 *     starts_at?: string,
 *     expires_at?: string,
 *   }
 *
 * Idempotente por code: si ya existe un cupón con el mismo code,
 * lo "reactiva" actualizando is_active=true sin tocar el contador
 * de usos (porque un cupón con redeemed_count > 0 NO se debe
 * reescribir — ese es un cupón distinto desde el punto de vista
 * histórico).
 */

const Schema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/i),
  description: z.string().trim().min(3).max(200),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().int().positive(),
  max_discount_cop: z.number().int().positive().optional(),
  min_order_cop: z.number().int().min(0).optional(),
  max_total_uses: z.number().int().positive().optional(),
  max_uses_per_customer: z.number().int().min(1).optional(),
  starts_at: z.string().optional(),
  expires_at: z.string().optional(),
});

export const handleCouponCreate: TaskHandler = async (task) => {
  const parsed = Schema.safeParse(task.proposed_action);
  if (!parsed.success) {
    return {
      ok: false,
      error: `proposed_action inválido: ${parsed.error.issues[0]?.message ?? "schema"}`,
    };
  }
  const input = parsed.data;
  const code = input.code.toUpperCase();

  if (input.discount_type === "percentage") {
    if (input.discount_value < 1 || input.discount_value > 100) {
      return {
        ok: false,
        error: "Porcentaje debe estar entre 1 y 100",
      };
    }
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("coupons")
    .select("id, used_count")
    .eq("code", code)
    .maybeSingle();

  if (existing) {
    // Reactivar — no sobreescribimos parámetros para no romper auditoría
    // del cupón histórico.
    await admin
      .from("coupons")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return {
      ok: true,
      result: {
        coupon_id: existing.id,
        code,
        action: "reactivated",
        used_count: existing.used_count,
      },
    };
  }

  const { data: created, error } = await admin
    .from("coupons")
    .insert({
      code,
      description: input.description,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      max_discount_cop: input.max_discount_cop ?? null,
      min_order_cop: input.min_order_cop ?? 0,
      max_total_uses: input.max_total_uses ?? null,
      max_uses_per_customer: input.max_uses_per_customer ?? 1,
      starts_at: input.starts_at ?? null,
      expires_at: input.expires_at ?? null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, error: error?.message ?? "No pudimos crear el cupón" };
  }

  return {
    ok: true,
    result: { coupon_id: created.id, code, action: "created" },
  };
};
