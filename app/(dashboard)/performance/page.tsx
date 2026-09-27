import { BarChart3, DollarSign, MousePointerClick, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const PLATFORMS = [
  { name: "Google Ads",   spend: 42000, clicks: 5120, conv: 184, roas: 4.2 },
  { name: "Meta Ads",     spend: 31500, clicks: 3860, conv: 128, roas: 3.8 },
  { name: "LinkedIn Ads", spend: 18400, clicks: 1240, conv: 52,  roas: 2.9 },
  { name: "TikTok Ads",   spend: 12600, clicks: 2110, conv: 71,  roas: 5.1 },
];

const TOTAL_SPEND = PLATFORMS.reduce((s, p) => s + p.spend, 0);
const TOTAL_CONV  = PLATFORMS.reduce((s, p) => s + p.conv, 0);
const TOTAL_CLICKS = PLATFORMS.reduce((s, p) => s + p.clicks, 0);
const AVG_ROAS = (PLATFORMS.reduce((s, p) => s + p.roas, 0) / PLATFORMS.length).toFixed(2);

export default function PerformancePage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Performance</h1>
          <p className="text-sm text-muted-foreground">
            Cross-platform ad performance — last 30 days.
          </p>
        </div>
        <Button variant="gradient" size="sm">
          <TrendingUp className="size-4" /> Rebalance budget
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ad Spend"    value={`₹${(TOTAL_SPEND / 1000).toFixed(1)}K`} delta={4.1}  icon={DollarSign}          accent="violet"  hint="30 days" />
        <StatCard label="Clicks"      value={TOTAL_CLICKS.toLocaleString()}           delta={11.8} icon={MousePointerClick}   accent="blue"    hint="vs prior" />
        <StatCard label="Conversions" value={TOTAL_CONV.toLocaleString()}             delta={7.2}  icon={BarChart3}           accent="emerald" hint="all platforms" />
        <StatCard label="Avg ROAS"    value={`${AVG_ROAS}x`}                          delta={5.6}  icon={TrendingUp}          accent="amber"   hint="weighted" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {PLATFORMS.map((p) => {
            const ctr = ((p.clicks / 100000) * 100).toFixed(2);
            const cpa = p.conv > 0 ? Math.round(p.spend / p.conv) : 0;

            return (
              <div key={p.name} className="rounded-xl border bg-card/40 p-4 transition-colors hover:bg-card/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/10 text-violet-600 dark:text-violet-400">
                      <BarChart3 className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        ₹{p.spend.toLocaleString()} spend · ₹{cpa} CPA
                      </div>
                    </div>
                  </div>
                  <Badge
                    className={`rounded-full border-0 ${
                      p.roas >= 4
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : p.roas >= 3
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {p.roas}x ROAS
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">CTR</div>
                    <div className="font-semibold tabular-nums">{ctr}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Clicks</div>
                    <div className="font-semibold tabular-nums">{p.clicks.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Conversions</div>
                    <div className="font-semibold tabular-nums">{p.conv}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

