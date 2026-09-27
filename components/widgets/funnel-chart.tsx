import { cn } from "@/lib/utils";

interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const pct = (stage.value / max) * 100;
        const prev = i > 0 ? stages[i - 1] : undefined;
        const conv =
          prev && prev.value > 0
            ? ((stage.value / prev.value) * 100).toFixed(1)
            : null;

        return (
          <div key={stage.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium">{stage.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {stage.value.toLocaleString()}
                {conv && (
                  <span className="ml-1 text-[10px]">({conv}%)</span>
                )}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
                  stage.color ?? "from-violet-500 to-blue-500"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
