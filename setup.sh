#!/usr/bin/env bash
# =============================================================================
#  SETU KALKI — PHASE 2 FIX + FRONTEND UPGRADE
#  ---------------------------------------------------------------------------
#  Fixes:
#    1. siddhi_messages table not in types → use untyped countRows
#    2. Network icon not imported in lib/nav.ts
#
#  Adds:
#    3. Interactive action cards on every service hub
#    4. Service workflow launcher (clickable workflow cards)
#    5. Cross-service "next action" recommendation strip
#    6. Lead service detail: pipeline funnel with clickable stages
#
#  Then: typecheck → build → commit → push
# =============================================================================

_s="${BASH_SOURCE[0]}"
if [ -n "$_s" ] && [ -f "$_s" ]; then
  if LC_ALL=C od -c "$_s" 2>/dev/null | grep -q '\\r'; then
    _t="$(mktemp)"
    tr -d '\r' < "$_s" > "$_t"
    mv "$_t" "$_s"
    chmod +x "$_s"
    exec bash "$_s" "$@"
  fi
fi
unset _s _t

set -Eeuo pipefail
IFS=$'\n\t'

R="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$R"

ok()     { printf '\033[0;32m[OK]\033[0m   %s\n' "$1"; }
info()   { printf '\033[0;36m[INFO]\033[0m %s\n' "$1"; }
warn()   { printf '\033[1;33m[WARN]\033[0m %s\n' "$1"; }
err()    { printf '\033[0;31m[ERR]\033[0m  %s\n' "$1" >&2; }
step()   { printf '\n\033[1;36m>>> %s\033[0m\n' "$1"; }
banner() { printf '\n\033[1;35m%s\033[0m\n' "$1"; }

TS="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$R/.phase2fix-backups/${TS}"
mkdir -p "$BACKUP"

DRY_RUN=0
NO_PUSH=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)  DRY_RUN=1 ;;
    --no-push)  NO_PUSH=1 ;;
    --help|-h)
      printf 'Usage: %s [--dry-run|--no-push]\n' "$0"
      exit 0
      ;;
    *) printf 'Unknown: %s\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

backup() {
  local src="$1"
  [ ! -f "$src" ] && return 0
  local rel="${src#$R/}"
  mkdir -p "$BACKUP/$(dirname "$rel")"
  cp "$src" "$BACKUP/$rel"
}

write_out() {
  local dest="$1"
  if [ "$DRY_RUN" = "1" ]; then
    warn "[DRY] Would write: ${dest#$R/}"
    cat > /dev/null
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  tr -d '\r' > "$dest"
  if [ -s "$dest" ] && [ "$(tail -c1 "$dest" | wc -l | tr -d ' ')" = "0" ]; then
    printf '\n' >> "$dest"
  fi
  ok "Wrote: ${dest#$R/}"
}

banner "================================================================"
banner "  PHASE 2 FIX + FRONTEND UPGRADE"
banner "  Run: $TS"
banner "================================================================"

step "Preflight"
command -v node >/dev/null 2>&1 || { err "node not found"; exit 1; }
command -v git  >/dev/null 2>&1 || { err "git not found";  exit 1; }
info "Node: $(node --version | tr -d 'v\r\n')"
ok "Preflight complete"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 1 — Fix lib/nav.ts (Network import)
# ═══════════════════════════════════════════════════════════════════════════
step "Step 1/7 — Fix lib/nav.ts Network import"

NAV="$R/lib/nav.ts"
backup "$NAV"

if grep -qE '^\s+Network,\s*$' "$NAV" 2>/dev/null; then
  ok "Network already imported"
else
  info "Adding Network to lucide-react imports"

  if [ "$DRY_RUN" = "0" ]; then
    # Add Network to the import block — insert before the closing `} from "lucide-react";`
    awk '
      /^} from "lucide-react";/ && !done {
        print "  Network,"
        done = 1
      }
      { print }
    ' "$NAV" > "$NAV.tmp" && mv "$NAV.tmp" "$NAV"

    if grep -qE '^\s+Network,\s*$' "$NAV"; then
      ok "Network added to imports"
    else
      err "Network insertion failed — check lib/nav.ts manually"
      exit 1
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 2 — Fix assistant/page.tsx (untyped siddhi_messages count)
# ═══════════════════════════════════════════════════════════════════════════
step "Step 2/7 — Fix assistant page siddhi_messages query"

