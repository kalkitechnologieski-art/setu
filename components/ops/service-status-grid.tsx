"use client";

import { Activity, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceHealth } from "@/lib/services/registry";

type StatusKind = "ready" | "degraded" | "down" | "unconfigured";

const ICON: Record<StatusKind, typeof CheckCircle2> = {
  ready: CheckCircle2,
  degraded: AlertTriangle,
  down: XCircle,
  unconfigured: Activity,
};

const STYLE: Record<StatusKind, string> = {
  ready: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  degraded: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
  down: "border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400",
  unconfigured: "border-slate-500/30 bg-slate-500/5 text-slate-600 dark:text-slate-400",
};

function classify(svc: ServiceHealth): StatusKind {
  if (!svc.configured) return "unconfigured";
  if (!svc.ready) return "down";
  if (svc.degraded) return "degraded";
  return "ready";
}

export function ServiceStatusGrid({ services }: { services: ServiceHealth[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {services.map((svc) => {
        const kind = classify(svc);
        const Icon = ICON[kind];
        return (
          <div
            key={svc.id}
            className={cn(
              "rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
              STYLE[kind]
            )}
          >
            <div className="flex items-start justify-between">
              <Icon className="size-5" />
              <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {kind}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold tracking-tight text-foreground">
                {svc.name}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {svc.id} · {svc.providers.length} provider{svc.providers.length === 1 ? "" : "s"}
              </div>
            </div>

            <ul className="mt-3 space-y-1">
              {svc.providers.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between rounded-md bg-background/40 px-2 py-1 text-[10px]"
                >
                  <span className="font-mono">{p.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-semibold",
                      p.configured
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-slate-500/10 text-slate-500"
                    )}
                  >
                    {p.circuit}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Bulkhead</span>
              <span className="tabular-nums">
                {svc.bulkhead.active}/{svc.bulkhead.max}
                {svc.bulkhead.queued > 0 && ` (+${svc.bulkhead.queued} queued)`}
              </span>
            </div>

            {svc.missingCapabilities.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[10px]">
                Missing: {svc.missingCapabilities.join(", ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
