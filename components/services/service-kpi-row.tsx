
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPI {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  accent?: "violet" | "blue" | "emerald" | "amber" | "rose";
}

const ACCENTS = {
  violet: "text-violet-600 dark:text-violet-400",
  blue: "text-blue-600 dark:text-blue-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
} as const;

export function ServiceKPIRow({ kpis }: { kpis: KPI[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const accentClass = ACCENTS[kpi.accent ?? "violet"];
        return (
          <div
            key={kpi.label}
            className="group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-violet-500/10 to-blue-500/5 blur-2xl"
            />
            <Icon className={cn("size-4", accentClass)} />
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </span>
              {kpi.hint && (
                <span className="truncate text-[10px] text-muted-foreground">
                  {kpi.hint}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