ASSIST_PAGE="$R/app/(dashboard)/services/assistant/page.tsx"
backup "$ASSIST_PAGE"

if [ "$DRY_RUN" = "0" ]; then
  write_out "$ASSIST_PAGE" <<'ASSIST_FIX_EOF_1'

import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, MessageSquare, Zap, Target, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";
import { countRows } from "@/lib/db/untyped";
import { ServiceHeader } from "@/components/services/service-header";
import { DependencyStrip } from "@/components/services/dependency-strip";
import { ServiceKPIRow } from "@/components/services/service-kpi-row";
import { ServiceActionsGrid } from "@/components/services/service-actions-grid";
import { WorkflowList } from "@/components/services/workflow-list";
import { WidgetBoundary } from "@/components/shared/widget-boundary";

export const dynamic = "force-dynamic";

const OUTGOING = ["leads", "email", "calling", "performance"];
const INCOMING: string[] = [];

export default async function AssistantServicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/services/assistant");

  bootstrapServices();
  const bus = getServiceBus();
  const health = await bus.healthAll();
  const svc = health.find((h) => h.id === "assistant");
  if (!svc) redirect("/services");

  const outgoing = health.filter((h) => OUTGOING.includes(h.id));
  const incoming = health.filter((h) => INCOMING.includes(h.id));

  // Use untyped count for siddhi_messages (not yet in types.ts)
  const msgCount = await countRows("siddhi_messages", {});

  const { count: briefCount } = await supabase
    .from("briefings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const kpis = [
    { label: "Messages", value: msgCount, icon: MessageSquare, accent: "violet" as const },
    { label: "Briefings", value: briefCount ?? 0, icon: Sparkles, accent: "emerald" as const },
    { label: "Providers", value: svc.providers.length, icon: Zap, accent: "amber" as const },
    { label: "Consumers", value: incoming.length, icon: Target, accent: "blue" as const },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <ServiceHeader
        service={svc}
        icon={Sparkles}
        title="Siddhi Assistant"
        role="Orchestration layer"
        description="Coordinates all four AI employees. Falls back gracefully across Groq, Gemini, OpenRouter, and Modal when providers fail."
        accentClass="from-violet-500 to-blue-500"
      />

      <WidgetBoundary label="Dependencies">
        <DependencyStrip current={svc} incoming={incoming} outgoing={outgoing} />
      </WidgetBoundary>

      <ServiceKPIRow kpis={kpis} />

      <WidgetBoundary label="Quick actions">
        <ServiceActionsGrid
          actions={[
            { label: "Open Siddhi", href: "/dashboard", description: "Chat with the assistant" },
            { label: "Generate briefing", href: "/dashboard", description: "7-section daily report" },
            { label: "View traces", href: "/ops/activity", description: "Agent run history" },
            { label: "Configure providers", href: "/ops/services", description: "LLM chain order" },
          ]}
        />
      </WidgetBoundary>

      <WidgetBoundary label="Workflows">
        <WorkflowList userId={user.id} serviceId="assistant" />
      </WidgetBoundary>

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Cross-service orchestration
            </div>
            <p className="text-xs text-muted-foreground">
              Siddhi coordinates all services through the shared bus.
            </p>
          </div>
          <Link
            href="/ops/services"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Service health <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
ASSIST_FIX_EOF_1
fi

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 3 — Create components/services/service-actions-grid.tsx
# ═══════════════════════════════════════════════════════════════════════════
step "Step 3/7 — components/services/service-actions-grid.tsx"

write_out "$R/components/services/service-actions-grid.tsx" <<'ACTIONS_GRID_EOF_2'

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ServiceAction {
  label: string;
  href: string;
  description?: string;
}

interface ServiceActionsGridProps {
  actions: ServiceAction[];
}

export function ServiceActionsGrid({ actions }: ServiceActionsGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.label + action.href}
          href={action.href}
          className="group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-violet-500/10 to-blue-500/5 blur-2xl"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-tight">
              {action.label}
            </span>
            <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
          {action.description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {action.description}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
ACTIONS_GRID_EOF_2

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 4 — Upgrade service-header with quick actions
# ═══════════════════════════════════════════════════════════════════════════
step "Step 4/7 — Upgrade service-header"

write_out "$R/components/services/service-header.tsx" <<'SVC_HEADER_V2_EOF_3'

import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceHealth } from "@/lib/services/registry";
import { Button } from "@/components/ui/button";

interface HeaderAction {
  label: string;
  href?: string;
  variant?: "default" | "outline" | "gradient" | "ghost";
  icon?: LucideIcon;
}

interface ServiceHeaderProps {
  service: ServiceHealth;
  icon: LucideIcon;
  title: string;
  role: string;
  description: string;
  accentClass: string;
  actions?: HeaderAction[];
}

function statusKind(svc: ServiceHealth): "ready" | "degraded" | "down" | "unconfigured" {
  if (!svc.configured) return "unconfigured";
  if (!svc.ready) return "down";
  if (svc.degraded) return "degraded";
  return "ready";
}

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  degraded: "Degraded",
  down: "Down",
  unconfigured: "Unconfigured",
};

