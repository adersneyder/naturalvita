import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string }>;

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function describeDiscount(
  type: "percentage" | "fixed",
  value: number,
  maxDiscount: number | null,
): string {
  if (type === "percentage") {
    const cap = maxDiscount ? ` (máx ${formatCOP(maxDiscount)})` : "";
    return `${value}%${cap}`;
  }
  return formatCOP(value);
}

function statusLabel(c: {
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  used_count: number;
  max_total_uses: number | null;
}): { label: string; style: string } {
  if (!c.is_active) {
    return {
      label: "Inactivo",
      style: "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]",
    };
  }
  const now = new Date();
  if (c.expires_at && new Date(c.expires_at) < now) {
    return {
      label: "Expirado",
      style: "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]",
    };
  }
  if (c.starts_at && new Date(c.starts_at) > now) {
    return {
      label: "Programado",
      style: "bg-[#E8F0FE] text-[#1A56DB]",
    };
  }
  if (c.max_total_uses !== null && c.used_count >= c.max_total_uses) {
    return {
      label: "Agotado",
      style: "bg-[#FAEEDA] text-[#854F0B]",
    };
  }
  return {
    label: "Activo",
    style: "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]",
  };
}

export default async function CouponsIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["owner", "admin"]);
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "all";

  const admin = createAdminClient();
  let query = admin
    .from("coupons")
    .select(
      "id, code, description, discount_type, discount_value, max_discount_cop, min_order_cop, max_total_uses, used_count, is_active, starts_at, expires_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (q) {
    // El input puede ser código o pedazo de descripción.
    query = query.or(`code.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (status === "active") query = query.eq("is_active", true);
  else if (status === "inactive") query = query.eq("is_active", false);

  const { data: coupons } = await query.limit(100);

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Cupones
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            {coupons?.length ?? 0} cupones
            {status === "active" ? " activos" : status === "inactive" ? " inactivos" : ""}
          </p>
        </div>
        <Link
          href="/admin/cupones/nuevo"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)]"
        >
          Nuevo cupón
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          { key: "all", label: "Todos" },
          { key: "active", label: "Activos" },
          { key: "inactive", label: "Inactivos" },
        ].map((s) => (
          <Link
            key={s.key}
            href={`/admin/cupones${s.key !== "all" ? `?status=${s.key}` : ""}${q ? `${s.key !== "all" ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              status === s.key
                ? "bg-[var(--color-leaf-100)] border-[var(--color-leaf-700)]/30 text-[var(--color-leaf-900)]"
                : "bg-white border-[rgba(47,98,56,0.12)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
            }`}
          >
            {s.label}
          </Link>
        ))}
        <form action="/admin/cupones" method="get" className="ml-auto">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar código o descripción…"
            className="px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs w-60 focus:outline-none focus:border-[var(--color-iris-700)]"
          />
        </form>
      </div>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        {!coupons || coupons.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--color-earth-700)]">
            No hay cupones con esos filtros.{" "}
            <Link
              href="/admin/cupones/nuevo"
              className="text-[var(--color-iris-700)] hover:underline"
            >
              Crea el primero
            </Link>
            .
          </div>
        ) : (
          <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
            {coupons.map((c) => {
              const s = statusLabel(c);
              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/cupones/${c.id}`}
                    className="block px-4 py-3 hover:bg-[var(--color-earth-50)]/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] m-0">
                          <span className="font-mono font-medium text-[var(--color-leaf-900)]">
                            {c.code}
                          </span>
                          <span className="text-[var(--color-earth-500)]">
                            {" · "}
                            {c.description}
                          </span>
                        </p>
                        <p className="text-[11px] text-[var(--color-earth-500)] m-0 mt-0.5">
                          {describeDiscount(
                            c.discount_type as "percentage" | "fixed",
                            c.discount_value,
                            c.max_discount_cop,
                          )}
                          {c.min_order_cop > 0
                            ? ` · mín. ${formatCOP(c.min_order_cop)}`
                            : ""}
                          {" · "}
                          {c.used_count}
                          {c.max_total_uses ? `/${c.max_total_uses}` : ""} usos
                          {c.expires_at
                            ? ` · expira ${new Date(c.expires_at).toLocaleDateString("es-CO")}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium ${s.style}`}
                      >
                        {s.label}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
