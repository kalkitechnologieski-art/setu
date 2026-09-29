-- ═══════════════════════════════════════════════════════════════════════════
-- Setu Kalki — 003_phase5.sql
-- Approvals queue, buying signals, per-agent cost tracking
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Approvals (HITL gate — feeds Inbox + Approvals pages) ─────────────
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  agent_name text not null,
  action text not null,
  payload jsonb not null default {}::jsonb,
  reasoning text,
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','expired')),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  decision_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists approvals_user_status_idx
  on public.approvals (user_id, status, created_at desc);
create index if not exists approvals_user_agent_idx
  on public.approvals (user_id, agent_name, created_at desc);
create index if not exists approvals_pending_idx
  on public.approvals (created_at asc)
  where status = pending;

-- ─── Signals (buying intent feed) ──────────────────────────────────────
create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  signal_type text not null,
  source text not null,
  title text not null,
  description text,
  icp_score int check (icp_score is null or (icp_score between 0 and 100)),
  urgency text check (urgency in ('low','medium','high','critical')),
  raw_data jsonb not null default {}::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists signals_user_created_idx
  on public.signals (user_id, created_at desc);
create index if not exists signals_user_urgency_idx
  on public.signals (user_id, urgency, created_at desc);

-- ─── Agent costs (per-agent budget tracking) ───────────────────────────
create table if not exists public.agent_costs (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  agent_name text not null,
  date date not null default current_date,
  runs int not null default 0,
  tokens_in bigint not null default 0,
  tokens_out bigint not null default 0,
  cost_usd numeric(10,4) not null default 0,
  unique (user_id, agent_name, date)
);

create index if not exists agent_costs_user_date_idx
  on public.agent_costs (user_id, date desc);

-- ─── RLS (auth.uid() wrapped in select for query-plan caching) ─────────
alter table public.approvals     enable row level security;
alter table public.signals       enable row level security;
alter table public.agent_costs   enable row level security;

drop policy if exists "approvals_select_own" on public.approvals;
create policy "approvals_select_own" on public.approvals
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "approvals_insert_own" on public.approvals;
create policy "approvals_insert_own" on public.approvals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "approvals_update_own" on public.approvals;
create policy "approvals_update_own" on public.approvals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "signals_select_own" on public.signals;
create policy "signals_select_own" on public.signals
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "signals_insert_own" on public.signals;
create policy "signals_insert_own" on public.signals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "agent_costs_select_own" on public.agent_costs;
create policy "agent_costs_select_own" on public.agent_costs
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "agent_costs_insert_own" on public.agent_costs;
create policy "agent_costs_insert_own" on public.agent_costs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ─── Realtime publication (drives live Inbox / Signals) ────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = supabase_realtime and tablename = approvals
  ) then
    alter publication supabase_realtime add table public.approvals;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = supabase_realtime and tablename = signals
  ) then
    alter publication supabase_realtime add table public.signals;
  end if;
end $$;

