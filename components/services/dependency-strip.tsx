
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceHealth } from "@/lib/services/registry";

interface DependencyStripProps {
  current: ServiceHealth;
  incoming: ServiceHealth[];
  outgoing: ServiceHealth[];
}

function HealthBadge({ ready }: { ready: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        ready
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      )}
    >
      {ready ? "healthy" : "unavailable"}
    </span>
  );
}

export function DependencyStrip({
  current: _current,
  incoming,
  outgoing,
}: DependencyStripProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border bg-card/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ArrowRight className="size-3" />
          Depends on
        </div>
        {outgoing.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No external dependencies
          </p>
        ) : (
          <ul className="space-y-2">
            {outgoing.map((svc) => (
              <li key={svc.id}>
                <Link
                  href={`/services/${svc.id}`}
                  className="flex items-center justify-between rounded-lg border bg-background/40 px-3 py-2 text-xs transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <span className="truncate font-medium capitalize">{svc.id}</span>
                  <HealthBadge ready={svc.ready} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border bg-card/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ArrowLeft className="size-3" />
          Consumed by
        </div>
        {incoming.length === 0 ? (
          <p className="text-xs text-muted-foreground">No consumers</p>
        ) : (
          <ul className="space-y-2">
            {incoming.map((svc) => (
              <li key={svc.id}>
                <Link
                  href={`/services/${svc.id}`}
                  className="flex items-center justify-between rounded-lg border bg-background/40 px-3 py-2 text-xs transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <span className="truncate font-medium capitalize">{svc.id}</span>
                  <HealthBadge ready={svc.ready} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
