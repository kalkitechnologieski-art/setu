import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, DollarSign, Target, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSummary, getRecentActivity } from "@/lib/ops/queries";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/ui/premium/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  let summary = {
    totalLeads: 0, qualifiedLeads: 0, convertedLeads: 0,
    activeCampaigns: 0, pendingApprovals: 0, runsToday: 0,
    costTodayUsd: 0, spend30d: 0, conversions30d: 0, avgRoas: 0,
  };
  let activity: Awaited<ReturnType<typeof getRecentActivity>> = [];

  try {
    [summary, activity] = await Promise.all([
      getDashboardSummary(user.id),
      getRecentActivity(user.id, 8),
    ]);
  } catch (e) {
    console.error("[dashboard] data fetch failed:", e);
  }

  const isNew = summary.totalLeads === 0 && summary.activeCampaigns === 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew
              ? "Your workspace is ready. Connect a platform to start."
              : `${summary.totalLeads} leads · ${summary.activeCampaigns} active campaigns · ${summary.pendingApprovals} pending`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/analytics">Open analytics</Link>
          </Button>
          <Button variant="gradient" size="sm" asChild>
            <Link href="/leads">View leads <ArrowRight className="size-3.5" /></Link>
          </Button>
        </div>
      </div>

      {isNew && (
        <EmptyState
          icon={Users}
          title="Welcome to Setu Kalki"
          description="Connect Google Ads or Meta to start running campaigns. Your AI team will begin finding leads within minutes."
          action={
            <Button variant="gradient" size="sm" asChild>
              <Link href="/connect">Connect a platform <ArrowRight className="size-3.5" /></Link>
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard label="Total Leads" value={summary.totalLeads.toLocaleString()} icon={Users} accent="violet" hint={`${summary.qualifiedLeads} qualified`} />
        <StatCard label="Conversions" value={summary.convertedLeads.toLocaleString()} icon={Target} accent="emerald" hint="all time" />
        <StatCard label="30-day Spend" value={`₹${(summary.spend30d / 1000).toFixed(1)}K`} icon={DollarSign} accent="amber" hint={`${summary.conversions30d} conv.`} />
        <StatCard label="Blended ROAS" value={`${summary.avgRoas.toFixed(2)}x`} icon={BarChart3} accent="blue" hint="last 30 days" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No activity yet. Your AI team will log events here.
            </p>
          ) : (
            <ul className="space-y-2">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-muted/40">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.severity === "critical" ? "bg-rose-500" : a.severity === "warning" ? "bg-amber-500" : "bg-sky-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{a.actorId}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.summary}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
