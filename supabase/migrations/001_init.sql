-- ═══════════════════════════════════════════════════════════════════════════
-- Setu Kalki Intelligence — 001_init.sql
-- Full schema: tables, RLS, functions, triggers, indexes, queue, rate-limiter
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "vector"   with schema extensions;

-- ─── 1. PROFILES ───────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text,
  plan        text not null default 'free'
                check (plan in ('free','starter','growth','scale','enterprise')),
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── 2. LEADS ──────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text,
  email         text,
  phone         text,
  company       text,
  title         text,
  score         int not null default 0 check (score between 0 and 100),
  status        text not null default 'new'
                  check (status in ('new','contacted','qualified','converted','lost')),
  source        text not null,
  enriched_data jsonb not null default '{}'::jsonb,
  icp_embedding extensions.vector(384),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── 3. CAMPAIGNS ──────────────────────────────────────────────────────────
create table if not exists public.campaigns (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  name                  text not null,
  status                text not null default 'draft'
                          check (status in ('draft','active','paused','completed')),
  type                  text not null
                          check (type in ('email','call','multi_channel','paid_ads')),
  workflow              jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  metrics               jsonb not null default '{"sent":0,"opened":0,"replied":0,"converted":0}'::jsonb,
  markifact_campaign_id text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── 4. EMAILS ─────────────────────────────────────────────────────────────
create table if not exists public.emails (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  subject     text,
  body        text,
  status      text not null default 'draft'
                check (status in ('draft','queued','sent','delivered','opened','clicked','bounced')),
  resend_id   text,
  sent_at     timestamptz,
  opened_at   timestamptz,
  created_at  timestamptz not null default now()
);

-- ─── 5. CALLS ──────────────────────────────────────────────────────────────
create table if not exists public.calls (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null references public.leads(id) on delete cascade,
  agentcall_id     text,
  direction        text not null check (direction in ('inbound','outbound')),
  transcript       text,
  summary          text,
  sentiment        text check (sentiment in ('positive','neutral','negative')),
  action_items     jsonb not null default '[]'::jsonb,
  duration_seconds int,
  created_at       timestamptz not null default now()
);

-- ─── 6. AD PERFORMANCE ─────────────────────────────────────────────────────
create table if not exists public.ad_performance (
  id            bigserial primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  platform      text not null,
  campaign_name text,
  spend         numeric(12,2) not null default 0,
  impressions   int not null default 0,
  clicks        int not null default 0,
  conversions   int not null default 0,
  roas          numeric(6,2) not null default 0,
  synced_at     timestamptz not null default now()
);

-- ─── 7. AGENT RUNS ─────────────────────────────────────────────────────────
create table if not exists public.agent_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  agent_name  text not null,
  status      text not null default 'running'
                check (status in ('running','completed','failed','pending_approval')),
  input       jsonb not null default '{}'::jsonb,
  output      jsonb not null default '{}'::jsonb,
  tokens_used int not null default 0,
  duration_ms int not null default 0,
  created_at  timestamptz not null default now()
);

-- ─── 8. JOB QUEUE (replaces Redis) ─────────────────────────────────────────
create table if not exists public.job_queue (
  id         bigserial primary key,
  user_id    uuid references public.profiles(id) on delete cascade,
  job_type   text not null,
  payload    jsonb not null default '{}'::jsonb,
  status     text not null default 'pending'
               check (status in ('pending','processing','done','failed')),
  locked_at  timestamptz,
  locked_by  text,
  retries    int not null default 0,
  created_at timestamptz not null default now()
);

