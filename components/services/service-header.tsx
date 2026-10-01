
import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceHealth } from "@/lib/services/registry";
import { Button } from "@/components/ui/button";

interface HeaderAction {
  label: string;
  href?: string;
  variant?: "default" | "outline" | "gradient" | "ghost";
  icon?: LucideIcon;
}

interface ServiceHeaderProps {
  service: ServiceHealth;
  icon: LucideIcon;
  title: string;
  role: string;
  description: string;
  accentClass: string;
  actions?: HeaderAction[];
}

function statusKind(svc: ServiceHealth): "ready" | "degraded" | "down" | "unconfigured" {
  if (!svc.configured) return "unconfigured";
  if (!svc.ready) return "down";
  if (svc.degraded) return "degraded";
  return "ready";
}

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  degraded: "Degraded",
  down: "Down",
  unconfigured: "Unconfigured",
};

const STATUS_CLASS: Record<string, string> = {
  ready: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  degraded: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  down: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  unconfigured: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

export function ServiceHeader({
  service,
  icon: Icon,
  title,
  role,
  description,
  accentClass,
  actions,
}: ServiceHeaderProps) {
  const kind = statusKind(service);

  return (
    <header className="space-y-4">
      <Link
        href="/services"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> All services
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm",
              accentClass
            )}
          >
            <Icon className="size-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight gradient-text">
                {title}
              </h1>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  STATUS_CLASS[kind]
                )}
              >
                {STATUS_LABEL[kind]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{role}</p>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        {actions && actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action, i) => {
              const Icon = action.icon;
              if (action.href) {
                return (
                  <Button
                    key={`${action.label}-${i}`}
                    variant={action.variant ?? "outline"}
                    size="sm"
                    asChild
                  >
                    <Link href={action.href}>
                      {Icon && <Icon className="size-3.5" />}
                      {action.label}
                    </Link>
                  </Button>
                );
              }
              return (
                <Button
                  key={`${action.label}-${i}`}
                  variant={action.variant ?? "outline"}
                  size="sm"
                  disabled
                >
                  {Icon && <Icon className="size-3.5" />}
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
