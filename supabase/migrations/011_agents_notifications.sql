-- ═══════════════════════════════════════════════════════════════════════════
-- Setu Kalki — 011_agents_notifications.sql
-- 1. Extends handle_new_user to seed the 4 default agents
-- 2. Backfills agents for existing users
-- 3. Creates notifications table + RLS + Realtime
-- 4. Notification triggers on approvals and signals
-- IDEMPOTENT — safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Extended handle_new_user ─────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- (a) create the profile
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do nothing;

  -- (b) seed the four default agents for this user
  insert into public.agent_registry
    (user_id, slug, name, role, description, icon, accent, color, autonomy, capabilities)
  values
    (new.id, 'arjun', 'Arjun', 'Outbound SDR',
     'Finds, enriches, and scores leads against your ICP.',
     'search', 'violet', '#8b5cf6', 'suggest',
     array['lead_discovery','enrichment','icp_scoring','semantic_search']),
    (new.id, 'meera', 'Meera', 'Voice Agent',
     'Places AI calls, transcribes, extracts intent.',
     'phone', 'blue', '#3b82f6', 'confirm',
     array['ai_calling','sms_outreach','transcription','sentiment']),
    (new.id, 'kabir', 'Kabir', 'Nurture Writer',
     'Drafts sequences, personalises, A/B tests.',
     'megaphone', 'emerald', '#10b981', 'auto_with_rules',
     array['email_sequences','personalisation','ab_testing','reply_handling']),
    (new.id, 'siddhi', 'Siddhi', 'Performance Marketing Lead',
     'Monitors ROAS across platforms, drafts reallocations.',
     'bar-chart', 'amber', '#f59e0b', 'suggest',
     array['campaign_creation','budget_optimisation','cross_platform','roas'])
  on conflict (user_id, slug) do nothing;

  return new;
end;
$$;

-- Recreate trigger (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── 2. Backfill agents for existing users ───────────────────────────────
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    insert into public.agent_registry
      (user_id, slug, name, role, description, icon, accent, color, autonomy, capabilities)
    values
      (r.id, 'arjun', 'Arjun', 'Outbound SDR',
       'Finds, enriches, and scores leads against your ICP.',
       'search', 'violet', '#8b5cf6', 'suggest',
       array['lead_discovery','enrichment','icp_scoring','semantic_search']),
      (r.id, 'meera', 'Meera', 'Voice Agent',
       'Places AI calls, transcribes, extracts intent.',
       'phone', 'blue', '#3b82f6', 'confirm',
       array['ai_calling','sms_outreach','transcription','sentiment']),
      (r.id, 'kabir', 'Kabir', 'Nurture Writer',
       'Drafts sequences, personalises, A/B tests.',
       'megaphone', 'emerald', '#10b981', 'auto_with_rules',
       array['email_sequences','personalisation','ab_testing','reply_handling']),
      (r.id, 'siddhi', 'Siddhi', 'Performance Marketing Lead',
       'Monitors ROAS across platforms, drafts reallocations.',
       'bar-chart', 'amber', '#f59e0b', 'suggest',
       array['campaign_creation','budget_optimisation','cross_platform','roas'])
    on conflict (user_id, slug) do nothing;
  end loop;
end $$;

-- ─── 3. Notifications table ──────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  body        text,
  kind        text not null default 'info'
                check (kind in ('info','success','warning','error','approval','signal','call','content')),
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at, created_at desc);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own" on public.notifications
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ─── 4. Auto-notify on approvals ─────────────────────────────────────────
create or replace function public.notify_on_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, title, body, kind, link)
    values (
      new.user_id,
      'Approval needed',
      new.action,
      'approval',
      '/approvals'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_approval_insert on public.approvals;
create trigger notify_approval_insert
  after insert on public.approvals
  for each row execute function public.notify_on_approval();

-- ─── 5. Auto-notify on signals ───────────────────────────────────────────
create or replace function public.notify_on_signal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, title, body, kind, link)
    values (
      new.user_id,
      'New signal: ' || new.title,
      coalesce(new.description, new.source),
      'signal',
      '/signals'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_signal_insert on public.signals;
create trigger notify_signal_insert
  after insert on public.signals
  for each row execute function public.notify_on_signal();

-- ─── VERIFY ──────────────────────────────────────────────────────────────
-- select count(*) from public.agent_registry;    -- should be users × 4
-- select count(*) from public.notifications;     -- 0 or higher
