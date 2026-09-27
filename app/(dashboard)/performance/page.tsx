import { redirect } from "next/navigation";
import { BarChart3, DollarSign, MousePointerClick, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPlatformBreakdown } from "@/lib/ops/queries";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/ui/premium/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/performance");

  let platforms: Awaited<ReturnType<typeof getPlatformBreakdown>> = [];
  try { platforms = await getPlatformBreakdown(user.id); }
  catch (e) { console.error("[performance]", e); }

  const totalSpend = platforms.reduce((s, p) => s + p.spend, 0);
  const totalConv = platforms.reduce((s, p) => s + p.conversions, 0);
  const avgRoas = platforms.length > 0 ? platforms.reduce((s, p) => s + p.roas, 0) / platforms.length : 0;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">Performance</h1>
        <p className="text-sm text-muted-foreground">Cross-platform ad performance — last 30 days.</p>
      </div>
      {platforms.length === 0 ? (
        <EmptyState icon={BarChart3} title="No ad data yet" description="Connect Google Ads, Meta, or YouTube to see performance." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Ad Spend" value={`₹${(totalSpend / 1000).toFixed(1)}K`} icon={DollarSign} accent="violet" hint="30 days" />
            <StatCard label="Conversions" value={totalConv.toLocaleString()} icon={MousePointerClick} accent="emerald" hint="all platforms" />
            <StatCard label="Avg ROAS" value={`${avgRoas.toFixed(2)}x`} icon={TrendingUp} accent="amber" hint="weighted" />
            <StatCard label="Platforms" value={platforms.length} icon={BarChart3} accent="blue" hint="connected" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Platform breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {platforms.map((p) => {
                const cpa = p.conversions > 0 ? Math.round(p.spend / p.conversions) : 0;
                return (
                  <div key={p.platform} className="rounded-xl border bg-card/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold capitalize">{p.platform.replace("_", " ")}</div>
                        <div className="text-xs text-muted-foreground">₹{p.spend.toLocaleString()} spend · ₹{cpa} CPA</div>
                      </div>
                      <Badge className={`rounded-full border-0 ${p.roas >= 4 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : p.roas >= 3 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                        {p.roas.toFixed(1)}x ROAS
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
