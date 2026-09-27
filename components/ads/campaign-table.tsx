import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdCampaignRow } from "@/lib/ads/types";

const STATUS_STYLE: Record<AdCampaignRow["status"], string> = {
  healthy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  paused:  "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

const STATUS_LABEL: Record<AdCampaignRow["status"], string> = {
  healthy: "Healthy",
  warning: "Low ROAS",
  paused:  "Paused",
};

const PLATFORM_SHORT: Record<string, string> = {
  meta_ads: "Meta",
  facebook: "Meta",
  instagram: "IG",
  google_ads: "Google",
  youtube: "YouTube",
  tiktok_ads: "TikTok",
};

export function CampaignTable({ rows }: { rows: AdCampaignRow[] }) {
  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border bg-card p-5">
        <p className="py-6 text-center text-xs text-muted-foreground">
          No campaigns found in the last 30 days.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight">
          Campaign Performance
        </h2>
        <span className="text-[10px] text-muted-foreground">
          {rows.length} campaign{rows.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/30">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Campaign</th>
              <th className="px-4 py-2.5 font-medium">Platform</th>
              <th className="px-4 py-2.5 text-right font-medium">Spend</th>
              <th className="px-4 py-2.5 text-right font-medium">Conversions</th>
              <th className="px-4 py-2.5 text-right font-medium">ROAS</th>
              <th className="px-4 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.platform}-${r.campaign_name}-${i}`}
                className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/10 text-violet-600 dark:text-violet-400">
                      <BarChart3 className="size-3.5" />
                    </div>
                    <span className="truncate text-sm font-medium">
                      {r.campaign_name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {PLATFORM_SHORT[r.platform] ?? r.platform}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  ₹{r.spend.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {r.conversions.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      r.roas >= 3
                        ? "text-emerald-600 dark:text-emerald-400"
                        : r.roas >= 2
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {r.roas.toFixed(1)}x
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge
                    className={cn(
                      "rounded-full border-0 text-[10px]",
                      STATUS_STYLE[r.status]
                    )}
                  >
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
