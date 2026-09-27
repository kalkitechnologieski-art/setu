import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFunnelData, getCohortData } from "@/lib/ops/queries";
import { getChannelAttribution } from "@/lib/analytics/queries";
import { FunnelChart } from "@/components/widgets/funnel-chart";
import { EmptyState } from "@/components/ui/premium/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const CHANNEL_COLORS = [
  "from-violet-500 to-violet-400",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
] as const;

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/analytics");

  const [funnel, cohorts, channels] = await Promise.all([
    getFunnelData(user.id),
    getCohortData(user.id),
    getChannelAttribution(user.id),
  ]);

  const firstStageCount = funnel[0]?.count ?? 0;
  const hasData = firstStageCount > 0;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Funnel, cohorts, and attribution from your live pipeline.
        </p>
      </div>

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="No data yet"
          description="Analytics will populate as leads enter your pipeline. Import leads or run Arjun to get started."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversion funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelChart
                stages={funnel.map((s, i) => ({
                  label: s.stage,
                  value: s.count,
                  color:
                    i === 0
                      ? "from-violet-500 to-violet-400"
                      : i === funnel.length - 1
                      ? "from-emerald-500 to-emerald-400"
                      : "from-violet-500 to-blue-500",
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Channel attribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {channels.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Attribution data will appear as leads are added.
                </p>
              ) : (
                channels.map((c, i) => (
                  <div key={c.channel}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium capitalize">{c.channel}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {c.share.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${
                          CHANNEL_COLORS[i % CHANNEL_COLORS.length]
                        }`}
                        style={{ width: `${c.share}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {cohorts.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Cohort retention</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Cohort</th>
                      {["W0", "W1", "W2", "W3", "W4", "W5"].map((w) => (
                        <th key={w} className="px-3 py-2 font-medium">
                          {w}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map((row) => (
                      <tr key={row.cohort} className="border-t">
                        <td className="px-3 py-2 font-medium">{row.cohort}</td>
                        {row.weeks.map((w) => (
                          <td
                            key={`${row.cohort}-${w.week}`}
                            className="px-3 py-2 tabular-nums"
                            style={{
                              background:
                                w.pct === null
                                  ? undefined
                                  : `rgba(139, 92, 246, ${(w.pct / 100) * 0.35})`,
                            }}
                          >
                            {w.pct === null ? "—" : `${w.pct.toFixed(0)}%`}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
