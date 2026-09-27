-- ═══════════════════════════════════════════════════════════════════════════
-- Setu Kalki — 005_auth_platforms.sql
-- Encrypted platform connections (Google Ads, YouTube, Meta) + auth audit log
-- ═══════════════════════════════════════════════════════════════════════════

-- pgcrypto powers Supabase Vault (already installed on every project)

-- ─── platform_connections ─────────────────────────────────────────────────
-- Tokens are stored as Supabase Vault secrets; this table holds only UUID
-- references. Vault uses pgsodium authenticated encryption on disk.
create table if not exists public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in (
    'google_ads', 'youtube', 'ga4', 'meta_ads', 'facebook', 'instagram'
  )),
  provider_account_id text,
  provider_account_name text,
  -- Vault secret UUIDs (never the raw token)
  access_token_secret_id uuid,
  refresh_token_secret_id uuid,
  scopes text[] not null default '{}',
  token_type text not null default 'Bearer',
  expires_at timestamptz,
  last_refresh_at timestamptz,
  last_refresh_error text,
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked', 'error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id)
);

create index if not exists platform_connections_user_idx
  on public.platform_connections (user_id, provider, status);

create index if not exists platform_connections_refresh_idx
  on public.platform_connections (expires_at)
  where status = 'active' and refresh_token_secret_id is not null;

-- ─── auth_events (audit log — never stores tokens) ────────────────────────
create table if not exists public.auth_events (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'signin','signup','signout','password_reset',
    'mfa_enrolled','mfa_challenged',
    'platform_connected','platform_revoked','platform_refreshed'
  )),
  provider text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists auth_events_user_idx
  on public.auth_events (user_id, created_at desc);

-- ─── updated_at trigger for platform_connections ──────────────────────────
drop trigger if exists platform_connections_updated_at on public.platform_connections;
create trigger platform_connections_updated_at
  before update on public.platform_connections
  for each row execute function public.handle_updated_at();

-- ─── RLS (auth.uid() wrapped in select for query-plan caching) ────────────
alter table public.platform_connections enable row level security;
alter table public.auth_events enable row level security;

drop policy if exists "platform_connections_select_own" on public.platform_connections;
create policy "platform_connections_select_own" on public.platform_connections
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "platform_connections_insert_own" on public.platform_connections;
create policy "platform_connections_insert_own" on public.platform_connections
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "platform_connections_update_own" on public.platform_connections;
create policy "platform_connections_update_own" on public.platform_connections
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "platform_connections_delete_own" on public.platform_connections;
create policy "platform_connections_delete_own" on public.platform_connections
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "auth_events_select_own" on public.auth_events;
create policy "auth_events_select_own" on public.auth_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "auth_events_insert_self" on public.auth_events;
create policy "auth_events_insert_self" on public.auth_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ─── Realtime publication (drives live connection health) ─────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'platform_connections'
  ) then
    alter publication supabase_realtime add table public.platform_connections;
  end if;
end $$;
