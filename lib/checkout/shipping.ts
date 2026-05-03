import { createClient } from "@/lib/supabase/server";

export type ShippingQuote = {
  cost_cop: number;
  free_above_cop: number | null;
  is_free: boolean;
  department: string;
  notes: string | null;
};

export type ShippingRate = {
  department: string;
  flat_cop: number;
  free_above_cop: number | null;
};

/**
 * Cotiza envío para un departamento + subtotal.
 * Tarifa plana por departamento + umbral global de envío gratis (Fase 1).
 * Cuando crezca el negocio se reemplaza por cotización por peso/dimensión
 * sin tocar el resto del checkout.
 */
export async function calculateShipping(
  department: string,
  subtotal_cop: number,
): Promise<ShippingQuote> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipping_rates")
    .select("department, flat_cop, free_above_cop, notes")
    .eq("department", department)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    // Depto no encontrado: usamos tarifa más alta como protección.
    const { data: fallback } = await supabase
      .from("shipping_rates")
      .select("department, flat_cop, free_above_cop, notes")
      .eq("is_active", true)
      .order("flat_cop", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!fallback) {
      return {
        cost_cop: 99999900,
        free_above_cop: null,
        is_free: false,
        department,
        notes: "Configuración de envíos pendiente",
      };
    }
    return {
      cost_cop: fallback.flat_cop,
      free_above_cop: fallback.free_above_cop,
      is_free: false,
      department,
      notes: fallback.notes,
    };
  }

  const isFree =
    data.free_above_cop !== null && subtotal_cop >= data.free_above_cop;
  return {
    cost_cop: isFree ? 0 : data.flat_cop,
    free_above_cop: data.free_above_cop,
    is_free: isFree,
    department,
    notes: data.notes,
  };
}

/** Versión client-friendly: rates ya cargados, evita round-trip por cada cambio. */
export function calculateShippingFromRates(
  rates: ShippingRate[],
  department: string,
  subtotal_cop: number,
): ShippingQuote {
  const rate = rates.find((r) => r.department === department);
  if (!rate) {
    const fallback = [...rates].sort((a, b) => b.flat_cop - a.flat_cop)[0];
    return {
      cost_cop: fallback?.flat_cop ?? 99999900,
      free_above_cop: fallback?.free_above_cop ?? null,
      is_free: false,
      department,
      notes: null,
    };
  }
  const isFree =
    rate.free_above_cop !== null && subtotal_cop >= rate.free_above_cop;
  return {
    cost_cop: isFree ? 0 : rate.flat_cop,
    free_above_cop: rate.free_above_cop,
    is_free: isFree,
    department,
    notes: null,
  };
}

export async function listShippingRates(): Promise<ShippingRate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipping_rates")
    .select("department, flat_cop, free_above_cop")
    .eq("is_active", true)
    .order("department", { ascending: true });
  return data ?? [];
}
