import { Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ApprovalCardProps {
  agentName: string;
  action: string;
  summary: string;
  reasoning?: string;
  confidence?: number;
  accent?: string;
}

export function ApprovalCard({
  agentName, action, summary, reasoning, confidence, accent = "from-violet-500 to-indigo-500",
}: ApprovalCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all hover:shadow-md">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white text-xs font-semibold",
            accent
          )}>
            {agentName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">{action}</div>
            <div className="truncate text-xs text-muted-foreground">
              by {agentName}
            </div>
          </div>
        </div>
        {typeof confidence === "number" && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums">
            {Math.round(confidence * 100)}%
          </span>
        )}
      </header>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {summary}
      </p>

      {reasoning && (
        <details className="mt-2 group/reason">
          <summary className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline">
            <Sparkles className="size-3" />
            Show reasoning
          </summary>
          <p className="mt-1.5 rounded-lg bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground">
            {reasoning}
          </p>
        </details>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" variant="gradient" className="flex-1">
          <Check className="size-4" /> Approve
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          <X className="size-4" /> Reject
        </Button>
      </div>
    </article>
  );
}

