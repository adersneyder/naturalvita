import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminPagination from "../../_components/AdminPagination";
import SuppressionRow from "./_SuppressionRow";
import AddSuppressionForm from "./_AddSuppressionForm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; page?: string }>;

/**
 * Lista de emails suprimidos (bounce/complaint/unsubscribe). Ningún correo
 * de marketing les llega — sendEmail() consulta esta tabla antes de cada
 * envío. Desde aquí se puede quitar uno (con criterio) o añadir manualmente.
 */
export default async function SaviaSuppressionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await getAdminUser();
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;

  const admin = createAdminClient();
  let query = admin
    .from("email_suppressions")
    .select("email, reason, sub_reason, source, notes, suppressed_at", {
      count: "exact",
    })
    .order("suppressed_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (q) query = query.ilike("email", `%${q}%`);

  const { data: rows, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildHref(p: number): string {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (p > 1) next.set("page", String(p));
    return `/admin/savia/suppressions${next.toString() ? `?${next}` : ""}`;
  }

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Lista de suppressions
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            {total} emails bloqueados para marketing (bounce, complaint o
            baja). Los transaccionales críticos no se ven afectados.
          </p>
        </div>
        <Link
          href="/admin/savia"
          className="text-xs text-[var(--color-iris-700)] hover:underline"
        >
          ← Dashboard Savia
        </Link>
      </header>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        <div>
          <form
            action="/admin/savia/suppressions"
            method="get"
            className="mb-3"
          >
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar email…"
              className="px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs w-64 focus:outline-none focus:border-[var(--color-iris-700)]"
            />
          </form>

          <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
            {!rows || rows.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-[var(--color-earth-700)]">
                {q
                  ? "Sin resultados para esa búsqueda."
                  : "La lista está vacía — buena señal."}
              </div>
            ) : (
              <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
                {rows.map((r) => (
                  <SuppressionRow
                    key={r.email}
                    email={r.email}
                    reason={r.reason}
                    subReason={r.sub_reason}
                    source={r.source}
                    notes={r.notes}
                    suppressedAt={r.suppressed_at}
                  />
                ))}
              </ul>
            )}
          </div>

          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            buildHref={buildHref}
          />
        </div>

        <AddSuppressionForm />
      </div>
    </>
  );
}
