import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import CouponForm from "../_CouponForm";
import ToggleButton from "./_ToggleButton";

export const dynamic = "force-dynamic";

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["owner", "admin"]);
  const { id } = await params;

  const admin = createAdminClient();
  const { data: coupon } = await admin
    .from("coupons")
    .select(
      "id, code, description, discount_type, discount_value, max_discount_cop, min_order_cop, max_total_uses, max_uses_per_customer, used_count, is_active, starts_at, expires_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!coupon) notFound();

  // Últimas 10 redenciones para auditoría.
  const { data: redemptions } = await admin
    .from("coupon_redemptions")
    .select("id, order_id, customer_email, discount_applied_cop, redeemed_at")
    .eq("coupon_id", id)
    .order("redeemed_at", { ascending: false })
    .limit(10);

  return (
    <>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/cupones"
            className="text-xs text-[var(--color-iris-700)] hover:underline"
          >
            ← Cupones
          </Link>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0 mt-2">
            <span className="font-mono">{coupon.code}</span>
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
            {coupon.description}
          </p>
        </div>
        <ToggleButton id={coupon.id} active={coupon.is_active} />
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Stat
          label="Usos"
          value={`${coupon.used_count}${coupon.max_total_uses ? `/${coupon.max_total_uses}` : ""}`}
        />
        <Stat
          label="Descuento"
          value={
            coupon.discount_type === "percentage"
              ? `${coupon.discount_value}%`
              : formatCOP(coupon.discount_value)
          }
        />
        <Stat
          label="Compra mínima"
          value={coupon.min_order_cop > 0 ? formatCOP(coupon.min_order_cop) : "—"}
        />
        <Stat
          label="Por cliente"
          value={`${coupon.max_uses_per_customer}`}
        />
      </section>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 mb-4">
        <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0 mb-3">
          Editar
        </p>
        <CouponForm
          initial={{
            id: coupon.id,
            code: coupon.code,
            description: coupon.description,
            discount_type: coupon.discount_type as "percentage" | "fixed",
            discount_value: coupon.discount_value,
            min_order_cop: coupon.min_order_cop,
            max_discount_cop: coupon.max_discount_cop,
            max_total_uses: coupon.max_total_uses,
            max_uses_per_customer: coupon.max_uses_per_customer,
            starts_at: coupon.starts_at,
            expires_at: coupon.expires_at,
            is_active: coupon.is_active,
          }}
        />
      </div>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5">
        <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0 mb-3">
          Canjes recientes
        </p>
        {!redemptions || redemptions.length === 0 ? (
          <p className="text-xs text-[var(--color-earth-500)] m-0">
            Este cupón aún no ha sido canjeado.
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(47,98,56,0.06)] -mx-2">
            {redemptions.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 px-2 py-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[var(--color-leaf-900)] m-0 truncate">
                    {r.customer_email}
                  </p>
                  <p className="text-[10px] text-[var(--color-earth-500)] m-0 font-mono">
                    {r.order_id.slice(0, 8)}…
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="m-0 font-medium tabular-nums">
                    -{formatCOP(r.discount_applied_cop)}
                  </p>
                  <p className="text-[10px] text-[var(--color-earth-500)] m-0">
                    {new Date(r.redeemed_at).toLocaleString("es-CO", {
                      hour12: false,
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-[rgba(47,98,56,0.1)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-earth-500)] m-0">
        {label}
      </p>
      <p className="text-base font-medium text-[var(--color-leaf-900)] m-0 mt-1 tabular-nums">
        {value}
      </p>
    </div>
  );
}
