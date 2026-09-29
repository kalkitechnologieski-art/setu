"use client";

// components/shared/widget-boundary.tsx — Layer 3: Feature error boundary.
// Catches errors in individual widgets. Includes async error bridging via
// useErrorHandler() which lets async code push errors into the nearest boundary.
import {
  Component, useCallback, useEffect, useState,
  type ErrorInfo, type ReactNode,
} from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── useErrorHandler — async error bridging ──────────────────────────────
// React error boundaries only catch render-time errors. This hook lets
// async code (fetch failures, promise rejections) push errors into the
// nearest boundary by calling throwError().
export function useErrorHandler(): (error: unknown) => void {
  const [, setError] = useState<unknown>(null);

  useEffect(() => {
    // This effect intentionally does nothing — it exists so React flushes
    // the setState-triggered error into the nearest boundary.
  });

  return useCallback((error: unknown) => {
    setError(() => {
      throw error instanceof Error ? error : new Error(String(error));
    });
  }, []);
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WidgetBoundary extends Component<Props, State> {
  public override state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    try {
      void fetch("/api/observability/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: this.props.label ?? "widget",
          message: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
          at: new Date().toISOString(),
        }),
        keepalive: true,
      }).catch(() => { /* never let observability fail the app */ });
    } catch { /* swallow */ }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/40 px-6 py-10 text-center",
            this.props.className
          )}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {this.props.label ? `${this.props.label} unavailable` : "Section unavailable"}
            </p>
            <p className="text-xs text-muted-foreground">
              Something went wrong. We&apos;ve logged it.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
