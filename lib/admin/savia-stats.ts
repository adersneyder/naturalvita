/**
 * lib/admin/savia-stats.ts
 *
 * Capa de datos para el dashboard /admin/savia. Cada función ejecuta una
 * sola query agregada (no N+1) y devuelve solo los campos que la UI
 * consume. Usa el admin client porque las 4 tablas de Savia son service_role.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type SaviaOverviewKpis = {
  periodDays: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  /** Porcentajes: open rate = opened/delivered; bounce rate = bounced/sent. */
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
};

export type SaviaQueueHealth = {
  queued: number;
  sending: number;
  failed24h: number;
  skipped24h: number;
  /** True si hay jobs `sending` con más de 5 min — sugiere dispatcher bloqueado. */
  stuckSending: boolean;
};

export type SaviaFlowPerformance = {
  flowId: string;
  flowName: string;
  active: boolean;
  sent: number;
  skipped: number;
  failed: number;
  delivered: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
  /** Pedidos pagados atribuidos a un job de este flow. */
  attributedOrders: number;
  /** Revenue en COP atribuido al flow vía savia_attribution_job_id. */
  attributedRevenueCop: number;
};

export type SaviaCronRun = {
  jobname: string;
  startTime: string;
  status: string;
  returnMessage: string | null;
};

function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10; // 1 decimal
}

/**
 * KPIs agregados de los últimos `periodDays` días. Una sola query a
 * email_events agrupando por event_type, otra a email_jobs para 'sent'.
 */
