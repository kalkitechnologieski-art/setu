import { Check, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChainStep {
  role: string;
  status: "pending" | "approved" | "rejected" | "skipped";
  decidedAt?: string | null;
}

export interface ApprovalChainItemProps {
  summary: string;
  agentName: string;
  agentGradient: string;
  steps: readonly ChainStep[];
  createdAt: string;
}

function stepIcon(status: ChainStep["status"]) {
  switch (status) {
    case "approved": return <Check className="size-3" />;
    case "rejected": return <X className="size-3" />;
    default:         return <Clock className="size-3" />;
  }
}

export function ApprovalChainItem({
  summary, agentName, agentGradient, steps, createdAt,
}: ApprovalChainItemProps) {
  const currentIdx = steps.findIndex((s) => s.status === "pending");

  return (
    <article className="rounded-2xl border bg-card p-4 transition-all hover:shadow-md hover:shadow-primary/5">
      <header className="flex items-start gap-3">
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white",
          agentGradient
        )}>
          {agentName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium">{summary}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {agentName} · {createdAt}
          </p>
        </div>
      </header>

      <ol className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const isCurrent = i === currentIdx;
          return (
            <li key={`${step.role}-${i}`} className="flex items-center gap-1.5">
              <div className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium",
                step.status === "approved" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                step.status === "rejected" && "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                step.status === "skipped" && "border-border bg-muted text-muted-foreground",
                step.status === "pending" && !isCurrent && "border-border bg-muted text-muted-foreground",
                isCurrent && "border-primary/40 bg-primary/10 text-primary shadow-sm"
              )}>
                {stepIcon(step.status)}
                <span className="whitespace-nowrap">{step.role}</span>
              </div>
              {i < steps.length - 1 && (
                <span className={cn(
                  "h-px w-4 shrink-0",
                  step.status === "approved" ? "bg-emerald-500/40" : "bg-border"
                )} />
              )}
            </li>
          );
        })}
      </ol>
    </article>
  );
}
