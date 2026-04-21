import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";
import TaxRatesList, { type TaxRateRow } from "./_components/TaxRatesList";

export default async function ImpuestosPage() {
  await requireRole(["owner", "admin"]);
  const supabase = await createClient();

  const { data: ratesRaw } = await supabase
    .from("tax_rates")
    .select("id, code, name, rate_percent, tax_type, description, is_default, is_active")
    .order("sort_order");

  const { data: productCounts } = await supabase
    .from("products")
    .select("tax_rate_id")
    .neq("status", "archived");

  const countByRate = new Map<string, number>();
  (productCounts ?? []).forEach((row: { tax_rate_id: string | null }) => {
    if (!row.tax_rate_id) return;
    countByRate.set(row.tax_rate_id, (countByRate.get(row.tax_rate_id) ?? 0) + 1);
  });

  const taxRates: TaxRateRow[] = (ratesRaw ?? []).map((r: {
    id: string;
    code: string;
    name: string;
    rate_percent: number;
    tax_type: string;
    description: string | null;
    is_default: boolean;
    is_active: boolean;
  }) => ({
    ...r,
    products_count: countByRate.get(r.id) ?? 0,
  }));

  return <TaxRatesList taxRates={taxRates} />;
}
