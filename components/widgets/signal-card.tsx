import { ArrowUpRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignalCardProps {
  title: string;
  description?: string;
  signalType: string;
  source: string;
  icpScore?: number;
  urgency?: "low" | "medium" | "high" | "critical";
}

const URGENCY_STYLE: Record<NonNullable<SignalCardProps["urgency"]>, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  high: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function SignalCard({
  title, description, signalType, source, icpScore, urgency = "medium",
}: SignalCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              URGENCY_STYLE[urgency]
            )}>
              {urgency}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {source}
            </span>
          </div>
          <div className="mt-1.5 text-sm font-semibold tracking-tight">{title}</div>
        </div>
        {typeof icpScore === "number" && (
          <div className="shrink-0 text-right">
            <div className="text-lg font-semibold tabular-nums">{icpScore}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              ICP
            </div>
          </div>
        )}
      </header>

      {description && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      <footer className="mt-3 flex items-center justify-between">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
          {signalType}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Zap className="size-3" />
          Send to Arjun
          <ArrowUpRight className="size-3" />
        </button>
      </footer>
    </article>
  );
}

