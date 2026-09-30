"use client";

// components/content/content-analytics.tsx
// Engagement chart + platform breakdown for Content Studio.
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export interface EngagementPoint {
  date: string;
  impressions: number;
  engagements: number;
  clicks: number;
}

export interface PlatformBreakdown {
  platform: string;
  posts: number;
  engagement: number;
  color: string;
}

interface ContentAnalyticsProps {
  engagement: EngagementPoint[];
  platforms: PlatformBreakdown[];
  className?: string;
}

export function ContentAnalytics({
  engagement,
  platforms,
  className,
}: ContentAnalyticsProps) {
  const hasData = engagement.length > 0;

  return (
    <div className={cn("grid gap-4 lg:grid-cols-[1fr_320px]", className)}>
      {/* Engagement chart */}
      <div className="rounded-2xl border bg-card p-5">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Engagement over time
            </h3>
            <p className="text-[10px] text-muted-foreground">Last 14 days</p>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Impressions
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Engagement
            </span>
          </div>
        </header>

        <div className="h-[220px]">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={engagement}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="grad-impressions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-engage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  strokeOpacity={0.08}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="impressions"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#grad-impressions)"
                />
                <Area
                  type="monotone"
                  dataKey="engagements"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#grad-engage)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Engagement data appears after your first post publishes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Platform breakdown */}
      <div className="rounded-2xl border bg-card p-5">
        <header className="mb-3">
          <h3 className="text-sm font-semibold tracking-tight">
            Platform breakdown
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Posts per channel
          </p>
        </header>

        <div className="h-[220px]">
          {platforms.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={platforms}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  strokeOpacity={0.08}
                />
                <XAxis
                  dataKey="platform"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="posts" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Publish your first post to see the breakdown.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
