import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  parsed: {
    label: "Parseado",
    style: "bg-[#E8F0FE] text-[#1A56DB]",
  },
  matched: {
    label: "En revisión",
    style: "bg-[#FAEEDA] text-[#854F0B]",
  },
  applied: {
    label: "Aplicado",
    style: "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]",
  },
  cancelled: {
    label: "Cancelado",
    style: "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]",
  },
};

/**
 * Historial de corridas de sincronización de precios. Una corrida es una
 * sesión donde un admin subió una lista de precios de un proveedor y la
 * aplicó (total o parcialmente) al catálogo.
 */
export default async function PriceSyncIndexPage() {
  await requireRole(["owner", "admin", "editor"]);
  const admin = createAdminClient();

  // Top 30 corridas con join al lab para mostrar el nombre.
  const { data: runs } = await admin
    .from("price_sync_runs")
    .select(
      "id, source_filename, source_format, status, lines_parsed, lines_matched, lines_applied, created_at, applied_at, laboratory:laboratories!laboratory_id(name, slug)",
    )
    .order("created_at", { ascending: false })
    .limit(30);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("es-CO", { hour12: false });

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Sincronizar precios
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            Sube la lista de precios de un proveedor y actualiza el costo de
            tus productos con confirmación previa.
          </p>
        </div>
        <Link
          href="/admin/precios/sincronizar/nuevo"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)]"
        >
          Nueva sincronización
        </Link>
      </header>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        {!runs || runs.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--color-earth-700)]">
            Aún no hay corridas. Empieza con{" "}
            <Link
              href="/admin/precios/sincronizar/nuevo"
              className="text-[var(--color-iris-700)] hover:underline"
            >
              una nueva
            </Link>
            .
          </div>
        ) : (
          <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
            {runs.map((r) => {
              const labName =
                (r.laboratory as unknown as { name: string } | null)?.name ??
                "—";
              const status = STATUS_LABELS[r.status] ?? STATUS_LABELS.parsed;
              return (
                <li key={r.id}>
                  <Link
                    href={`/admin/precios/sincronizar/${r.id}`}
                    className="block px-4 py-3 hover:bg-[var(--color-earth-50)]/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-[var(--color-leaf-900)] font-medium truncate m-0">
                          {labName}
                          <span className="text-[var(--color-earth-500)] font-normal">
                            {" · "}
                            {r.source_filename ?? "archivo"}
                          </span>
                        </p>
                        <p className="text-[11px] text-[var(--color-earth-500)] m-0 mt-0.5">
                          {r.lines_parsed} líneas · {r.lines_matched} matched ·{" "}
                          {r.lines_applied} aplicadas · {fmt(r.created_at)}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium ${status.style}`}
                      >
                        {status.label}
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
