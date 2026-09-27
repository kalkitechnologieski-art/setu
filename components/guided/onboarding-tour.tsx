"use client";

import { useCallback, useEffect, useState } from "react";
import { Compass, Sparkles, Users, ChevronRight, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "setu-tour-v2";
const SKIPPED_STEPS_KEY = "setu-tour-skipped-steps";

export interface TourStep {
  id: string;
  icon: typeof Compass;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    id: "welcome",
    icon: Compass,
    title: "Welcome to Setu Kalki",
    body: "Your AI workforce runs the marketing motions — you stay in control. Let's take a quick tour. You can skip any step or the whole tour.",
  },
  {
    id: "team",
    icon: Users,
    title: "Meet your AI team",
    body: "Arjun finds leads, Meera handles voice calls, Kabir writes nurture emails, and Siddhi manages ads. All in the AI Team page.",
  },
  {
    id: "siddhi",
    icon: Sparkles,
    title: "Ask Siddhi anything",
    body: "Press ⌘J anywhere to open Siddhi — your personal AI assistant. Ask about real data, draft campaigns, or get answers.",
  },
];

function readSkippedSteps(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SKIPPED_STEPS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSkippedSteps(skipped: Set<string>) {
  try {
    window.localStorage.setItem(SKIPPED_STEPS_KEY, JSON.stringify(Array.from(skipped)));
  } catch {
    /* localStorage unavailable */
  }
}

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const done = window.localStorage.getItem(STORAGE_KEY);
      if (!done) {
        setSkipped(readSkippedSteps());
        setOpen(true);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const finishAll = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* localStorage unavailable */
    }
    setOpen(false);
  }, []);

  const skipStep = useCallback((stepId: string) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      next.add(stepId);
      writeSkippedSteps(next);
      return next;
    });
    // Move to next visible step
    setStep((current) => current + 1);
  }, []);

  // Find the next step that isn't skipped
  const visibleSteps = STEPS.filter((s) => !skipped.has(s.id));
  const current = visibleSteps[step];

  // If all visible steps are exhausted, close the tour.
  useEffect(() => {
    if (open && !current) finishAll();
  }, [open, current, finishAll]);

  if (!open || !current) return null;

  const Icon = current.icon;
  const isLast = step >= visibleSteps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-fade-up rounded-2xl border bg-card p-6 shadow-2xl">
        <header className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/10 text-violet-600 dark:text-violet-400">
            <Icon className="size-5" />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={finishAll}
            aria-label="Skip entire tour"
            title="Skip entire tour"
          >
            <X className="size-3.5" />
          </Button>
        </header>

        <h2 className="mt-4 text-lg font-semibold tracking-tight">{current.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.body}</p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {visibleSteps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => skipStep(current.id)}
              className="text-muted-foreground hover:text-foreground"
              title="Skip this step"
            >
              <SkipForward className="size-3.5" />
              Skip step
            </Button>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => {
                if (isLast) finishAll();
                else setStep(step + 1);
              }}
            >
              {isLast ? "Start using Setu" : "Next"}
              {!isLast && <ChevronRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
