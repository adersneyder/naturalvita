/**
 * SQL de las RPCs de métricas del chat (Pasada C). Centralizado aquí
 * como referencia — se aplica vía migración. Documentado para que el
 * dashboard y los agentes BI sepan qué calcula cada una.
 *
 * Este archivo NO se ejecuta: es la fuente de verdad del SQL que vive
 * en la BD. Mantenerlo sincronizado con las migraciones.
 *
 * Funciones:
 *   chat_metrics_overview(p_days)  KPIs agregados del periodo
 *   chat_daily_series(p_days)      serie diaria para gráfico
 *   chat_escalation_reasons(p_days) top razones de escalación
 */

export const CHAT_METRICS_SQL = `
-- KPIs agregados
create or replace function public.chat_metrics_overview(p_days integer default 30)
returns table (
  total_conversations bigint,
  ai_resolved bigint,
  escalated bigint,
  abandoned bigint,
  active_now bigint,
  avg_ai_first_response_sec numeric,
  avg_human_first_response_sec numeric,
  avg_resolution_sec numeric,
  total_cost_usd numeric,
  led_to_purchase bigint,
  as_of timestamptz
)
language plpgsql stable security definer set search_path = public as $$
declare v_since timestamptz := now() - make_interval(days => greatest(1, p_days));
begin
  return query
  with convs as (
    select * from public.chat_conversations where started_at >= v_since
  ),
  purchases as (
    -- Conversación → compra: el visitor_id de la conversación tuvo un
    -- evento purchase dentro de 24h después de iniciar la conversación.
    select distinct c.id as conv_id
    from convs c
    join public.tracking_events te
      on te.visitor_id = c.visitor_id
     and te.event_type = 'purchase'
     and te.created_at between c.started_at and c.started_at + interval '24 hours'
  )
  select
    count(*)::bigint,
    count(*) filter (where c.status = 'resolved' and c.escalated_at is null)::bigint,
    count(*) filter (where c.escalated_at is not null)::bigint,
    count(*) filter (where c.status = 'abandoned')::bigint,
    count(*) filter (where c.status in ('active','escalated','assigned'))::bigint,
    round(avg(extract(epoch from (c.first_response_at - c.started_at)))
      filter (where c.first_response_at is not null), 1),
    round(avg(extract(epoch from (c.first_human_response_at - c.escalated_at)))
      filter (where c.first_human_response_at is not null and c.escalated_at is not null), 1),
    round(avg(extract(epoch from (c.resolved_at - c.started_at)))
      filter (where c.resolved_at is not null), 1),
    coalesce(sum(c.total_cost_usd), 0),
    (select count(*) from purchases)::bigint,
    now()
  from convs c;
end; $$;

revoke all on function public.chat_metrics_overview(integer) from public, anon, authenticated;
grant execute on function public.chat_metrics_overview(integer) to service_role;

-- Serie diaria
create or replace function public.chat_daily_series(p_days integer default 30)
returns table (
  day date,
  conversations bigint,
  escalated bigint,
  cost_usd numeric,
  as_of timestamptz
)
language plpgsql stable security definer set search_path = public as $$
declare v_since timestamptz := now() - make_interval(days => greatest(1, p_days));
begin
  return query
  select
    date_trunc('day', c.started_at)::date,
    count(*)::bigint,
    count(*) filter (where c.escalated_at is not null)::bigint,
    coalesce(sum(c.total_cost_usd), 0),
    now()
  from public.chat_conversations c
  where c.started_at >= v_since
  group by 1
  order by 1;
end; $$;

revoke all on function public.chat_daily_series(integer) from public, anon, authenticated;
grant execute on function public.chat_daily_series(integer) to service_role;

-- Razones de escalación (resolved_intent agrupado)
create or replace function public.chat_escalation_reasons(p_days integer default 30)
returns table (
  reason text,
  count bigint,
  as_of timestamptz
)
language plpgsql stable security definer set search_path = public as $$
declare v_since timestamptz := now() - make_interval(days => greatest(1, p_days));
begin
  return query
  select
    coalesce(c.resolved_intent, 'sin_clasificar'),
    count(*)::bigint,
    now()
  from public.chat_conversations c
  where c.started_at >= v_since
    and c.escalated_at is not null
  group by 1
  order by 2 desc;
end; $$;

revoke all on function public.chat_escalation_reasons(integer) from public, anon, authenticated;
grant execute on function public.chat_escalation_reasons(integer) to service_role;
`;
