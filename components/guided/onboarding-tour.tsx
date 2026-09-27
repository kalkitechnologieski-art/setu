"use client";

import { useEffect, useState } from "react";
import { Compass, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "setu-tour-v1";

const STEPS = [
  {
    icon: Compass,
    title: "Welcome to Setu Kalki",
    body: "Your AI workforce runs the marketing motions — you stay in control. Let's take a quick tour.",
  },
  {
    icon: Users,
    title: "Meet your AI team",
    body: "Arjun finds leads, Meera handles voice, Kabir writes nurture emails, and Siddhi manages ads. All in the AI Team page.",
  },
  {
    icon: Sparkles,
    title: "Ask Siddhi anything",
    body: "Press ⌘J anywhere to open Siddhi — your personal AI assistant. Ask questions, get answers from your real data.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const done = window.localStorage.getItem(STORAGE_KEY);
      if (!done) setOpen(true);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  function finish() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* no-op */
    }
    setOpen(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  }

  if (!open) return null;

  const s = STEPS[step]!;
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-fade-up rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/10 text-violet-600 dark:text-violet-400">
            <Icon className="size-5" />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={finish}
            aria-label="Skip tour"
          >
            <X className="size-3.5" />
          </Button>
        </div>

        <h2 className="mt-4 text-lg font-semibold tracking-tight">
          {s.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {s.body}
        </p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}
            <Button variant="gradient" size="sm" onClick={next}>
              {isLast ? "Start using Setu" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
