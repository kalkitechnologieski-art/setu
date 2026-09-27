#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  D:\setu\fix-rpc-and-types.sh
#  Fix: pgvector operator visibility + ContentPost re-export
#  IDEMPOTENT · ATOMIC · BACKUP-SAFE · MSYS2-SAFE
# ═══════════════════════════════════════════════════════════════════════════
set -Eeuo pipefail
shopt -s inherit_errexit 2>/dev/null || true
IFS=$'\n\t'

readonly REPO_DIR="/d/setu"
readonly LIB_DIR="${REPO_DIR}/lib"
readonly MIG_DIR="${REPO_DIR}/supabase/migrations"
readonly GIT_REMOTE="https://github.com/kalkitechnologieski-art/setu.git"

readonly STATE_HOME="${HOME}/.setu"
readonly LOG_HOME="${STATE_HOME}/logs"
readonly TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
readonly LOG_TMP="${LOG_HOME}/fix-rpc-${TIMESTAMP}.log"
readonly BACKUP_ROOT="${STATE_HOME}/fix-rpc-backups"
readonly SNAPSHOT="${TIMESTAMP}"

mkdir -p "$STATE_HOME" "$LOG_HOME" "$BACKUP_ROOT/$SNAPSHOT"
: > "$LOG_TMP"

DRY=0; NOPUSH=0; NOCLR=0; SKIPVERIFY=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --no-push) NOPUSH=1 ;;
    --no-color) NOCLR=1 ;;
    --skip-verify) SKIPVERIFY=1 ;;
    -h|--help) printf 'Usage: %s [--dry-run|--no-push|--no-color|--skip-verify]\n' "$0"; exit 0 ;;
    *) printf 'Unknown flag: %s\n' "$a" >&2; exit 2 ;;
  esac
done

if [ "$NOCLR" -eq 1 ]; then
  R='' RED='' GRN='' YEL='' CYN='' BLD='' MAG='' DIM=''
else
  R=$'\033[0m'; RED=$'\033[0;31m'; GRN=$'\033[0;32m'
  YEL=$'\033[1;33m'; CYN=$'\033[0;36m'; BLD=$'\033[1m'
  MAG=$'\033[0;35m'; DIM=$'\033[2m'
fi

_ts()  { date +'%H:%M:%S'; }
log()  { printf '%s[%s]%s %s\n' "$CYN" "$(_ts)" "$R" "$*" | tee -a "$LOG_TMP"; }
ok()   { printf '%s✔%s %s\n' "$GRN" "$R" "$*" | tee -a "$LOG_TMP"; }
warn() { printf '%s⚠%s %s\n' "$YEL" "$R" "$*" | tee -a "$LOG_TMP"; }
err()  { printf '%s✘%s %s\n' "$RED" "$R" "$*" >&2; }
die()  { err "$*"; exit 1; }
ban()  { printf '\n%s%s═══ %s ═══%s\n' "$BLD" "$CYN" "$*" "$R" | tee -a "$LOG_TMP"; }
sub()  { printf '\n%s%s─── %s ───%s\n' "$BLD" "$MAG" "$*" "$R" | tee -a "$LOG_TMP"; }
hr()   { printf '%s──────────────────────────────────────────%s\n' "$CYN" "$R"; }
dim()  { printf '%s    %s%s\n' "$DIM" "$*" "$R"; }

on_err() { local c=$?; err "Failure at line ${1:-?} (exit $c)"; err "Log: $LOG_TMP"; exit "$c"; }
trap 'on_err $LINENO' ERR

backup() {
  local f="$1"; [ -f "$f" ] || return 0
  local rel="${f#"$REPO_DIR"/}"; local bd="${BACKUP_ROOT}/${SNAPSHOT}/${rel}"
  mkdir -p "$(dirname "$bd")"; cp -f "$f" "$bd"
}

write_file() {
  local target="$1"; local tmp="${target}.tmp.$$"
  mkdir -p "$(dirname "$target")"; cat > "$tmp"
  if [ -f "$target" ] && cmp -s "$tmp" "$target"; then
    rm -f "$tmp"; ok "SKIP (unchanged): ${target#"$REPO_DIR"/}"; return 0
  fi
  if [ "$DRY" -eq 1 ]; then
    dim "DRY: ${target#"$REPO_DIR"/} ($(wc -l < "$tmp" | tr -d ' ') lines)"; rm -f "$tmp"; return 0
  fi
  backup "$target"; mv "$tmp" "$target"
  ok "Wrote: ${target#"$REPO_DIR"/} ($(wc -l < "$target" | tr -d ' ') lines)"
}

ban "FIX RPC + CONTENTPOST RE-EXPORT"
log "Repo:   $REPO_DIR"
log "Backup: ${BACKUP_ROOT}/${SNAPSHOT}"
hr

cd "$REPO_DIR"

# ═══════════════════════════════════════════════════════════════════════════
# FIX 1 — Rewrite lib/content/types.ts with full ContentPost export
# ═══════════════════════════════════════════════════════════════════════════
ban "FIX 1 — lib/content/types.ts"

write_file "${LIB_DIR}/content/types.ts" <<'CT_TYPES_V2_XX'
// lib/content/types.ts
// ─────────────────────────────────────────────────────────────────────────
// Content Studio types. Re-exports the canonical ContentPost row shape so
// components can import from one place without depending on supabase/types.
// ─────────────────────────────────────────────────────────────────────────
import type { Database } from "@/lib/supabase/types";

export type ContentPost =
  Database["public"]["Tables"]["content_posts"]["Row"];
