-- SAVIA core: queue + declarative flows + event sink.
-- Applied via Supabase MCP (apply_migration: savia_core_tables) 2026-06-05.
-- RLS: service_role only on every table (mirrors email_suppressions policy).
-- See README.md section 7 for the full design.

-- 1. email_flows: declarative flow definitions
create table if not exists public.email_flows (
  id text primary key,                 -- slug, e.g. 'welcome-series'
  name text not null,
  trigger_event text,                  -- 'newsletter_subscribed', 'cart_abandoned_1h', ...
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2. email_flow_steps: ordered steps within a flow
create table if not exists public.email_flow_steps (
  id uuid primary key default gen_random_uuid(),
  flow_id text not null references public.email_flows(id) on delete cascade,
  step_order int not null,
  delay_seconds int not null default 0,   -- relative to previous step (0 = immediate)
  template text not null,                  -- template slug, resolved by dispatcher registry
  subject text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (flow_id, step_order)
);

-- 3. email_jobs: the send queue
create table if not exists public.email_jobs (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,  -- references, NOT baked data (dynamic render at send time)
  scheduled_at timestamptz not null default now(),
  status text not null default 'queued',
  attempts int not null default 0,
  message_id text,                             -- Resend id, correlates with email_events
  flow_id text references public.email_flows(id) on delete set null,
  flow_step_id uuid references public.email_flow_steps(id) on delete set null,
  idempotency_key text unique,                 -- '{flow}:{step}:{enrollment}', blocks double-enqueue
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_jobs_status_check
    check (status in ('queued','sending','sent','failed','skipped'))
);
create index if not exists email_jobs_dispatch_idx on public.email_jobs (status, scheduled_at);
create index if not exists email_jobs_message_id_idx on public.email_jobs (message_id);

-- 4. email_events: sink for Resend webhook events
create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.email_jobs(id) on delete set null,
  message_id text,                             -- always present, correlation key
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint email_events_type_check
    check (event_type in ('sent','delivered','opened','clicked','bounced','complained','failed'))
);
create index if not exists email_events_job_idx on public.email_events (job_id, event_type);
create index if not exists email_events_message_id_idx on public.email_events (message_id);

-- 5. Revenue attribution: link an order back to the email job that drove it
alter table public.orders
  add column if not exists savia_attribution_job_id uuid references public.email_jobs(id) on delete set null;
create index if not exists orders_savia_attribution_idx on public.orders (savia_attribution_job_id);

-- updated_at touch trigger for email_jobs (dispatcher updates rows frequently)
create or replace function public.savia_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_email_jobs_updated_at on public.email_jobs;
create trigger trg_email_jobs_updated_at
  before update on public.email_jobs
  for each row execute function public.savia_touch_updated_at();

-- RLS: service_role only on all four tables
alter table public.email_flows enable row level security;
alter table public.email_flow_steps enable row level security;
alter table public.email_jobs enable row level security;
alter table public.email_events enable row level security;

create policy "Service role full access on email_flows" on public.email_flows
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role full access on email_flow_steps" on public.email_flow_steps
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role full access on email_jobs" on public.email_jobs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role full access on email_events" on public.email_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
