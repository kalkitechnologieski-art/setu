import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentLiveStatus =
  | "idle" | "thinking" | "working"
  | "awaiting_approval" | "error" | "offline";

interface EmployeeStatusProps {
  name: string;
  role: string;
  icon: LucideIcon;
  accent: string;
  status: AgentLiveStatus;
  runsToday?: number;
  pendingApprovals?: number;
  /**
   * Preformatted relative label ("2m ago", "just now").
   * Callers compute this — the component never calls `Date.now()`
   * (react-hooks/purity).
   */
  lastRunLabel?: string | null;
}

const STATUS_LABEL: Record<AgentLiveStatus, string> = {
  idle: "Idle",
  thinking: "Thinking",
  working: "Working",
  awaiting_approval: "Awaiting you",
  error: "Error",
  offline: "Offline",
};

const STATUS_STYLE: Record<AgentLiveStatus, string> = {
  idle: "bg-muted text-muted-foreground",
  thinking: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  working: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  awaiting_approval: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  error: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  offline: "bg-muted/60 text-muted-foreground",
};

export function EmployeeStatus({
  name,
  role,
  icon: Icon,
  accent,
  status,
  runsToday = 0,
  pendingApprovals = 0,
  lastRunLabel,
}: EmployeeStatusProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-40 blur-2xl",
          accent
        )}
      />

      <div className="relative flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
            accent
          )}
        >
          <Icon className="size-5" />
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            STATUS_STYLE[status]
          )}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="relative mt-3">
        <div className="text-sm font-semibold tracking-tight">{name}</div>
        <div className="text-xs text-muted-foreground">{role}</div>
      </div>

      <div className="relative mt-3 flex items-center gap-3 text-xs">
        <span className="tabular-nums">
          <span className="font-semibold">{runsToday}</span>
          <span className="text-muted-foreground"> runs today</span>
        </span>
        {pendingApprovals > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-400">
            {pendingApprovals} pending
          </span>
        )}
      </div>

      {lastRunLabel && (
        <div className="relative mt-2 text-[10px] text-muted-foreground">
          Last run {lastRunLabel}
        </div>
      )}
    </div>
  );
}
