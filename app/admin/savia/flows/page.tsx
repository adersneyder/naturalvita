import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import FlowToggle from "./_FlowToggle";

export const dynamic = "force-dynamic";

/**
 * Gestión de flows de Savia: lista cada flow con sus pasos y permite
 * activar/desactivar. Un flow inactivo deja de enrolar nuevos
 * destinatarios; los jobs ya encolados se envían igual.
 */
export default async function SaviaFlowsPage() {
  await getAdminUser();

  const admin = createAdminClient();
  const [{ data: flows }, { data: steps }] = await Promise.all([
    admin
      .from("email_flows")
      .select("id, name, trigger_event, active, created_at")
      .order("id"),
    admin
      .from("email_flow_steps")
      .select("flow_id, step_order, template, subject, delay_seconds, active")
      .order("step_order"),
  ]);

  const stepsByFlow = new Map<string, NonNullable<typeof steps>>();
  for (const s of steps ?? []) {
    const list = stepsByFlow.get(s.flow_id) ?? [];
    list.push(s);
    stepsByFlow.set(s.flow_id, list);
  }

  function delayLabel(seconds: number): string {
    if (seconds === 0) return "inmediato";
    const days = Math.round(seconds / 86400);
    if (days >= 1) return `+${days} día${days > 1 ? "s" : ""}`;
    const hours = Math.round(seconds / 3600);
    return `+${hours} h`;
  }

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Flows de Savia
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            Desactivar un flow detiene nuevos enrolamientos. Los correos ya
            encolados se envían igual.
          </p>
        </div>
        <Link
          href="/admin/savia"
          className="text-xs text-[var(--color-iris-700)] hover:underline"
        >
          ← Dashboard Savia
        </Link>
      </header>

      <div className="space-y-4">
        {(flows ?? []).map((f) => (
          <section
            key={f.id}
            className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden"
          >
            <header className="px-4 py-3 flex items-center justify-between border-b border-[rgba(47,98,56,0.08)]">
              <div>
                <h2 className="font-serif text-sm font-medium text-[var(--color-leaf-900)] m-0">
                  {f.name}
                </h2>
                <p className="text-[11px] text-[var(--color-earth-500)] font-mono m-0 mt-0.5">
                  {f.id} · trigger: {f.trigger_event ?? "—"}
                </p>
              </div>
              <FlowToggle flowId={f.id} active={f.active} />
            </header>
            <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
              {(stepsByFlow.get(f.id) ?? []).map((s) => (
                <li
                  key={`${f.id}-${s.step_order}`}
                  className="px-4 py-2.5 flex items-center justify-between text-[13px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-[var(--color-earth-50)] border border-[var(--color-earth-100)] text-[10px] flex items-center justify-center tabular-nums text-[var(--color-earth-700)] flex-shrink-0">
                      {s.step_order}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[var(--color-leaf-900)] truncate m-0">
                        {s.subject}
                      </p>
                      <p className="text-[11px] text-[var(--color-earth-500)] font-mono m-0">
                        {s.template}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-[var(--color-earth-700)] tabular-nums flex-shrink-0 ml-3">
                    {delayLabel(s.delay_seconds)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
