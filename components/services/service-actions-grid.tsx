
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ServiceAction {
  label: string;
  href: string;
  description?: string;
}

interface ServiceActionsGridProps {
  actions: ServiceAction[];
}

export function ServiceActionsGrid({ actions }: ServiceActionsGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.label + action.href}
          href={action.href}
          className="group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-violet-500/10 to-blue-500/5 blur-2xl"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-tight">
              {action.label}
            </span>
            <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
          {action.description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {action.description}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