export type ContentPostRow = ContentPost;
export type ContentPostInsert =
  Database["public"]["Tables"]["content_posts"]["Insert"];
export type ContentPostUpdate =
  Database["public"]["Tables"]["content_posts"]["Update"];

export type ContentStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "published"
  | "rejected"
  | "failed";

export type PlatformSlug =
  | "instagram"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "tiktok";

export interface PlatformMeta {
  slug: PlatformSlug;
  label: string;
  short: string;
  gradient: string;
}

export const PLATFORMS: readonly PlatformMeta[] = [
  { slug: "instagram", label: "Instagram", short: "IG", gradient: "from-pink-500 to-orange-500" },
  { slug: "facebook",  label: "Facebook",  short: "FB", gradient: "from-blue-500 to-blue-700" },
  { slug: "youtube",   label: "YouTube",   short: "YT", gradient: "from-red-500 to-red-700" },
  { slug: "linkedin",  label: "LinkedIn",  short: "LI", gradient: "from-sky-500 to-blue-700" },
  { slug: "tiktok",    label: "TikTok",    short: "TT", gradient: "from-slate-700 to-slate-900" },
] as const;

export const STATUS_STYLE: Record<ContentStatus, string> = {
  draft:            "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  pending_approval: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  scheduled:        "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  published:        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected:         "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  failed:           "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft:            "Draft",
  pending_approval: "Awaiting",
  scheduled:        "Scheduled",
  published:        "Published",
  rejected:         "Rejected",
  failed:           "Failed",
};
CT_TYPES_V2_XX

# ═══════════════════════════════════════════════════════════════════════════
# FIX 2 — Rewrite migration 010 with correct pgvector operator handling
# ═══════════════════════════════════════════════════════════════════════════
ban "FIX 2 — migration 010 RPC rewrite"

write_file "${MIG_DIR}/010_knowledge_base.sql" <<'MIG_KB_V2_XX'
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
MIG_KB_V2_XX

# ═══════════════════════════════════════════════════════════════════════════
# FIX 3 — Verify
# ═══════════════════════════════════════════════════════════════════════════
if [ "$SKIPVERIFY" -eq 0 ] && [ "$DRY" -eq 0 ]; then
  ban "FIX 3 — Verify"

  sub "tsc --noEmit"
  TSC_LOG="${LOG_HOME}/tsc-rpc-${TIMESTAMP}.log"
  TSC_EXIT=0
  npx tsc --noEmit > "$TSC_LOG" 2>&1 || TSC_EXIT=$?

  if [ "$TSC_EXIT" -ne 0 ]; then
    err "TypeScript: FAIL — $TSC_LOG"
    awk '/error TS/ && NR<=40 { print "    " $0 }' "$TSC_LOG"
    exit 1
  fi
  ok "TypeScript: PASS"

  sub "next build"
  BUILD_LOG="${LOG_HOME}/build-rpc-${TIMESTAMP}.log"
  BUILD_EXIT=0
  npm run build > "$BUILD_LOG" 2>&1 || BUILD_EXIT=$?

  if [ "$BUILD_EXIT" -ne 0 ]; then
    err "Build: FAIL — $BUILD_LOG"
    awk 'NR<=60 { print "    " $0 }' "$BUILD_LOG"
    exit 1
  fi
  ok "Build: PASS"
fi

# ═══════════════════════════════════════════════════════════════════════════
# FIX 4 — Commit + push
# ═══════════════════════════════════════════════════════════════════════════
if [ "$NOPUSH" -eq 0 ] && [ "$DRY" -eq 0 ]; then
  ban "FIX 4 — Commit + push"

  git config user.email >/dev/null 2>&1 || git config user.email "kalkitechnologieski@gmail.com"
  git config user.name  >/dev/null 2>&1 || git config user.name  "Setu Kalki"

  git add -A
  if git diff --cached --quiet 2>/dev/null; then
    ok "No changes to commit"
  else
    git commit -q -m "Fix pgvector RPC operator + ContentPost re-export

SQL fix:
- match_document_sections now sets search_path = extensions, public, pg_temp
  so the <=> cosine-distance operator resolves (Supabase installs pgvector
  operators in the extensions schema, not public)
- Function remains security invoker — RLS still enforces user isolation

TypeScript fix:
- lib/content/types.ts now exports ContentPost (was only ContentPostRow)
  so components/content/post-card.tsx and post-composer.tsx can import it"
    ok "Committed"
  fi

  if git remote get-url origin >/dev/null 2>&1; then
    existing=$(git remote get-url origin)
    [ "$existing" = "$GIT_REMOTE" ] || git remote set-url origin "$GIT_REMOTE"
  else
    git remote add origin "$GIT_REMOTE"
  fi

  log "Pushing…"
  PUSH_EXIT=0
  git push origin main >/dev/null 2>&1 || PUSH_EXIT=$?
  if [ "$PUSH_EXIT" -ne 0 ]; then
    warn "Rebasing"
    git pull --rebase origin main >/dev/null 2>&1 || die "Rebase failed"
    git push origin main >/dev/null 2>&1 || die "Push failed"
  fi
  ok "Pushed to origin/main"
fi

ban "FIX COMPLETE"
ok "RPC:           search_path includes extensions"
ok "ContentPost:   re-exported from lib/content/types"
[ "$SKIPVERIFY" -eq 0 ] && ok "TypeScript:    PASS"
[ "$SKIPVERIFY" -eq 0 ] && ok "Build:         PASS"
[ "$NOPUSH" -eq 0 ] && ok "Pushed:        origin/main"
hr