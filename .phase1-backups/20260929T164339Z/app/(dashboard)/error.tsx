// app/(dashboard)/error.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Route-segment error boundary.
 * Catches runtime errors thrown by any child Server/Client Component.
 * Must be a Client Component. Receives { error, reset } from Next.js.
 *
 * error.digest is the server-side correlation ID from Next.js — surface it
 * to the user so support can trace the failure without exposing stack traces.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Forward to your observability backend (Sentry, Axiom, etc.)
    console.error("[dashboard:error]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The page hit an unexpected error. You can retry, or return to the
            dashboard.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-muted-foreground">
              Reference: {error.digest}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