export async function getOverviewKpis(
  periodDays = 7,
): Promise<SaviaOverviewKpis> {
  const supabase = createAdminClient();
  const sinceIso = new Date(
    Date.now() - periodDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [{ data: events }, { count: sentCount }] = await Promise.all([
    supabase
      .from("email_events")
      .select("event_type")
      .gte("created_at", sinceIso),
    supabase
      .from("email_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("updated_at", sinceIso),
  ]);

  let delivered = 0;
  let opened = 0;
  let clicked = 0;
  let bounced = 0;
  let complained = 0;
  for (const e of events ?? []) {
    switch (e.event_type) {
      case "delivered":
        delivered++;
        break;
      case "opened":
        opened++;
        break;
      case "clicked":
        clicked++;
        break;
      case "bounced":
        bounced++;
        break;
      case "complained":
        complained++;
        break;
    }
  }
  const sent = sentCount ?? 0;

  return {
    periodDays,
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    complained,
    deliveryRate: pct(delivered, sent),
    openRate: pct(opened, delivered),
    clickRate: pct(clicked, delivered),
    bounceRate: pct(bounced, sent),
    complaintRate: pct(complained, sent),
  };
}

/** Salud operativa de la cola. */
export async function getQueueHealth(): Promise<SaviaQueueHealth> {
  const supabase = createAdminClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const stuckThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const [
    { count: queued },
    { count: sending },
    { count: failed24h },
    { count: skipped24h },
    { count: stuckCount },
  ] = await Promise.all([
    supabase
      .from("email_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued"),
    supabase
      .from("email_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "sending"),
    supabase
      .from("email_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("updated_at", since24h),
    supabase
      .from("email_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "skipped")
      .gte("updated_at", since24h),
    supabase
      .from("email_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "sending")
      .lt("updated_at", stuckThreshold),
  ]);

  return {
    queued: queued ?? 0,
    sending: sending ?? 0,
    failed24h: failed24h ?? 0,
    skipped24h: skipped24h ?? 0,
    stuckSending: (stuckCount ?? 0) > 0,
  };
}

/**
 * Performance por flow en los últimos `periodDays` días, incluyendo
 * revenue atribuido (mejora #1). Devuelve también flows sin actividad
 * para que se vean los enabled aunque no hayan enviado nada.
 */
export async function getFlowsPerformance(
  periodDays = 30,
): Promise<SaviaFlowPerformance[]> {
  const supabase = createAdminClient();
  const sinceIso = new Date(
    Date.now() - periodDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // 1) Universo de flows declarados
  const { data: flows } = await supabase
    .from("email_flows")
    .select("id, name, active")
    .order("id");
  if (!flows) return [];

  // 2) Counts por flow + status desde email_jobs (sent/skipped/failed)
  const { data: jobs } = await supabase
    .from("email_jobs")
    .select("id, flow_id, status, message_id")
    .gte("created_at", sinceIso);

  const jobIdsByFlow = new Map<string, Set<string>>();
  const counts = new Map<
    string,
    { sent: number; skipped: number; failed: number }
  >();
  for (const j of jobs ?? []) {
    const flowId = j.flow_id ?? "_unattached";
    if (!counts.has(flowId)) counts.set(flowId, { sent: 0, skipped: 0, failed: 0 });
    const c = counts.get(flowId)!;
    if (j.status === "sent") c.sent++;
    else if (j.status === "skipped") c.skipped++;
    else if (j.status === "failed") c.failed++;

    if (!jobIdsByFlow.has(flowId)) jobIdsByFlow.set(flowId, new Set());
    jobIdsByFlow.get(flowId)!.add(j.id as string);
  }

  // 3) Eventos por flow: hacemos un join lógico vía job_id
  const allJobIds = (jobs ?? []).map((j) => j.id as string);
  const { data: events } = allJobIds.length
    ? await supabase
        .from("email_events")
        .select("job_id, event_type")
        .in("job_id", allJobIds)
    : { data: [] };

  const evCounts = new Map<
    string,
    { delivered: number; opened: number; clicked: number }
  >();
  // Inicializar para todos los flows con jobs
  for (const flowId of jobIdsByFlow.keys()) {
    evCounts.set(flowId, { delivered: 0, opened: 0, clicked: 0 });
  }
  for (const e of events ?? []) {
    if (!e.job_id) continue;
    let flowOfEvent: string | undefined;
    for (const [flowId, ids] of jobIdsByFlow) {
      if (ids.has(e.job_id as string)) {
        flowOfEvent = flowId;
        break;
      }
    }
    if (!flowOfEvent) continue;
    const c = evCounts.get(flowOfEvent)!;
    if (e.event_type === "delivered") c.delivered++;
    else if (e.event_type === "opened") c.opened++;
    else if (e.event_type === "clicked") c.clicked++;
  }

  // 4) Revenue atribuido por flow: orders.savia_attribution_job_id → job.flow_id
  const { data: revenueRows } = allJobIds.length
    ? await supabase
        .from("orders")
        .select("savia_attribution_job_id, total_cop, payment_status")
        .eq("payment_status", "paid")
        .in("savia_attribution_job_id", allJobIds)
        .gte("created_at", sinceIso)
    : { data: [] };

  const revByFlow = new Map<string, { orders: number; revenue: number }>();
  for (const r of revenueRows ?? []) {
    if (!r.savia_attribution_job_id) continue;
    let flowOfRev: string | undefined;
    for (const [flowId, ids] of jobIdsByFlow) {
      if (ids.has(r.savia_attribution_job_id as string)) {
        flowOfRev = flowId;
        break;
      }
    }
    if (!flowOfRev) continue;
    if (!revByFlow.has(flowOfRev)) revByFlow.set(flowOfRev, { orders: 0, revenue: 0 });
    const x = revByFlow.get(flowOfRev)!;
    x.orders++;
    x.revenue += (r.total_cop as number) ?? 0;
  }

  // 5) Ensamblar resultado para cada flow declarado
  return flows.map((f) => {
    const c = counts.get(f.id) ?? { sent: 0, skipped: 0, failed: 0 };
    const ev = evCounts.get(f.id) ?? { delivered: 0, opened: 0, clicked: 0 };
    const rev = revByFlow.get(f.id) ?? { orders: 0, revenue: 0 };
    return {
      flowId: f.id,
      flowName: f.name as string,
      active: f.active as boolean,
      sent: c.sent,
      skipped: c.skipped,
      failed: c.failed,
      delivered: ev.delivered,
      opened: ev.opened,
      clicked: ev.clicked,
      openRate: pct(ev.opened, ev.delivered),
      clickRate: pct(ev.clicked, ev.delivered),
      attributedOrders: rev.orders,
      attributedRevenueCop: rev.revenue,
    };
  });
}

/** Últimas ejecuciones del cron savia-dispatch + savia-cart-detect. */
export async function getRecentCronRuns(limit = 10): Promise<SaviaCronRun[]> {
  const supabase = createAdminClient();
  // pg_cron vive en schema `cron` — accedemos vía RPC porque el cliente
  // Supabase no consulta schemas no-públicos directamente. Para mantener
  // esto simple en Sesión D usamos una vista pública que ya creamos abajo.
  const { data, error } = await supabase
    .from("v_savia_cron_runs")
    .select("jobname, start_time, status, return_message")
    .order("start_time", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    jobname: r.jobname as string,
    startTime: r.start_time as string,
    status: r.status as string,
    returnMessage: (r.return_message as string | null) ?? null,
  }));
}
