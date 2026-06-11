import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import CouponForm from "../_CouponForm";

export const dynamic = "force-dynamic";

export default async function NuevoCouponPage() {
  await requireRole(["owner", "admin"]);
  return (
    <>
      <header className="mb-4">
        <Link
          href="/admin/cupones"
          className="text-xs text-[var(--color-iris-700)] hover:underline"
        >
          ← Cupones
        </Link>
        <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0 mt-2">
          Nuevo cupón
        </h1>
      </header>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 max-w-3xl">
        <CouponForm
          initial={{
            code: "",
            description: "",
            discount_type: "percentage",
            discount_value: 10,
            min_order_cop: 0,
            max_discount_cop: null,
            max_total_uses: null,
            max_uses_per_customer: 1,
            starts_at: null,
            expires_at: null,
            is_active: true,
          }}
        />
      </div>
    </>
  );
}
