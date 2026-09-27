import { redirect } from "next/navigation";
import { BarChart3, DollarSign, MousePointerClick, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getAdPlatformRows,
  getAdCampaignRows,
  buildRecommendations,
} from "@/lib/ads/queries";
import { StatCard } from "@/components/dashboard/stat-card";
import { BudgetPacing } from "@/components/ads/budget-pacing";
import { CampaignTable } from "@/components/ads/campaign-table";
import { RecommendationList } from "@/components/ads/recommendation-list";
import { EmptyState } from "@/components/ui/premium/empty-state";

export const dynamic = "force-dynamic";

export default async function AdsControlTowerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ads");

  const [platforms, campaigns] = await Promise.all([
    getAdPlatformRows(user.id),
    getAdCampaignRows(user.id),
  ]);

  const recommendations = buildRecommendations(platforms);

  const totalSpend = platforms.reduce((s, p) => s + p.spend, 0);
  const totalConv = platforms.reduce((s, p) => s + p.conversions, 0);
  const totalClicks = platforms.reduce((s, p) => s + p.clicks, 0);
  const avgRoas =
    platforms.length > 0
      ? platforms.reduce((s, p) => s + p.roas, 0) / platforms.length
      : 0;
  const totalBudget = Math.max(totalSpend * 1.25, 100_000);

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
          Ads Control Tower
        </h1>
        <p className="text-sm text-muted-foreground">
          Meta, Google, and YouTube — one unified view of spend, ROAS, and pacing.
        </p>
      </div>

      {platforms.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No ad data yet"
          description="Connect Google Ads, Meta, or YouTube to see cross-platform performance, budget pacing, and AI-driven reallocation suggestions."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Ad Spend"
              value={`₹${(totalSpend / 1000).toFixed(1)}K`}
              icon={DollarSign}
              accent="violet"
              hint="30 days"
            />
            <StatCard
              label="Clicks"
              value={totalClicks.toLocaleString()}
              icon={MousePointerClick}
              accent="blue"
              hint="all platforms"
            />
            <StatCard
              label="Conversions"
              value={totalConv.toLocaleString()}
              icon={BarChart3}
              accent="emerald"
              hint="last 30 days"
            />
            <StatCard
              label="Blended ROAS"
              value={`${avgRoas.toFixed(2)}x`}
              icon={TrendingUp}
              accent="amber"
              hint="weighted"
            />
          </div>

          <BudgetPacing
            platforms={platforms.map((p) => ({
              platform: p.platform,
              spend: p.spend,
              budget: Math.max(p.spend * 1.25, p.spend + 5000),
            }))}
            totalSpend={totalSpend}
            totalBudget={totalBudget}
          />

          <CampaignTable rows={campaigns} />

          {recommendations.length > 0 && (
            <RecommendationList recommendations={recommendations} />
          )}
        </>
      )}
    </div>
  );
}
