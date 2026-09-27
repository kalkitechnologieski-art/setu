-- ═══════════════════════════════════════════════════════════════════════════
-- Setu Kalki — 007_ops_center.sql
-- Agent registry, approval chains, live metrics, governance ledger
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── agent_registry ───────────────────────────────────────────────────────
-- Every agent (human-defined or AI) that operates on this workspace.
-- Feeds the Operations Center registry table.
create table if not exists public.agent_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null,
  name text not null,
  role text not null,
  description text,
  icon text not null default 'sparkles',
  accent text not null default 'violet',
  color text not null default '#8b5cf6',
  autonomy text not null default 'suggest'
    check (autonomy in ('suggest','confirm','auto_with_rules','autonomous')),
  status text not null default 'active'
    check (status in ('active','paused','deprecated')),
  capabilities text[] not null default '{}',
  max_daily_runs int not null default 500,
  max_daily_cost_usd numeric(10,2) not null default 25.00,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists agent_registry_user_idx
  on public.agent_registry (user_id, status);

-- ─── approval_chains ──────────────────────────────────────────────────────
-- A single approval may require sequential sign-off by multiple roles
-- (e.g., marketing lead → finance → CEO for budgets > $10k).
create table if not exists public.approval_chains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  approval_id uuid not null references public.approvals(id) on delete cascade,
  step_index int not null,
  required_role text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','skipped')),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (approval_id, step_index)
);

create index if not exists approval_chains_approval_idx
  on public.approval_chains (approval_id, step_index);
create index if not exists approval_chains_user_pending_idx
  on public.approval_chains (user_id, status, created_at)
  where status = 'pending';

-- ─── agent_metrics ────────────────────────────────────────────────────────
-- Rolling per-agent metrics — one row per (agent, hour).
-- Feeds the live activity feed and cost charts.
create table if not exists public.agent_metrics (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  agent_slug text not null,
  bucket timestamptz not null,
  runs_started int not null default 0,
  runs_completed int not null default 0,
  runs_failed int not null default 0,
  tokens_in bigint not null default 0,
  tokens_out bigint not null default 0,
  cost_usd numeric(10,4) not null default 0,
  p50_duration_ms int,
  p95_duration_ms int,
  unique (user_id, agent_slug, bucket)
);

create index if not exists agent_metrics_user_bucket_idx
  on public.agent_metrics (user_id, bucket desc);
create index if not exists agent_metrics_agent_bucket_idx
  on public.agent_metrics (user_id, agent_slug, bucket desc);

-- ─── governance_events ────────────────────────────────────────────────────
-- Immutable audit log for compliance queries.
create table if not exists public.governance_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_type text not null check (actor_type in ('human','agent','system')),
  actor_id text not null,
  event_type text not null,
  severity text not null default 'info'
    check (severity in ('info','warning','critical')),
  resource_type text,
  resource_id text,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists governance_events_user_created_idx
  on public.governance_events (user_id, created_at desc);
create index if not exists governance_events_severity_idx
  on public.governance_events (user_id, severity, created_at desc)
  where severity <> 'info';

-- ─── triggers ─────────────────────────────────────────────────────────────
drop trigger if exists agent_registry_updated_at on public.agent_registry;
create trigger agent_registry_updated_at
  before update on public.agent_registry
  for each row execute function public.handle_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.agent_registry    enable row level security;
alter table public.approval_chains   enable row level security;
alter table public.agent_metrics     enable row level security;
alter table public.governance_events enable row level security;

drop policy if exists "agent_registry_all_own" on public.agent_registry;
create policy "agent_registry_all_own" on public.agent_registry
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "approval_chains_select_own" on public.approval_chains;
create policy "approval_chains_select_own" on public.approval_chains
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "approval_chains_insert_own" on public.approval_chains;
create policy "approval_chains_insert_own" on public.approval_chains
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "approval_chains_update_own" on public.approval_chains;
create policy "approval_chains_update_own" on public.approval_chains
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "agent_metrics_select_own" on public.agent_metrics;
create policy "agent_metrics_select_own" on public.agent_metrics
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "agent_metrics_insert_own" on public.agent_metrics;
create policy "agent_metrics_insert_own" on public.agent_metrics
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "governance_events_select_own" on public.governance_events;
create policy "governance_events_select_own" on public.governance_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "governance_events_insert_own" on public.governance_events;
create policy "governance_events_insert_own" on public.governance_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ─── Realtime publication ─────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and tablename='agent_registry') then
    alter publication supabase_realtime add table public.agent_registry;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and tablename='approval_chains') then
    alter publication supabase_realtime add table public.approval_chains;
  end if;
end $$;

-- ─── Seed the four default agents ─────────────────────────────────────────
-- Idempotent: only inserts if the user has no agents yet.
create or replace function public.seed_default_agents(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.agent_registry where user_id = p_user_id) then
    insert into public.agent_registry
      (user_id, slug, name, role, description, icon, accent, color, autonomy, capabilities)
    values
      (p_user_id, 'arjun', 'Arjun', 'Outbound SDR',
       'Finds, enriches, and scores leads against your ICP.',
       'search', 'violet', '#8b5cf6', 'suggest',
       ARRAY['lead_discovery','enrichment','icp_scoring','semantic_search']),
      (p_user_id, 'meera', 'Meera', 'Voice Agent',
       'Places AI calls, transcribes, extracts intent.',
       'phone', 'blue', '#3b82f6', 'confirm',
       ARRAY['ai_calling','sms_outreach','transcription','sentiment']),
      (p_user_id, 'kabir', 'Kabir', 'Nurture Writer',
       'Drafts sequences, personalises, A/B tests.',
       'megaphone', 'emerald', '#10b981', 'auto_with_rules',
       ARRAY['email_sequences','personalisation','ab_testing','reply_handling']),
      (p_user_id, 'siddhi', 'Siddhi', 'Performance Marketing Lead',
       'Monitors ROAS across platforms, drafts reallocations.',
       'bar-chart', 'amber', '#f59e0b', 'suggest',
       ARRAY['campaign_creation','budget_optimisation','cross_platform','roas']);
  end if;
end;
$$;

grant execute on function public.seed_default_agents(uuid) to authenticated;
