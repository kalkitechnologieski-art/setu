import {
  BarChart3, LayoutDashboard, Phone, Sparkles, Users,
} from "lucide-react";

/**
 * Composed mockup of the Operations Center rendered from real primitives.
 * No image asset — every pixel is live DOM, so it stays in sync with the
 * design system automatically.
 */
export function DeviceMockup() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-primary/10">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-3 text-[10px] font-medium text-muted-foreground">
            setu-kalki.app / ops
          </span>
        </div>

        {/* Dashboard body */}
        <div className="grid grid-cols-[180px_1fr] divide-x">
          {/* Sidebar */}
          <aside className="hidden space-y-1 p-3 sm:block">
            <div className="mb-3 flex items-center gap-2 px-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-blue-500 text-white">
                <Sparkles className="size-3" />
              </span>
              <span className="text-xs font-semibold">Setu Kalki</span>
            </div>
            {[
              { icon: LayoutDashboard, label: "Overview" },
              { icon: Sparkles,        label: "Operations", active: true },
              { icon: Users,           label: "Leads" },
              { icon: Phone,           label: "Calls" },
              { icon: BarChart3,       label: "Performance" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                    item.active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-3" />
                  {item.label}
                </div>
              );
            })}
          </aside>

          {/* Main content */}
          <main className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold tracking-tight">
                  Operations Center
                </div>
                <div className="text-[10px] text-muted-foreground">
                  4 agents running · 47 pending decisions
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Runs today", value: "1,284" },
                { label: "Cost",       value: "$38.40" },
                { label: "Approvals",  value: "5" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-lg border bg-card/60 p-2"
                >
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Agent row */}
            <div className="space-y-1.5">
              {[
                { name: "Arjun",  role: "SDR",     status: "working",  grad: "from-violet-500 to-indigo-500" },
                { name: "Meera",  role: "Voice",   status: "awaiting", grad: "from-blue-500 to-cyan-500" },
                { name: "Kabir",  role: "Nurture", status: "idle",     grad: "from-emerald-500 to-teal-500" },
                { name: "Siddhi", role: "Ads",     status: "working",  grad: "from-amber-500 to-orange-500" },
              ].map((a) => (
                <div
                  key={a.name}
                  className="flex items-center justify-between rounded-lg border bg-card/40 px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${a.grad} text-[9px] font-semibold text-white`}
                    >
                      {a.name[0]}
                    </span>
                    <div>
                      <div className="text-[11px] font-medium">{a.name}</div>
                      <div className="text-[9px] text-muted-foreground">
                        {a.role}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                      a.status === "working"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : a.status === "awaiting"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] bg-gradient-to-br from-violet-500/15 via-transparent to-blue-500/15 blur-3xl"
      />
    </div>
  );
}
