import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";
import { ServiceStatusGrid } from "@/components/ops/service-status-grid";
import { WidgetBoundary } from "@/components/shared/widget-boundary";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ops/services");

  bootstrapServices();
  const bus = getServiceBus();
  const health = await bus.healthAll();

  const ready = health.filter((h) => h.ready).length;
  const total = health.length;
  const degraded = health.filter((h) => h.degraded).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
            Service Health
          </h1>
          <p className="text-sm text-muted-foreground">
            {ready}/{total} services ready
            {degraded > 0 && ` · ${degraded} degraded`}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/ops">
            Back to Operations <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
          <Activity className="size-4 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          <div className="font-semibold text-foreground">
            Isolated failure domains
          </div>
          <p className="mt-1">
            Each service has its own circuit breaker, bulkhead, and fallback
            chain. A failure in one service never blocks another. Services
            coordinate through the service bus, which returns a typed result
            for every call.
          </p>
        </div>
      </div>

      <WidgetBoundary label="Service Grid">
        <ServiceStatusGrid services={health} />
      </WidgetBoundary>

      <div className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold tracking-tight">
          Inter-service dependencies
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Critical dependencies gate the service. Optional dependencies
          degrade gracefully — the service runs but with reduced capability.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {health.map((svc) => (
            <div
              key={svc.id}
              className="flex items-center justify-between rounded-lg border bg-card/60 px-3 py-2"
            >
              <span className="text-xs font-medium capitalize">{svc.id}</span>
              <div className="flex items-center gap-2">
                <span
                  className={
                    svc.ready
                      ? "h-2 w-2 rounded-full bg-emerald-500"
                      : "h-2 w-2 rounded-full bg-rose-500"
                  }
                />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {svc.ready ? "ready" : "unavailable"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
