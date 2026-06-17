import Link from "next/link";
import { requireCapability } from "@/lib/admin-capabilities";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  TASK_PRIORITY_STYLES,
  TASK_SOURCE_LABELS,
  TASK_TYPE_LABELS,
  type TaskRow,
  type TaskSource,
  type TaskType,
} from "@/lib/tasks/types";
import TaskCard from "./_TaskCard";
import GenerateChurnButton from "./_GenerateChurnButton";
import SourceFilter from "./_SourceFilter";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; source?: string }>;

const STATUSES = [
  { key: "pending", label: "Pendientes" },
  { key: "executed", label: "Ejecutadas" },
  { key: "rejected", label: "Rechazadas" },
  { key: "failed", label: "Fallidas" },
] as const;

export default async function TareasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await requireCapability("bi.read");
  const canDecide = await import("@/lib/admin-capabilities").then((m) =>
    m.roleHasCapability(actor.role, "tasks.decide"),
  );

  const params = await searchParams;
  const status = params.status ?? "pending";
  const sourceFilter = params.source ?? "";

  const admin = createAdminClient();
  let q = admin
    .from("admin_tasks")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) q = q.eq("status", status);
  if (sourceFilter) q = q.eq("source", sourceFilter);

  const { data: tasks } = await q;
  const list = (tasks ?? []) as TaskRow[];

  // Conteo total por status (sin source filter) para mostrar en chips.
  const { data: counts } = await admin
    .from("admin_tasks")
    .select("status")
    .limit(2000);
  const countsByStatus = new Map<string, number>();
  for (const r of counts ?? []) {
    countsByStatus.set(r.status, (countsByStatus.get(r.status) ?? 0) + 1);
  }

  return (
    <>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Bandeja de tareas
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            Decisiones semi-automáticas: el sistema propone, el equipo aprueba.
            Capa 5 del BI · puente Sembrado → Savia.
          </p>
        </div>
        {canDecide && <GenerateChurnButton />}
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUSES.map((s) => (
          <Link
            key={s.key}
            href={`/admin/tareas?status=${s.key}${sourceFilter ? `&source=${sourceFilter}` : ""}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              status === s.key
                ? "bg-[var(--color-leaf-100)] border-[var(--color-leaf-700)]/30 text-[var(--color-leaf-900)]"
                : "bg-white border-[rgba(47,98,56,0.12)] text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)]"
            }`}
          >
            {s.label}
            <span className="ml-1.5 text-[var(--color-earth-500)] tabular-nums">
              {countsByStatus.get(s.key) ?? 0}
            </span>
          </Link>
        ))}
        <SourceFilter current={sourceFilter} status={status} />
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] px-4 py-16 text-center">
          <p className="text-sm text-[var(--color-earth-700)] m-0">
            {status === "pending"
              ? "No hay tareas pendientes. El sistema aún no ha propuesto nada — o ya las atendiste todas."
              : `No hay tareas en estado "${status}".`}
          </p>
          {status === "pending" && canDecide && (
            <p className="text-xs text-[var(--color-earth-500)] mt-2 m-0">
              Usa "Generar tareas de churn" arriba para crear propuestas de
              recuperación de clientes en riesgo.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              canDecide={canDecide}
              typeLabels={TASK_TYPE_LABELS as Record<TaskType, string>}
              sourceLabels={TASK_SOURCE_LABELS as Record<TaskSource, string>}
              priorityStyles={TASK_PRIORITY_STYLES}
            />
          ))}
        </div>
      )}

      <p className="text-[10px] text-[var(--color-earth-500)] mt-4">
        Las tareas pendientes con expires_at vencido se marcan automáticamente
        como expired vía expire_overdue_tasks(). Las decisiones quedan en
        auditoría con quién aprobó/rechazó y por qué.
      </p>
    </>
  );
}