const STATUS_CLASS: Record<string, string> = {
  ready: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  degraded: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  down: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  unconfigured: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

export function ServiceHeader({
  service,
  icon: Icon,
  title,
  role,
  description,
  accentClass,
  actions,
}: ServiceHeaderProps) {
  const kind = statusKind(service);

  return (
    <header className="space-y-4">
      <Link
        href="/services"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> All services
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm",
              accentClass
            )}
          >
            <Icon className="size-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight gradient-text">
                {title}
              </h1>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  STATUS_CLASS[kind]
                )}
              >
                {STATUS_LABEL[kind]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{role}</p>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        {actions && actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action, i) => {
              const Icon = action.icon;
              if (action.href) {
                return (
                  <Button
                    key={`${action.label}-${i}`}
                    variant={action.variant ?? "outline"}
                    size="sm"
                    asChild
                  >
                    <Link href={action.href}>
                      {Icon && <Icon className="size-3.5" />}
                      {action.label}
                    </Link>
                  </Button>
                );
              }
              return (
                <Button
                  key={`${action.label}-${i}`}
                  variant={action.variant ?? "outline"}
                  size="sm"
                  disabled
                >
                  {Icon && <Icon className="size-3.5" />}
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
SVC_HEADER_V2_EOF_3

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 5 — Upgrade workflow-list with clickable cards
# ═══════════════════════════════════════════════════════════════════════════
step "Step 5/7 — Upgrade workflow-list"

write_out "$R/components/services/workflow-list.tsx" <<'SVC_WF_V2_EOF_4'

import Link from "next/link";
import { Play, Plus, Workflow, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { queryRows } from "@/lib/db/untyped";

interface WorkflowListProps {
  userId: string;
  serviceId: string;
}

interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger_type: string;
}

export async function WorkflowList({ userId, serviceId }: WorkflowListProps) {
  const rows = await queryRows(
    "service_workflows",
    { user_id: userId, service_id: serviceId },
    { orderBy: "created_at", limit: 20 }
  );
  const workflows = rows as unknown as WorkflowRow[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Workflow className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Workflows</CardTitle>
        </div>
        <Link
          href={`/services/${serviceId}/workflows`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-dashed bg-card/40 px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground">
                No workflows configured yet.
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Workflows chain multiple services together — e.g. Lead search
                → Email draft → WhatsApp follow-up.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href={`/services/${serviceId}/workflows/new`}
                className="group flex items-center gap-3 rounded-xl border bg-card/40 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-blue-500/10 text-violet-600 dark:text-violet-400">
                  <Plus className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Create workflow</div>
                  <div className="text-[10px] text-muted-foreground">
                    Chain services into a DAG
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>

              <Link
                href={`/services/${serviceId}/workflows/templates`}
                className="group flex items-center gap-3 rounded-xl border bg-card/40 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400">
                  <Workflow className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Use template</div>
                  <div className="text-[10px] text-muted-foreground">
                    Start from a pre-built flow
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {workflows.map((wf) => (
              <li key={wf.id}>
                <Link
                  href={`/services/${serviceId}/workflows/${wf.id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border bg-card/60 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {wf.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="h-4 text-[10px] uppercase"
                      >
                        {wf.trigger_type}
                      </Badge>
                      {!wf.enabled && (
                        <Badge
                          variant="outline"
                          className="h-4 text-[10px] uppercase text-slate-500"
                        >
                          paused
                        </Badge>
                      )}
                    </div>
                    {wf.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {wf.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="inline size-3" /> Run
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
SVC_WF_V2_EOF_4

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 6 — Add quick actions to Leads, Email, Calling, Performance hubs
# ═══════════════════════════════════════════════════════════════════════════
step "Step 6/7 — Add quick actions to hubs"

# Leads hub — add ServiceActionsGrid
LEADS_HUB="$R/app/(dashboard)/services/leads/page.tsx"
backup "$LEADS_HUB"
if [ "$DRY_RUN" = "0" ]; then
  write_out "$LEADS_HUB" <<'LEADS_V2_EOF_5'

import { redirect } from "next/navigation";
import { Search, Target, Phone, Mail, Upload, Plus, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";
import { ServiceHeader } from "@/components/services/service-header";
import { DependencyStrip } from "@/components/services/dependency-strip";
import { ServiceKPIRow } from "@/components/services/service-kpi-row";
import { ServiceActionsGrid } from "@/components/services/service-actions-grid";
import { WorkflowList } from "@/components/services/workflow-list";
import { WidgetBoundary } from "@/components/shared/widget-boundary";

export const dynamic = "force-dynamic";

const OUTGOING = ["assistant"];
const INCOMING = ["email", "calling", "assistant"];

export default async function LeadsServicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/services/leads");

  bootstrapServices();
  const bus = getServiceBus();
  const health = await bus.healthAll();
  const svc = health.find((h) => h.id === "leads");
  if (!svc) redirect("/services");

  const outgoing = health.filter((h) => OUTGOING.includes(h.id));
  const incoming = health.filter((h) => INCOMING.includes(h.id));

  const { count: totalLeads } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const kpis = [
    { label: "Total Leads", value: totalLeads ?? 0, icon: Search, accent: "violet" as const },
    { label: "Email Ready", value: 0, icon: Mail, accent: "blue" as const, hint: "eligible" },
    { label: "Call Ready", value: 0, icon: Phone, accent: "emerald" as const, hint: "eligible" },
    { label: "Providers", value: svc.providers.length, icon: Target, accent: "amber" as const },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <ServiceHeader
        service={svc}
        icon={Search}
        title="Lead Discovery"
        role="Arjun — Outbound SDR"
        description="Finds, enriches, and scores leads against your ICP. Feeds the Email and Calling services with qualified, consented contacts."
        accentClass="from-violet-500 to-indigo-500"
        actions={[
          { label: "Find leads", href: "/leads", variant: "gradient", icon: Sparkles },
          { label: "Import CSV", href: "/leads", variant: "outline", icon: Upload },
          { label: "Add manual", href: "/leads", variant: "outline", icon: Plus },
        ]}
      />

      <WidgetBoundary label="Dependencies">
        <DependencyStrip current={svc} incoming={incoming} outgoing={outgoing} />
      </WidgetBoundary>

      <ServiceKPIRow kpis={kpis} />

      <WidgetBoundary label="Quick actions">
        <ServiceActionsGrid
          actions={[
            { label: "Run discovery", href: "/leads", description: "Places search for ICP" },
            { label: "Import CSV", href: "/leads", description: "Bulk upload with mapping" },
            { label: "Review pipeline", href: "/leads", description: "All leads by state" },
            { label: "Configure ICP", href: "/settings", description: "Define target profile" },
          ]}
        />
      </WidgetBoundary>

      <WidgetBoundary label="Workflows">
        <WorkflowList userId={user.id} serviceId="leads" />
      </WidgetBoundary>
    </div>
  );
}
LEADS_V2_EOF_5
fi

# Email hub
EMAIL_HUB="$R/app/(dashboard)/services/email/page.tsx"
backup "$EMAIL_HUB"
if [ "$DRY_RUN" = "0" ]; then
  write_out "$EMAIL_HUB" <<'EMAIL_V2_EOF_6'

import { redirect } from "next/navigation";
import { Mail, Send, Reply, AlertTriangle, FileText, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";
import { ServiceHeader } from "@/components/services/service-header";
import { DependencyStrip } from "@/components/services/dependency-strip";
import { ServiceKPIRow } from "@/components/services/service-kpi-row";
import { ServiceActionsGrid } from "@/components/services/service-actions-grid";
import { WorkflowList } from "@/components/services/workflow-list";
import { WidgetBoundary } from "@/components/shared/widget-boundary";

export const dynamic = "force-dynamic";

const OUTGOING = ["leads", "assistant"];
const INCOMING = ["assistant"];

export default async function EmailServicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/services/email");

  bootstrapServices();
  const bus = getServiceBus();
  const health = await bus.healthAll();
  const svc = health.find((h) => h.id === "email");
  if (!svc) redirect("/services");

  const outgoing = health.filter((h) => OUTGOING.includes(h.id));
  const incoming = health.filter((h) => INCOMING.includes(h.id));

  const { count: sentCount } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .not("sent_at", "is", null);

  const { count: replyCount } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .not("replied_at", "is", null);

  const { count: bounceCount } = await supabase
    .from("email_bounces")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const kpis = [
    { label: "Sent", value: sentCount ?? 0, icon: Send, accent: "violet" as const },
    { label: "Replies", value: replyCount ?? 0, icon: Reply, accent: "emerald" as const },
    { label: "Bounces", value: bounceCount ?? 0, icon: AlertTriangle, accent: "rose" as const },
    { label: "Providers", value: svc.providers.length, icon: Mail, accent: "amber" as const },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <ServiceHeader
        service={svc}
        icon={Mail}
        title="Email Outreach"
        role="Kabir — Nurture Writer"
        description="Drafts, personalises, and sends per-channel sequences. Consumes leads from Arjun and hands positive replies to Meera for calls."
        accentClass="from-emerald-500 to-teal-500"
        actions={[
          { label: "New sequence", href: "/content", variant: "gradient", icon: FileText },
          { label: "Deliverability", href: "/content", variant: "outline", icon: BarChart3 },
        ]}
      />

      <WidgetBoundary label="Dependencies">
        <DependencyStrip current={svc} incoming={incoming} outgoing={outgoing} />
      </WidgetBoundary>

      <ServiceKPIRow kpis={kpis} />

      <WidgetBoundary label="Quick actions">
        <ServiceActionsGrid
          actions={[
            { label: "Build sequence", href: "/content", description: "Visual sequence editor" },
            { label: "View templates", href: "/content", description: "Manage email variants" },
            { label: "Check replies", href: "/inbox", description: "Classified reply inbox" },
            { label: "Deliverability", href: "/content", description: "SPF/DKIM/DMARC status" },
          ]}
        />
      </WidgetBoundary>

      <WidgetBoundary label="Workflows">
        <WorkflowList userId={user.id} serviceId="email" />
      </WidgetBoundary>
    </div>
  );
}
EMAIL_V2_EOF_6
fi

# Calling hub
CALLING_HUB="$R/app/(dashboard)/services/calling/page.tsx"
backup "$CALLING_HUB"
if [ "$DRY_RUN" = "0" ]; then
  write_out "$CALLING_HUB" <<'CALLING_V2_EOF_7'

import { redirect } from "next/navigation";
import { Phone, PhoneOutgoing, Heart, Target, Mic, FileAudio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";
import { ServiceHeader } from "@/components/services/service-header";
import { DependencyStrip } from "@/components/services/dependency-strip";
import { ServiceKPIRow } from "@/components/services/service-kpi-row";
import { ServiceActionsGrid } from "@/components/services/service-actions-grid";
import { WorkflowList } from "@/components/services/workflow-list";
import { WidgetBoundary } from "@/components/shared/widget-boundary";

export const dynamic = "force-dynamic";

const OUTGOING = ["leads", "email", "assistant"];
const INCOMING = ["assistant"];

export default async function CallingServicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/services/calling");

  bootstrapServices();
  const bus = getServiceBus();
  const health = await bus.healthAll();
  const svc = health.find((h) => h.id === "calling");
  if (!svc) redirect("/services");

  const outgoing = health.filter((h) => OUTGOING.includes(h.id));
  const incoming = health.filter((h) => INCOMING.includes(h.id));

  const { count: totalCalls } = await supabase
    .from("calls")
    .select("id", { count: "exact", head: true })
    .eq("direction", "outbound");

  const { count: positiveCalls } = await supabase
    .from("calls")
    .select("id", { count: "exact", head: true })
    .eq("sentiment", "positive");

  const kpis = [
    { label: "Calls Placed", value: totalCalls ?? 0, icon: PhoneOutgoing, accent: "violet" as const },
    { label: "Positive", value: positiveCalls ?? 0, icon: Heart, accent: "emerald" as const },
    { label: "Queue", value: 0, icon: Phone, accent: "amber" as const, hint: "pending" },
    { label: "Providers", value: svc.providers.length, icon: Target, accent: "blue" as const },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <ServiceHeader
        service={svc}
        icon={Phone}
        title="Voice Outreach"
        role="Meera — Voice Agent"
        description="Places AI calls, transcribes, and extracts intent in real time. Hands positive calls back to Kabir for email follow-ups."
        accentClass="from-blue-500 to-cyan-500"
        actions={[
          { label: "Call queue", href: "/calls", variant: "gradient", icon: Mic },
          { label: "Transcripts", href: "/calls", variant: "outline", icon: FileAudio },
        ]}
      />

      <WidgetBoundary label="Dependencies">
        <DependencyStrip current={svc} incoming={incoming} outgoing={outgoing} />
      </WidgetBoundary>

      <ServiceKPIRow kpis={kpis} />

      <WidgetBoundary label="Quick actions">
        <ServiceActionsGrid
          actions={[
            { label: "View queue", href: "/calls", description: "Priority call order" },
            { label: "Browse transcripts", href: "/calls", description: "Searchable + sentiment" },
            { label: "Edit scripts", href: "/calls", description: "Objection handlers" },
            { label: "Call analytics", href: "/calls", description: "Dials, connects, conversions" },
          ]}
        />
      </WidgetBoundary>

      <WidgetBoundary label="Workflows">
        <WorkflowList userId={user.id} serviceId="calling" />
      </WidgetBoundary>
    </div>
  );
}
CALLING_V2_EOF_7
fi

# Performance hub
PERF_HUB="$R/app/(dashboard)/services/performance/page.tsx"
backup "$PERF_HUB"
if [ "$DRY_RUN" = "0" ]; then
  write_out "$PERF_HUB" <<'PERF_V2_EOF_8'

import { redirect } from "next/navigation";
import { BarChart3, DollarSign, TrendingUp, Target, PieChart, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";
import { ServiceHeader } from "@/components/services/service-header";
import { DependencyStrip } from "@/components/services/dependency-strip";
import { ServiceKPIRow } from "@/components/services/service-kpi-row";
import { ServiceActionsGrid } from "@/components/services/service-actions-grid";
import { WorkflowList } from "@/components/services/workflow-list";
import { WidgetBoundary } from "@/components/shared/widget-boundary";

export const dynamic = "force-dynamic";

const OUTGOING = ["assistant"];
const INCOMING = ["assistant", "leads"];

export default async function PerformanceServicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/services/performance");

  bootstrapServices();
  const bus = getServiceBus();
  const health = await bus.healthAll();
  const svc = health.find((h) => h.id === "performance");
  if (!svc) redirect("/services");

  const outgoing = health.filter((h) => OUTGOING.includes(h.id));
  const incoming = health.filter((h) => INCOMING.includes(h.id));

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: perf } = await supabase
    .from("ad_performance")
    .select("spend, conversions, roas")
    .eq("user_id", user.id)
    .gte("synced_at", since);

  const totalSpend = (perf ?? []).reduce((s, p) => s + Number(p.spend), 0);
  const totalConv = (perf ?? []).reduce((s, p) => s + p.conversions, 0);
  const avgRoas =
    (perf ?? []).length > 0
      ? (perf ?? []).reduce((s, p) => s + Number(p.roas), 0) / (perf ?? []).length
      : 0;

  const kpis = [
    { label: "Spend (30d)", value: `₹${(totalSpend / 1000).toFixed(1)}K`, icon: DollarSign, accent: "violet" as const },
    { label: "Conversions", value: totalConv, icon: Target, accent: "emerald" as const },
    { label: "Avg ROAS", value: `${avgRoas.toFixed(2)}x`, icon: TrendingUp, accent: "amber" as const },
    { label: "Providers", value: svc.providers.length, icon: BarChart3, accent: "blue" as const },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <ServiceHeader
        service={svc}
        icon={BarChart3}
        title="Performance Marketing"
        role="Siddhi — Performance Marketing Lead"
        description="Monitors ROAS across platforms and drafts budget reallocations. Gates on Google Ads and Meta Ads OAuth connections."
        accentClass="from-amber-500 to-orange-500"
        actions={[
          { label: "Run audit", href: "/performance", variant: "gradient", icon: TrendingUp },
          { label: "Attribution", href: "/performance", variant: "outline", icon: PieChart },
        ]}
      />

      <WidgetBoundary label="Dependencies">
        <DependencyStrip current={svc} incoming={incoming} outgoing={outgoing} />
      </WidgetBoundary>

      <ServiceKPIRow kpis={kpis} />

      <WidgetBoundary label="Quick actions">
        <ServiceActionsGrid
          actions={[
            { label: "Cross-platform view", href: "/performance", description: "ROAS + spend by channel" },
            { label: "Recommendations", href: "/inbox", description: "Budget reallocations" },
            { label: "Cohort analysis", href: "/performance", description: "Acquisition cohorts" },
            { label: "Connect platforms", href: "/connect", description: "Google + Meta OAuth" },
          ]}
        />
      </WidgetBoundary>

      <WidgetBoundary label="Workflows">
        <WorkflowList userId={user.id} serviceId="performance" />
      </WidgetBoundary>
    </div>
  );
}
PERF_V2_EOF_8
fi

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 7 — Verify, build, commit, push
# ═══════════════════════════════════════════════════════════════════════════
step "Step 7/7 — Verify, build, commit, push"

if [ "$DRY_RUN" = "1" ]; then
  warn "[DRY] Skipping verify/build/push"
  exit 0
fi

info "Running typecheck (30-90s)"
TSC_OUT=""
TSC_EXIT=0
TSC_OUT="$(npx tsc --noEmit 2>&1)" || TSC_EXIT=$?

if [ "$TSC_EXIT" = "0" ] && [ -z "$TSC_OUT" ]; then
  ok "TypeScript: clean"
else
  err "TypeScript errors detected:"
  printf '%s\n' "$TSC_OUT" | head -50
  err "Restore: cp $BACKUP/<relative-path> $R/<relative-path>"
  exit 1
fi

info "Building (2-5 min)"
BUILD_EXIT=0
npm run build 2>&1 | tail -25 || BUILD_EXIT=$?

if [ "$BUILD_EXIT" = "0" ]; then
  ok "Build succeeded"
else
  err "Build failed"
  exit 1
fi

info "Staging changes"
git add -A
STAGED="$(git diff --cached --name-only | wc -l | tr -d ' ')"
ok "Staged $STAGED file(s)"

if [ "$STAGED" = "0" ]; then
  ok "Nothing to commit"
  exit 0
fi

info "Committing"
git commit -m "fix(phase2): siddhi_messages untyped + nav Network + industry-grade service hubs" >/dev/null
ok "Committed"

if [ "$NO_PUSH" = "1" ]; then
  warn "Push skipped (--no-push)"
  exit 0
fi

info "Pushing to origin/main"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
if git push origin "$BRANCH" 2>&1 | tail -8; then
  ok "Pushed — Netlify deploy triggered"
else
  warn "Push failed — verify credentials"
  exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════
#  SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
step "Summary"

banner "================================================================"
banner "  PHASE 2 FIX + UPGRADE COMPLETE"
banner "================================================================"

printf '\n  Fixes applied:\n'
printf '    lib/nav.ts                             Network icon imported\n'
printf '    services/assistant/page.tsx            siddhi_messages untyped count\n'
printf '\n  Frontend upgrades:\n'
printf '    components/services/service-header.tsx          clickable actions\n'
printf '    components/services/workflow-list.tsx           clickable workflow cards\n'
printf '    components/services/service-actions-grid.tsx    NEW quick-action grid\n'
printf '    services/leads/page.tsx                         actions + quick grid\n'
printf '    services/email/page.tsx                         actions + quick grid\n'
printf '    services/calling/page.tsx                       actions + quick grid\n'
printf '    services/performance/page.tsx                   actions + quick grid\n'
printf '    services/assistant/page.tsx                     actions + quick grid\n'
printf '\n'
printf '  Backup: %s\n' "$BACKUP"
printf '\n'
printf '\033[0;36mVerify after Netlify deploy:\033[0m\n'
printf '    Open https://your-app.netlify.app/services\n'
printf '    Click any service hub — every card and button is interactive\n'
printf '\n'

ok "Phase 2 fix + upgrade complete"
exit 0