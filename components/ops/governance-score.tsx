import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface GovernanceScoreProps {
  /** 0–100 composite score. */
  score: number;
  humanReviewPct: number;
  costOnBudget: boolean;
  incidents24h: number;
}

export function GovernanceScore({
  score, humanReviewPct, costOnBudget, incidents24h,
}: GovernanceScoreProps) {
  const Icon = score >= 85 ? ShieldCheck : score >= 60 ? Shield : ShieldAlert;
  const tone = score >= 85
    ? "text-emerald-600 dark:text-emerald-400"
    : score >= 60
    ? "text-amber-600 dark:text-amber-400"
    : "text-rose-600 dark:text-rose-400";

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br",
            score >= 85
              ? "from-emerald-500/20 to-emerald-500/0"
              : score >= 60
              ? "from-amber-500/20 to-amber-500/0"
              : "from-rose-500/20 to-rose-500/0",
            tone
          )}>
            <Icon className="size-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Governance score
            </div>
            <div className={cn("text-3xl font-semibold tabular-nums", tone)}>
              {score}
            </div>
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-3 text-center">
        <div>
          <dt className="text-[9px] uppercase tracking-wider text-muted-foreground">
            HITL
          </dt>
          <dd className="text-sm font-semibold tabular-nums">{humanReviewPct}%</dd>
        </div>
        <div>
          <dt className="text-[9px] uppercase tracking-wider text-muted-foreground">
            Budget
          </dt>
          <dd className={cn(
            "text-sm font-semibold",
            costOnBudget ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          )}>
            {costOnBudget ? "On track" : "Over"}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] uppercase tracking-wider text-muted-foreground">
            Incidents
          </dt>
          <dd className={cn(
            "text-sm font-semibold tabular-nums",
            incidents24h > 0 ? "text-amber-600 dark:text-amber-400" : ""
          )}>
            {incidents24h}
          </dd>
        </div>
      </dl>
    </div>
  );
}
