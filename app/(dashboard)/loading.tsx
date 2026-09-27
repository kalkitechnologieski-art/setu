// app/(dashboard)/loading.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Route-segment loading UI — Next.js wraps page.tsx in a <Suspense> boundary
 * using this component as the fallback. Renders instantly while the page's
 * data fetch streams in.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
