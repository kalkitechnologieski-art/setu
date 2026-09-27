import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  label: string;
  description?: string;
  done?: boolean;
}

interface StepWizardProps {
  steps: readonly WizardStep[];
  currentIndex: number;
  className?: string;
}

export function StepWizard({ steps, currentIndex, className }: StepWizardProps) {
  return (
    <ol
      className={cn("flex items-center gap-2 overflow-x-auto pb-1", className)}
    >
      {steps.map((step, i) => {
        const done = step.done || i < currentIndex;
        const active = i === currentIndex && !done;
        return (
          <li key={step.id} className="flex shrink-0 items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                done && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                active && "border-primary/40 bg-primary/10 text-primary shadow-sm",
                !done && !active && "border-border bg-muted/40 text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="whitespace-nowrap">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "h-px w-6",
                  done ? "bg-emerald-500/40" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
