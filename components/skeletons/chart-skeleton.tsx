import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-3 w-24 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="relative h-[280px] w-full">
          <div className="absolute inset-0 flex flex-col justify-between py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-px bg-border" />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-8 flex items-end gap-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 animate-pulse rounded-t bg-muted"
                style={{ height: `${20 + Math.random() * 60}%` }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
