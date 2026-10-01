
import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";
import { ServiceStatusGrid } from "@/components/ops/service-status-grid";
import { WidgetBoundary } from "@/components/shared/widget-boundary";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ServicesOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/services");

  bootstrapServices();
  const bus = getServiceBus();
  const health = await bus.healthAll();

  const ready = health.filter((h) => h.ready).length;
  const total = health.length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
            Services
          </h1>
          <p className="text-sm text-muted-foreground">
            {ready}/{total} services ready · Each runs in its own failure domain
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/ops/services">
            Operations view <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
          <Activity className="size-4 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          <div className="font-semibold text-foreground">Isolated failure domains</div>
          <p className="mt-1">
            Each service has its own circuit breaker, bulkhead, and fallback
            chain. A failure in one service never blocks another. Services
            coordinate through a shared bus that returns a typed result for
            every call.
          </p>
        </div>
      </div>

      <WidgetBoundary label="Service Grid">
        <ServiceStatusGrid services={health} />
      </WidgetBoundary>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {health.map((svc) => (
          <Link
            key={svc.id}
            href={`/services/${svc.id}`}
            className="group rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold capitalize">{svc.id}</span>
              <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {svc.name}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
