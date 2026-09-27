interface Kpi {
  label: string;
  value: string | number;
}

export function AgentKpiRibbon({ kpis }: { kpis: readonly Kpi[] }) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl border bg-card/50 p-3">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="text-center">
          <div className="text-sm font-semibold tabular-nums">{kpi.value}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {kpi.label}
          </div>
        </div>
      ))}
    </div>
  );
}

