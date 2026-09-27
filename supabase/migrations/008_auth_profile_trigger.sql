-- ═══════════════════════════════════════════════════════════════════════════
-- Setu Kalki — 008_auth_profile_trigger.sql
-- Ensures every new auth.users row gets a matching public.profiles row.
-- Idempotent: safe to run on existing databases.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Profile creation function ─────────────────────────────────────────
-- SECURITY DEFINER + empty search_path: runs with elevated rights and
-- cannot be hijacked by a malicious schema.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email     text;
  v_full_name text;
  v_source    text;
begin
  v_email := coalesce(new.email, '');
  v_full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  v_source := coalesce(new.raw_user_meta_data ->> 'signup_source', 'email');

  insert into public.profiles (id, email, full_name, plan)
  values (new.id, v_email, v_full_name, 'free')
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  return new;
end;
$$;

-- ─── 2. Attach trigger to auth.users ─────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── 3. Backfill: create profiles for existing auth users without them ────
do $$
begin
  insert into public.profiles (id, email, full_name, plan)
  select
    u.id,
    coalesce(u.email, ''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    'free'
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null
  on conflict (id) do nothing;
exception when others then
  raise notice 'backfill skipped: %', sqlerrm;
end $$;

-- ─── 4. RLS: profiles policies must exist for the trigger's inserts ──────
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
