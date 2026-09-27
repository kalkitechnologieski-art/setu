import {
  ArrowDownRight,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  icon: LucideIcon;
  accent?: "violet" | "blue" | "emerald" | "amber";
  hint?: string;
}

const ACCENTS = {
  violet: {
    ring: "from-violet-500/20 to-violet-500/0",
    text: "text-violet-600 dark:text-violet-400",
    glow: "from-violet-500/20 via-transparent to-transparent",
  },
  blue: {
    ring: "from-blue-500/20 to-blue-500/0",
    text: "text-blue-600 dark:text-blue-400",
    glow: "from-blue-500/20 via-transparent to-transparent",
  },
  emerald: {
    ring: "from-emerald-500/20 to-emerald-500/0",
    text: "text-emerald-600 dark:text-emerald-400",
    glow: "from-emerald-500/20 via-transparent to-transparent",
  },
  amber: {
    ring: "from-amber-500/20 to-amber-500/0",
    text: "text-amber-600 dark:text-amber-400",
    glow: "from-amber-500/20 via-transparent to-transparent",
  },
} as const;

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = "violet",
  hint,
}: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  const a = ACCENTS[accent];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card",
        "p-5 shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5",
        "active:scale-[0.98]"
      )}
    >
      {/* Radial glow */}
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl",
          "transition-transform duration-300 group-hover:scale-125",
          a.glow
        )}
      />

      <div className="relative flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            "bg-gradient-to-br",
            a.ring,
            a.text
          )}
        >
          <Icon className="size-5" />
        </div>

        {typeof delta === "number" && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              positive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {positive ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {Math.abs(delta)}%
          </span>
        )}
      </div>

      <div className="relative mt-5 space-y-1">
        <div className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          {hint && (
            <span className="text-[10px] text-muted-foreground">{hint}</span>
          )}
        </div>
      </div>
    </div>
  );
}

