"use client";

import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BudgetRecommendation } from "@/lib/ads/types";

export function RecommendationList({
  recommendations,
}: {
  recommendations: BudgetRecommendation[];
}) {
  const [decided, setDecided] = useState<Record<string, "approved" | "rejected">>({});

  if (recommendations.length === 0) return null;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <header className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight">
          Siddhi&apos;s Recommendations
        </h2>
      </header>

      <ul className="mt-4 space-y-3">
        {recommendations.map((r) => {
          const done = decided[r.id] !== undefined;
          return (
            <li
              key={r.id}
              className={cn(
                "rounded-xl border bg-card/60 p-4 transition-all",
                done && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Shift ₹{r.amount.toLocaleString()} from{" "}
                    <span className="capitalize">
                      {r.from_platform.replace("_", " ")}
                    </span>{" "}
                    →{" "}
                    <span className="capitalize">
                      {r.to_platform.replace("_", " ")}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.reason} · {r.expected_impact}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums">
                  {Math.round(r.confidence * 100)}%
                </span>
              </div>

              {!done ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={() =>
                      setDecided((prev) => ({ ...prev, [r.id]: "approved" }))
                    }
                  >
                    <Check className="size-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDecided((prev) => ({ ...prev, [r.id]: "rejected" }))
                    }
                  >
                    <X className="size-3.5" /> Dismiss
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-xs font-medium text-primary">
                  {decided[r.id] === "approved" ? "Approved" : "Dismissed"}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
