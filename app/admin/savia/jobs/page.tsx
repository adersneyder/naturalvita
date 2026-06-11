import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminPagination from "../../_components/AdminPagination";
import JobRow from "./_JobRow";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  q?: string;
  page?: string;
}>;

const STATUSES = ["all", "queued", "sending", "sent", "failed", "skipped"] as const;

/**
 * Explorador de la cola email_jobs. Para troubleshooting: ver qué se
 * envió/saltó/falló, con payload y eventos correlacionados por job.
 */
export default async function SaviaJobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await getAdminUser();
  const params = await searchParams;

  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as string)
    : "all";
  const q = (params.q ?? "").trim().toLowerCase();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;

  const admin = createAdminClient();
  let query = admin
    .from("email_jobs")
    .select(
      "id, to_email, subject, template, status, attempts, message_id, flow_id, scheduled_at, last_error, payload, created_at, updated_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("to_email", `%${q}%`);

  const { data: jobs, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Eventos de los jobs visibles (un solo query, agrupado en memoria).
  const jobIds = (jobs ?? []).map((j) => j.id);
  const { data: events } = jobIds.length
    ? await admin
        .from("email_events")
        .select("job_id, event_type, created_at")
        .in("job_id", jobIds)
        .order("created_at")
    : { data: [] };

  const eventsByJob = new Map<string, Array<{ event_type: string; created_at: string }>>();
  for (const e of events ?? []) {
    if (!e.job_id) continue;
    const list = eventsByJob.get(e.job_id) ?? [];
    list.push({ event_type: e.event_type, created_at: e.created_at });
    eventsByJob.set(e.job_id, list);
  }

  function buildHref(p: number): string {
    const next = new URLSearchParams();
    if (status !== "all") next.set("status", status);
    if (q) next.set("q", q);
    if (p > 1) next.set("page", String(p));
    return `/admin/savia/jobs${next.toString() ? `?${next}` : ""}`;
  }

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Cola de correos
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            {total} jobs {status !== "all" ? `con estado "${status}"` : "en total"}
          </p>
        </div>
        <Link
          href="/admin/savia"
          className="text-xs text-[var(--color-iris-700)] hover:underline"
        >
          ← Dashboard Savia
        </Link>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/savia/jobs${s !== "all" ? `?status=${s}` : ""}${q ? `${s !== "all" ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              status === s
                ? "bg-[var(--color-leaf-100)] border-[var(--color-leaf-700)]/30 text-[var(--color-leaf-900)]"
                : "bg-white border-[rgba(47,98,56,0.12)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
            }`}
          >
            {s === "all" ? "Todos" : s}
          </Link>
        ))}
        <form action="/admin/savia/jobs" method="get" className="ml-auto">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por email…"
            className="px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs w-52 focus:outline-none focus:border-[var(--color-iris-700)]"
          />
        </form>
      </div>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        {!jobs || jobs.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--color-earth-700)]">
            No hay jobs que coincidan con los filtros.
          </div>
        ) : (
          <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
            {jobs.map((j) => (
              <JobRow
                key={j.id}
                job={{
                  id: j.id,
                  to_email: j.to_email,
                  subject: j.subject,
                  template: j.template,
                  status: j.status,
                  attempts: j.attempts,
                  message_id: j.message_id,
                  flow_id: j.flow_id,
                  scheduled_at: j.scheduled_at,
                  last_error: j.last_error,
                  payload: j.payload as Record<string, unknown>,
                  created_at: j.created_at,
                }}
                events={eventsByJob.get(j.id) ?? []}
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
