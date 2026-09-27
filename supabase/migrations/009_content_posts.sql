-- ═══════════════════════════════════════════════════════════════════════════
-- Setu Kalki — 009_content_posts.sql
-- Content Studio storage — scheduled posts across multiple platforms.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.content_posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null default '',
  body          text not null default '',
  platforms     text[] not null default '{}',
  scheduled_for timestamptz,
  status        text not null default 'draft'
                  check (status in ('draft','pending_approval','scheduled','published','rejected','failed')),
  media_urls    text[] not null default '{}',
  metadata      jsonb not null default '{}'::jsonb,
  approved_by   uuid references public.profiles(id) on delete set null,
  approved_at   timestamptz,
  rejection_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists content_posts_user_idx
  on public.content_posts (user_id, status, scheduled_for desc);

create index if not exists content_posts_scheduled_idx
  on public.content_posts (user_id, scheduled_for)
  where status = 'scheduled' and scheduled_for is not null;

drop trigger if exists content_posts_updated_at on public.content_posts;
create trigger content_posts_updated_at
  before update on public.content_posts
  for each row execute function public.handle_updated_at();

alter table public.content_posts enable row level security;

drop policy if exists "content_posts_select_own" on public.content_posts;
create policy "content_posts_select_own" on public.content_posts
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "content_posts_insert_own" on public.content_posts;
create policy "content_posts_insert_own" on public.content_posts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "content_posts_update_own" on public.content_posts;
create policy "content_posts_update_own" on public.content_posts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "content_posts_delete_own" on public.content_posts;
create policy "content_posts_delete_own" on public.content_posts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'content_posts'
  ) then
    alter publication supabase_realtime add table public.content_posts;
  end if;
end $$;
