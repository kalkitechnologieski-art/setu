import { ArrowUpRight, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface OutcomeMetric {
  label: string;
  human: number;
  agent: number;
  unit?: string;
}

interface JointDashboardProps {
  metrics: readonly OutcomeMetric[];
  className?: string;
}

function pct(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

/**
 * The Operations Center's central widget: human + agentic outcomes shown
 * side by side, with a shared scale. Splitting them into two screens loses
 * the point — the value comes from the direct comparison.
 */
export function JointDashboard({ metrics, className }: JointDashboardProps) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5", className)}>
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            Joint workforce outcomes
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Human vs agentic contribution, last 7 days
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <User className="size-3" /> Human
          </span>
          <span className="flex items-center gap-1 text-primary">
            <Bot className="size-3" /> Agent
          </span>
        </div>
      </header>

      <ul className="mt-5 space-y-4">
        {metrics.map((m) => {
          const total = m.human + m.agent;
          const humanPct = pct(m.human, total);
          const agentPct = pct(m.agent, total);
          return (
            <li key={m.label}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium">{m.label}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {total.toLocaleString()}
                  {m.unit ? ` ${m.unit}` : ""}
                </span>
              </div>
              <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-slate-400 to-slate-500"
                  style={{ width: `${humanPct}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-blue-500"
                  style={{ width: `${agentPct}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className="tabular-nums text-muted-foreground">
                  {humanPct.toFixed(0)}% human
                </span>
                <span className="flex items-center gap-0.5 tabular-nums text-primary">
                  {agentPct.toFixed(0)}% agent
                  <ArrowUpRight className="size-2.5" />
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
