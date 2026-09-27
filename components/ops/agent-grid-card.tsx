import {
  BarChart3, Megaphone, Phone, Search, Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { agentGradient } from "@/lib/ops/design";

const ICONS: Record<string, LucideIcon> = {
  search: Search,
  phone: Phone,
  megaphone: Megaphone,
  "bar-chart": BarChart3,
  sparkles: Sparkles,
};

export interface AgentGridCardProps {
  slug: string;
  name: string;
  role: string;
  description?: string | null;
  icon: string;
  autonomy: string;
  status: string;
  runsToday?: number;
  costTodayUsd?: number;
  pendingApprovals?: number;
}

export function AgentGridCard({
  slug, name, role, description, icon, autonomy, status,
  runsToday = 0, costTodayUsd = 0, pendingApprovals = 0,
}: AgentGridCardProps) {
  const Icon = ICONS[icon] ?? Sparkles;
  const gradient = agentGradient(slug);
  const working = status === "active" && runsToday > 0;

  return (
    <article className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <div className={cn(
        "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-40 blur-2xl",
        gradient
      )} />

      <header className="relative flex items-start justify-between">
        <div className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
          gradient
        )}>
          <Icon className="size-5" />
          {working && (
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          status === "active"
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : status === "paused"
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            : "bg-muted text-muted-foreground"
        )}>
          {status}
        </span>
      </header>

      <div className="relative mt-4">
        <h3 className="text-sm font-semibold tracking-tight">{name}</h3>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>

      {description && (
        <p className="relative mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      <div className="relative mt-4 grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-2.5 text-center">
        <div>
          <div className="text-sm font-semibold tabular-nums">{runsToday}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Runs</div>
        </div>
        <div>
          <div className="text-sm font-semibold tabular-nums">
            ${costTodayUsd.toFixed(2)}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Cost</div>
        </div>
        <div>
          <div className={cn(
            "text-sm font-semibold tabular-nums",
            pendingApprovals > 0 && "text-amber-600 dark:text-amber-400"
          )}>
            {pendingApprovals}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Queue</div>
        </div>
      </div>

      <footer className="relative mt-3 flex items-center justify-between text-[10px]">
        <span className="rounded-full bg-muted px-2 py-0.5 font-mono">
          {autonomy}
        </span>
        <a
          href={`/ops/registry/${slug}`}
          className="font-medium text-primary hover:underline"
        >
          Open →
        </a>
      </footer>
    </article>
  );
}
