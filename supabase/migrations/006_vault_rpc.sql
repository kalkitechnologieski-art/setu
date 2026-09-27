-- ═══════════════════════════════════════════════════════════════════════════
-- Setu Kalki — 006_vault_rpc.sql
-- Authenticated wrappers around Supabase Vault.
--
-- Why wrappers instead of direct Vault access:
--   1. Vault functions live in a separate schema not exposed via PostgREST.
--   2. Every read/write must verify the caller owns the referenced row.
--   3. Centralizing the check means a bug in one caller cannot leak tokens.
--
-- All functions are SECURITY DEFINER with an empty search_path (so callers
-- cannot hijack resolution via a malicious schema).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── store_platform_secret ────────────────────────────────────────────────
-- Creates a Vault secret and links it to a platform_connections row.
-- The caller must own the row.
create or replace function public.store_platform_secret(
  p_connection_id uuid,
  p_kind          text,     -- 'access' | 'refresh'
  p_value         text,
  p_name          text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id  uuid;
  v_secret_id uuid;
  v_owner    uuid;
begin
  -- Caller identity
  v_user_id := (select auth.uid());
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Verify ownership
  select user_id into v_owner
    from public.platform_connections
   where id = p_connection_id;

  if v_owner is null or v_owner <> v_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Create the Vault secret
  v_secret_id := vault.create_secret(p_value, p_name, 'setu:' || p_kind);

  -- Link it
  if p_kind = 'access' then
    update public.platform_connections
       set access_token_secret_id = v_secret_id
     where id = p_connection_id;
  elsif p_kind = 'refresh' then
    update public.platform_connections
       set refresh_token_secret_id = v_secret_id
     where id = p_connection_id;
  else
    raise exception 'invalid_kind' using errcode = '22023';
  end if;

  return v_secret_id;
end;
$$;

-- ─── read_platform_secret ─────────────────────────────────────────────────
-- Returns the decrypted secret for a connection the caller owns.
create or replace function public.read_platform_secret(
  p_connection_id uuid,
  p_kind          text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id   uuid;
  v_owner     uuid;
  v_secret_id uuid;
  v_value     text;
begin
  v_user_id := (select auth.uid());
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select user_id,
         case p_kind
           when 'access'  then access_token_secret_id
           when 'refresh' then refresh_token_secret_id
           else null
         end
    into v_owner, v_secret_id
    from public.platform_connections
   where id = p_connection_id;

  if v_owner is null or v_owner <> v_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_secret_id is null then
    return null;
  end if;

  select decrypted_secret into v_value
    from vault.decrypted_secrets
   where id = v_secret_id;

  return v_value;
end;
$$;

-- ─── delete_platform_secret ───────────────────────────────────────────────
-- Deletes a Vault secret and clears the reference.
create or replace function public.delete_platform_secret(
  p_connection_id uuid,
  p_kind          text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id   uuid;
  v_owner     uuid;
  v_secret_id uuid;
begin
  v_user_id := (select auth.uid());
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select user_id,
         case p_kind
           when 'access'  then access_token_secret_id
           when 'refresh' then refresh_token_secret_id
           else null
         end
    into v_owner, v_secret_id
    from public.platform_connections
   where id = p_connection_id;

  if v_owner is null or v_owner <> v_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;

  if p_kind = 'access' then
    update public.platform_connections
       set access_token_secret_id = null
     where id = p_connection_id;
  elsif p_kind = 'refresh' then
    update public.platform_connections
       set refresh_token_secret_id = null
     where id = p_connection_id;
  end if;
end;
$$;

-- ─── Grant execute to authenticated ───────────────────────────────────────
grant execute on function public.store_platform_secret(uuid, text, text, text) to authenticated;
grant execute on function public.read_platform_secret(uuid, text)               to authenticated;
grant execute on function public.delete_platform_secret(uuid, text)             to authenticated;

-- ─── Index for cron lookups ───────────────────────────────────────────────
create index if not exists platform_connections_expiring_idx
  on public.platform_connections (expires_at)
  where status = 'active' and refresh_token_secret_id is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- Admin variants — used by /api/cron/refresh-tokens
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.admin_read_platform_secret(
  p_connection_id uuid,
  p_kind          text,
  p_user_id       uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role      text;
  v_owner     uuid;
  v_secret_id uuid;
  v_value     text;
begin
  v_role := coalesce(
    (current_setting('request.jwt.claims', true)::json ->> 'role'),
    ''
  );
  if v_role <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select user_id,
         case p_kind
           when 'access'  then access_token_secret_id
           when 'refresh' then refresh_token_secret_id
           else null
         end
    into v_owner, v_secret_id
    from public.platform_connections
   where id = p_connection_id;

  if v_owner is null or v_owner <> p_user_id then return null; end if;
  if v_secret_id is null then return null; end if;

  select decrypted_secret into v_value
    from vault.decrypted_secrets
   where id = v_secret_id;

  return v_value;
end;
$$;

create or replace function public.admin_store_platform_secret(
  p_connection_id uuid,
  p_kind          text,
  p_value         text,
  p_name          text,
  p_user_id       uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role      text;
  v_owner     uuid;
  v_secret_id uuid;
begin
  v_role := coalesce(
    (current_setting('request.jwt.claims', true)::json ->> 'role'),
    ''
  );
  if v_role <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select user_id into v_owner
    from public.platform_connections
   where id = p_connection_id;

  if v_owner is null or v_owner <> p_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_secret_id := vault.create_secret(p_value, p_name, 'setu:' || p_kind);

  if p_kind = 'access' then
    update public.platform_connections
       set access_token_secret_id = v_secret_id
     where id = p_connection_id;
  elsif p_kind = 'refresh' then
    update public.platform_connections
       set refresh_token_secret_id = v_secret_id
     where id = p_connection_id;
  end if;

  return v_secret_id;
end;
$$;

grant execute on function public.admin_read_platform_secret(uuid, text, uuid)              to service_role;
grant execute on function public.admin_store_platform_secret(uuid, text, text, text, uuid) to service_role;
