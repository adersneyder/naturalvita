import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminPagination from "../_components/AdminPagination";
import AuditRow from "./_AuditRow";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  action?: string;
  entity?: string;
  actor?: string;
  q?: string;
  days?: string;
  page?: string;
}>;

// Las acciones que efectivamente registramos hoy. Sirven de chips de filtro.
// Si se añade una acción nueva al helper, aquí también — no es crítico que
// no esté, pero la UI no la sugerirá como filtro rápido.
const KNOWN_ACTIONS = [
  "order.cancel",
  "order.refund",
  "flow.toggle",
  "suppression.add",
  "suppression.remove",
  "guide.publish",
  "guide.unpublish",
  "price.sync",
] as const;

const DEFAULT_DAYS = 30;

/**
 * Panel de auditoría: log INSERT-only de las acciones admin sensibles.
 * Solo accesible para owner/admin (la política RLS también lo refuerza
 * en BD, así que aunque alguien manipule el client jamás verá esto).
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["owner", "admin"]);
  const params = await searchParams;

  const action = params.action?.trim() || "";
  const entity = params.entity?.trim() || "";
  const actor = params.actor?.trim().toLowerCase() || "";
  const q = params.q?.trim() || "";
  const days = Math.max(1, Math.min(365, parseInt(params.days ?? "", 10) || DEFAULT_DAYS));
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 50;
  const from = (page - 1) * pageSize;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const admin = createAdminClient();
  let query = admin
    .from("admin_audit_log")
    .select(
      "id, actor_user_id, actor_email, actor_role, action, entity_type, entity_id, summary, metadata, request_ip, created_at",
      { count: "exact" },
    )
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (action) query = query.eq("action", action);
  if (entity) query = query.eq("entity_type", entity);
  if (actor) query = query.ilike("actor_email", `%${actor}%`);
  if (q) query = query.ilike("summary", `%${q}%`);

  const { data: rows, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildHref(p: number): string {
    const next = new URLSearchParams();
    if (action) next.set("action", action);
    if (entity) next.set("entity", entity);
    if (actor) next.set("actor", actor);
    if (q) next.set("q", q);
    if (days !== DEFAULT_DAYS) next.set("days", String(days));
    if (p > 1) next.set("page", String(p));
    return `/admin/auditoria${next.toString() ? `?${next}` : ""}`;
  }

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Auditoría
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            {total} {total === 1 ? "evento" : "eventos"} en los últimos {days} días
            {action ? ` con acción "${action}"` : ""}
            {actor ? ` de ${actor}` : ""}
          </p>
        </div>
        <Link
          href="/admin"
          className="text-xs text-[var(--color-iris-700)] hover:underline"
        >
          ← Dashboard
        </Link>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Link
          href="/admin/auditoria"
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !action
              ? "bg-[var(--color-leaf-100)] border-[var(--color-leaf-700)]/30 text-[var(--color-leaf-900)]"
              : "bg-white border-[rgba(47,98,56,0.12)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
          }`}
        >
          Todas
        </Link>
        {KNOWN_ACTIONS.map((a) => (
          <Link
            key={a}
            href={`/admin/auditoria?action=${a}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              action === a
                ? "bg-[var(--color-leaf-100)] border-[var(--color-leaf-700)]/30 text-[var(--color-leaf-900)]"
                : "bg-white border-[rgba(47,98,56,0.12)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
            }`}
          >
            {a}
          </Link>
        ))}
      </div>

      <form
        action="/admin/auditoria"
        method="get"
        className="flex flex-wrap items-center gap-2 mb-4"
      >
        {action && <input type="hidden" name="action" value={action} />}
        <input
          type="search"
          name="actor"
          defaultValue={actor}
          placeholder="Filtrar por actor (email)…"
          className="px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs w-56 focus:outline-none focus:border-[var(--color-iris-700)]"
        />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar en resumen…"
          className="px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs w-56 focus:outline-none focus:border-[var(--color-iris-700)]"
        />
        <select
          name="days"
          defaultValue={String(days)}
          className="px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs bg-white focus:outline-none focus:border-[var(--color-iris-700)]"
        >
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="365">Último año</option>
        </select>
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-leaf-700)] text-white hover:bg-[var(--color-leaf-900)]"
        >
          Aplicar
        </button>
      </form>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        {!rows || rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--color-earth-700)]">
            No hay eventos que coincidan con los filtros.
          </div>
        ) : (
          <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
            {rows.map((r) => (
              <AuditRow
                key={r.id}
                row={{
                  id: r.id,
                  actor_email: r.actor_email,
                  actor_role: r.actor_role,
                  action: r.action,
                  entity_type: r.entity_type,
                  entity_id: r.entity_id,
                  summary: r.summary,
                  metadata: (r.metadata ?? {}) as Record<string, unknown>,
                  request_ip: r.request_ip,
                  created_at: r.created_at,
                }}
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
    </>
  );
}
