import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "gradient" | "outline" | "default" | "ghost";
}

interface EmptyStateOnboardingProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: OnboardingAction;
  secondaryAction?: OnboardingAction;
  className?: string;
}

export function EmptyStateOnboarding({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateOnboardingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed",
        "bg-card/40 px-6 py-16 text-center",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-blue-500/10 text-violet-600 dark:text-violet-400">
        <Icon className="size-6" />
      </div>

      <div className="max-w-md space-y-2">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {primaryAction &&
            (primaryAction.href ? (
              <Button variant={primaryAction.variant ?? "gradient"} asChild>
                <Link href={primaryAction.href}>{primaryAction.label}</Link>
              </Button>
            ) : (
              <Button
                variant={primaryAction.variant ?? "gradient"}
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Button variant={secondaryAction.variant ?? "outline"} asChild>
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button
                variant={secondaryAction.variant ?? "outline"}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
