-- ═══════════════════════════════════════════════════════════════════════════
-- Setu Kalki — 010_knowledge_base.sql
-- User-scoped RAG knowledge base for Siddhi and workers.
-- IDEMPOTENT — safe to run on existing databases.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "vector" with schema extensions;

-- ─── knowledge_bases ──────────────────────────────────────────────────────
create table if not exists public.knowledge_bases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  scope       text not null default 'private'
                check (scope in ('private','shared_with_agents','shared_with_team')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists knowledge_bases_user_idx
  on public.knowledge_bases (user_id, created_at desc);

drop trigger if exists knowledge_bases_updated_at on public.knowledge_bases;
create trigger knowledge_bases_updated_at
  before update on public.knowledge_bases
  for each row execute function public.handle_updated_at();

-- ─── documents ────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id                uuid primary key default gen_random_uuid(),
  knowledge_base_id uuid not null references public.knowledge_bases(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  name              text not null,
  mime_type         text,
  size_bytes        bigint default 0,
  source_url        text,
  status            text not null default 'pending'
                      check (status in ('pending','processing','ready','failed')),
  error_message     text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists documents_kb_idx
  on public.documents (knowledge_base_id, created_at desc);
create index if not exists documents_user_status_idx
  on public.documents (user_id, status);

drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.handle_updated_at();

-- ─── document_sections ────────────────────────────────────────────────────
create table if not exists public.document_sections (
  id          bigserial primary key,
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  embedding   extensions.vector(384),
  chunk_index int not null default 0,
  token_count int default 0,
  created_at  timestamptz not null default now()
);

create index if not exists document_sections_doc_idx
  on public.document_sections (document_id, chunk_index);
create index if not exists document_sections_user_idx
  on public.document_sections (user_id);

-- HNSW index uses vector_cosine_ops — works with the <=> operator
-- (both operator and opclass live in the extensions schema, index creation
-- resolves them via the extension's registration)
create index if not exists document_sections_embedding_idx
  on public.document_sections
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.knowledge_bases   enable row level security;
alter table public.documents         enable row level security;
alter table public.document_sections enable row level security;

drop policy if exists "kb_select_own" on public.knowledge_bases;
create policy "kb_select_own" on public.knowledge_bases
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "kb_insert_own" on public.knowledge_bases;
create policy "kb_insert_own" on public.knowledge_bases
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "kb_update_own" on public.knowledge_bases;
create policy "kb_update_own" on public.knowledge_bases
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "kb_delete_own" on public.knowledge_bases;
create policy "kb_delete_own" on public.knowledge_bases
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
  for update to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "sections_select_own" on public.document_sections;
create policy "sections_select_own" on public.document_sections
  for select to authenticated
  using (
    document_id in (
      select id from public.documents
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "sections_insert_own" on public.document_sections;
create policy "sections_insert_own" on public.document_sections
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "sections_delete_own" on public.document_sections;
create policy "sections_delete_own" on public.document_sections
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- RPC: match_document_sections — RLS-aware semantic search
--
-- CRITICAL: Supabase installs pgvector into the `extensions` schema. The
-- `<=>` cosine-distance operator is registered there too. With an empty
-- search_path, Postgres can resolve the `extensions.vector` TYPE but not the
-- `<=>` OPERATOR → 42883.
--
-- Fix: include `extensions` in the function's search_path so the operator
-- resolves at runtime. Function is `security invoker`, so caller's RLS still
-- applies — the search_path grants no extra permissions.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.match_document_sections(
  query_embedding extensions.vector(384),
  match_threshold float default 0.7,
  match_count     int default 5,
  p_kb_ids        uuid[] default null
)
returns table (
  id          bigint,
  document_id uuid,
  content     text,
  similarity  float
)
language sql
stable
security invoker
set search_path = extensions, public, pg_temp
as $$
  select
    ds.id,
    ds.document_id,
    ds.content,
    1 - (ds.embedding <=> query_embedding) as similarity
  from public.document_sections ds
  join public.documents d on d.id = ds.document_id
  where 1 - (ds.embedding <=> query_embedding) > match_threshold
    and (p_kb_ids is null or d.knowledge_base_id = any(p_kb_ids))
    and d.status = 'ready'
  order by ds.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_document_sections(
  extensions.vector, float, int, uuid[]
) to authenticated;

-- ─── Realtime publication ────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'content_posts'
  ) then
    alter publication supabase_realtime add table public.content_posts;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'documents'
  ) then
    alter publication supabase_realtime add table public.documents;
  end if;
end $$;
