import { cn } from "@/lib/utils";

interface PlatformPace {
  platform: string;
  spend: number;
  budget: number;
}

interface BudgetPacingProps {
  platforms: PlatformPace[];
  totalSpend: number;
  totalBudget: number;
}

const PLATFORM_GRADIENTS: Record<string, string> = {
  meta_ads:    "from-blue-500 to-blue-600",
  facebook:    "from-blue-500 to-blue-600",
  instagram:   "from-pink-500 to-orange-500",
  google_ads:  "from-emerald-500 to-teal-500",
  youtube:     "from-red-500 to-red-700",
  tiktok_ads:  "from-slate-700 to-slate-900",
};

function gradientFor(platform: string): string {
  return PLATFORM_GRADIENTS[platform] ?? "from-violet-500 to-blue-500";
}

export function BudgetPacing({
  platforms,
  totalSpend,
  totalBudget,
}: BudgetPacingProps) {
  const totalPct = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight">Budget Pacing</h2>
        <p className="text-[10px] text-muted-foreground">
          Current month — 30-day rolling window
        </p>
      </header>

      <ul className="space-y-4">
        {platforms.map((p) => {
          const pct = p.budget > 0 ? (p.spend / p.budget) * 100 : 0;
          return (
            <li key={p.platform}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-xs font-medium capitalize">
                  {p.platform.replace("_", " ")}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  ₹{p.spend.toLocaleString()} / ₹{p.budget.toLocaleString()} · {pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                    gradientFor(p.platform)
                  )}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 border-t pt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total
          </span>
          <span className="text-xs font-semibold tabular-nums">
            ₹{totalSpend.toLocaleString()} / ₹{totalBudget.toLocaleString()} · {totalPct.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 transition-all duration-500"
            style={{ width: `${Math.min(100, totalPct)}%` }}
          />
        </div>
      </div>
    </section>
  );
}
