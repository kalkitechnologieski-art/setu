"use client";

// app/global-error.tsx — Layer 1: Global error boundary.
// Catches errors in the root layout. Must render its own <html> and <body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold">Application error</h1>
            <p className="text-sm text-muted-foreground">
              The application hit a critical error and could not recover.
            </p>
            {error.digest && (
              <p className="font-mono text-xs">Reference: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
