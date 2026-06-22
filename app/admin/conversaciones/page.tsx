import Link from "next/link";
import { requireCapability } from "@/lib/admin-capabilities";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

const STATUS_FILTERS = [
  { key: "escalated", label: "Escaladas" },
  { key: "assigned", label: "Asignadas a mí" },
  { key: "active", label: "Con el agente" },
  { key: "resolved", label: "Cerradas" },
] as const;

const STATUS_STYLES: Record<string, { label: string; tone: string }> = {
  active: { label: "Agente", tone: "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]" },
  escalated: { label: "Escalada", tone: "bg-[#FCE9E5] text-[#B23A1F]" },
  assigned: { label: "En curso", tone: "bg-[#E8F0FE] text-[#1A56DB]" },
  resolved: {
    label: "Cerrada",
    tone: "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]",
  },
  abandoned: {
    label: "Abandonada",
    tone: "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]",
  },
};

export default async function ConversacionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await requireCapability("chat.respond");
  const params = await searchParams;
  const filter = params.status ?? "escalated";

  const admin = createAdminClient();

  let q = admin
    .from("chat_conversations")
    .select(
      "id, visitor_id, customer_id, status, message_count, last_message_at, escalated_at, resolved_at, initial_page_path, total_cost_usd, started_at",
    )
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (filter === "assigned") {
    q = q.eq("assigned_to", actor.id).neq("status", "resolved");
  } else if (filter === "escalated") {
    q = q.in("status", ["escalated", "assigned"]);
  } else if (filter) {
    q = q.eq("status", filter);
  }

  const { data: rows } = await q;
  const list = rows ?? [];

  // Conteos rápidos para chips.
  const { data: counts } = await admin
    .from("chat_conversations")
    .select("status, assigned_to")
    .limit(2000);
  const counter = new Map<string, number>();
  for (const r of counts ?? []) {
    const s = r.status as string;
    counter.set(s, (counter.get(s) ?? 0) + 1);
    if (r.assigned_to === actor.id && s !== "resolved") {
      counter.set("__assigned_me", (counter.get("__assigned_me") ?? 0) + 1);
    }
  }

  return (
    <>
      <header className="mb-4">
        <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
          Conversaciones
        </h1>
        <p className="text-xs text-[var(--color-earth-700)] mt-1">
          Atiende clientes en tiempo real. Las escaladas requieren respuesta
          humana.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_FILTERS.map((s) => {
          let count = 0;
          if (s.key === "assigned") count = counter.get("__assigned_me") ?? 0;
          else if (s.key === "escalated")
            count =
              (counter.get("escalated") ?? 0) + (counter.get("assigned") ?? 0);
          else count = counter.get(s.key) ?? 0;
          const active = filter === s.key;
          return (
            <Link
              key={s.key}
              href={`/admin/conversaciones?status=${s.key}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-[var(--color-leaf-100)] border-[var(--color-leaf-700)]/30 text-[var(--color-leaf-900)]"
                  : "bg-white border-[rgba(47,98,56,0.12)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
              }`}
            >
              {s.label}
              <span className="ml-1.5 text-[var(--color-earth-500)] tabular-nums">
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        {list.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--color-earth-700)]">
            {filter === "escalated"
              ? "No hay conversaciones esperando respuesta humana. El agente está manejando todo."
              : "No hay conversaciones con ese filtro."}
          </div>
        ) : (
          <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
            {list.map((c) => {
              const s = STATUS_STYLES[c.status] ?? STATUS_STYLES.active;
              const last = new Date(c.last_message_at);
              const ageMs = Date.now() - last.getTime();
              const ageMin = Math.floor(ageMs / 60000);
              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/conversaciones/${c.id}`}
                    className="block px-4 py-3 hover:bg-[var(--color-earth-50)]/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-[var(--color-leaf-900)] font-medium m-0 truncate">
                          {c.customer_id
                            ? "Cliente registrado"
                            : `Visitante ${(c.visitor_id ?? "anon").slice(0, 8)}`}
                          <span className="text-[var(--color-earth-500)] font-normal">
                            {" · "}
                            {c.message_count} mensajes
                          </span>
                        </p>
                        <p className="text-[11px] text-[var(--color-earth-500)] m-0 mt-0.5">
                          {c.initial_page_path
                            ? `Desde ${c.initial_page_path}`
                            : "Sin contexto de página"}
                          {c.status !== "resolved" && (
                            <span className="ml-2">
                              último mensaje hace{" "}
                              {ageMin < 1
                                ? "<1 min"
                                : ageMin < 60
                                  ? `${ageMin} min`
                                  : `${Math.floor(ageMin / 60)}h ${ageMin % 60}m`}
                            </span>
                          )}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.tone}`}
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
