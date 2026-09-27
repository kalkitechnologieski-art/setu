"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PlatformStatus = "disconnected" | "active" | "revoked";

interface PlatformCardProps {
  provider: "google_ads" | "youtube" | "meta_ads";
  name: string;
  description: string;
  scopes: readonly string[];
  status?: PlatformStatus;
  accountName?: string;
}

export function PlatformCard({
  provider,
  name,
  description,
  scopes,
  status = "disconnected",
  accountName,
}: PlatformCardProps) {
  const [pending, setPending] = useState(false);

  // Full-page navigation to the OAuth start route — use an anchor element
  // (via Button asChild) instead of window.location.href. This satisfies
  // @next/next/no-location-assign-relative-destination.
  const startHref = `/api/oauth/${provider}/start?next=/connect`;

  return (
    <div className="group rounded-2xl border bg-card p-5 transition-all hover:shadow-md hover:shadow-primary/5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold tracking-tight">{name}</h3>
            {status === "active" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> Connected
              </span>
            )}
            {status === "revoked" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-3" /> Reconnect needed
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
          {accountName && (
            <p className="mt-2 text-xs text-foreground">
              <span className="text-muted-foreground">Account:</span> {accountName}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {scopes.map((scope) => (
              <span
                key={scope}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
              >
                {scope}
              </span>
            ))}
          </div>
        </div>

        <Button
          variant={status === "active" ? "outline" : "gradient"}
          size="sm"
          disabled={pending}
          asChild
          onClick={() => setPending(true)}
        >
          <a href={startHref}>
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            {status === "active" ? "Reconnect" : "Connect"}
          </a>
        </Button>
      </div>
    </div>
  );
}