-- ─── 9. RATE LIMITS (replaces Redis) ───────────────────────────────────────
create table if not exists public.rate_limits (
  key          text primary key,
  count        int not null default 0,
  window_start timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Atomic job claim — SKIP LOCKED (no Redis needed)
create or replace function public.claim_job(p_worker_id text)
returns setof public.job_queue
language plpgsql
security definer set search_path = ''
as $$
begin
  return query
  update public.job_queue
     set status     = 'processing',
         locked_at  = now(),
         locked_by  = p_worker_id
   where id = (
     select id
       from public.job_queue
      where status = 'pending'
      order by created_at asc
      limit 1
      for update skip locked
   )
  returning *;
end;
$$;

-- In-database rate limiter
create or replace function public.check_rate_limit(
  p_key            text,
  p_limit          int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  v_count        int;
  v_window_start timestamptz;
begin
  select count, window_start
    into v_count, v_window_start
    from public.rate_limits
   where key = p_key
     for update;

  if not found
     or v_window_start < now() - make_interval(secs => p_window_seconds)
  then
    insert into public.rate_limits (key, count, window_start)
    values (p_key, 1, now())
    on conflict (key) do update
       set count = 1, window_start = now();
    return true;
  end if;

  if v_count >= p_limit then
    return false;
  end if;

  update public.rate_limits
     set count = count + 1
   where key = p_key;
  return true;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.handle_updated_at();

drop trigger if exists campaigns_updated_at on public.campaigns;
create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.handle_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES (query performance)
-- ═══════════════════════════════════════════════════════════════════════════

-- Leads
create index if not exists leads_user_id_idx          on public.leads (user_id);
create index if not exists leads_user_status_idx      on public.leads (user_id, status);
create index if not exists leads_user_created_idx     on public.leads (user_id, created_at desc);
create index if not exists leads_email_idx            on public.leads (email) where email is not null;
create index if not exists leads_score_idx            on public.leads (score desc) where score > 0;

-- Campaigns
create index if not exists campaigns_user_id_idx      on public.campaigns (user_id);
create index if not exists campaigns_user_status_idx  on public.campaigns (user_id, status);
create index if not exists campaigns_created_idx      on public.campaigns (created_at desc);

-- Emails
create index if not exists emails_lead_id_idx         on public.emails (lead_id);
create index if not exists emails_campaign_id_idx     on public.emails (campaign_id) where campaign_id is not null;
create index if not exists emails_status_idx          on public.emails (status);

-- Calls
create index if not exists calls_lead_id_idx          on public.calls (lead_id);
create index if not exists calls_created_idx          on public.calls (created_at desc);

-- Ad performance
create index if not exists ad_perf_user_id_idx        on public.ad_performance (user_id);
create index if not exists ad_perf_user_platform_idx  on public.ad_performance (user_id, platform);
create index if not exists ad_perf_synced_idx         on public.ad_performance (synced_at desc);

-- Agent runs
create index if not exists agent_runs_user_id_idx     on public.agent_runs (user_id);
create index if not exists agent_runs_created_idx     on public.agent_runs (created_at desc);

-- Job queue (partial index for the hot path)
create index if not exists job_queue_pending_idx
  on public.job_queue (created_at asc)
  where status = 'pending';

create index if not exists job_queue_user_id_idx      on public.job_queue (user_id);

-- pgvector HNSW index for ICP similarity search
create index if not exists leads_icp_embedding_idx
  on public.leads
  using hnsw (icp_embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
-- auth.uid() wrapped in (select ...) to cache once per statement (94-99% faster)

alter table public.profiles        enable row level security;
alter table public.leads           enable row level security;
alter table public.campaigns       enable row level security;
alter table public.emails          enable row level security;
alter table public.calls           enable row level security;
alter table public.ad_performance  enable row level security;
alter table public.agent_runs      enable row level security;
alter table public.job_queue       enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Leads
drop policy if exists "leads_select_own" on public.leads;
create policy "leads_select_own" on public.leads
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "leads_insert_own" on public.leads;
create policy "leads_insert_own" on public.leads
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "leads_update_own" on public.leads;
create policy "leads_update_own" on public.leads
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "leads_delete_own" on public.leads;
create policy "leads_delete_own" on public.leads
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Campaigns
drop policy if exists "campaigns_select_own" on public.campaigns;
create policy "campaigns_select_own" on public.campaigns
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "campaigns_insert_own" on public.campaigns;
create policy "campaigns_insert_own" on public.campaigns
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "campaigns_update_own" on public.campaigns;
create policy "campaigns_update_own" on public.campaigns
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "campaigns_delete_own" on public.campaigns;
create policy "campaigns_delete_own" on public.campaigns
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Emails (via leads ownership)
drop policy if exists "emails_select_own" on public.emails;
create policy "emails_select_own" on public.emails
  for select to authenticated
  using (
    exists (
      select 1 from public.leads l
       where l.id = emails.lead_id
         and l.user_id = (select auth.uid())
    )
  );

drop policy if exists "emails_insert_own" on public.emails;
create policy "emails_insert_own" on public.emails
  for insert to authenticated
  with check (
    exists (
      select 1 from public.leads l
       where l.id = emails.lead_id
         and l.user_id = (select auth.uid())
    )
  );

drop policy if exists "emails_update_own" on public.emails;
create policy "emails_update_own" on public.emails
  for update to authenticated
  using (
    exists (
      select 1 from public.leads l
       where l.id = emails.lead_id
         and l.user_id = (select auth.uid())
    )
  );

-- Calls (via leads ownership)
drop policy if exists "calls_select_own" on public.calls;
create policy "calls_select_own" on public.calls
  for select to authenticated
  using (
    exists (
      select 1 from public.leads l
       where l.id = calls.lead_id
         and l.user_id = (select auth.uid())
    )
  );

drop policy if exists "calls_insert_own" on public.calls;
create policy "calls_insert_own" on public.calls
  for insert to authenticated
  with check (
    exists (
      select 1 from public.leads l
       where l.id = calls.lead_id
         and l.user_id = (select auth.uid())
    )
  );

-- Ad performance
drop policy if exists "ad_perf_select_own" on public.ad_performance;
create policy "ad_perf_select_own" on public.ad_performance
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "ad_perf_insert_own" on public.ad_performance;
create policy "ad_perf_insert_own" on public.ad_performance
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Agent runs
drop policy if exists "agent_runs_select_own" on public.agent_runs;
create policy "agent_runs_select_own" on public.agent_runs
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "agent_runs_insert_own" on public.agent_runs;
create policy "agent_runs_insert_own" on public.agent_runs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Job queue
drop policy if exists "job_queue_select_own" on public.job_queue;
create policy "job_queue_select_own" on public.job_queue
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "job_queue_insert_own" on public.job_queue;
create policy "job_queue_insert_own" on public.job_queue
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- REALTIME AUTHORIZATION
-- ═══════════════════════════════════════════════════════════════════════════
-- RLS on realtime.messages controls Broadcast + Presence channel access.

drop policy if exists "realtime_authenticated_select" on realtime.messages;
create policy "realtime_authenticated_select" on realtime.messages
  for select to authenticated
  using (true);

drop policy if exists "realtime_authenticated_insert" on realtime.messages;
create policy "realtime_authenticated_insert" on realtime.messages
  for insert to authenticated
  with check (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- REALTIME PUBLICATION (tables streamed to clients)
-- ═══════════════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.campaigns;
alter publication supabase_realtime add table public.agent_runs;
