import { Check, X } from "lucide-react";

interface Row {
  feature: string;
  without: string;
  with: string;
}

const ROWS: readonly Row[] = [
  {
    feature: "Lead discovery",
    without: "Manual research, LinkedIn tabs, spreadsheets",
    with: "Arjun scans signals and enriches automatically",
  },
  {
    feature: "Outbound calls",
    without: "SDR time, missed follow-ups, no transcripts",
    with: "Meera dials with approval, transcribes, tags sentiment",
  },
  {
    feature: "Nurture sequences",
    without: "Templates, manual A/B tests, silent replies",
    with: "Kabir drafts per-channel, tests variants, handles replies",
  },
  {
    feature: "Ad performance",
    without: "Dashboard hopping, delayed reallocations",
    with: "Siddhi monitors ROAS cross-platform, drafts changes",
  },
  {
    feature: "Governance",
    without: "No audit trail, no approval flow",
    with: "Every action gated, signed, ledgered",
  },
];

export function FeatureComparison() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="grid grid-cols-1 gap-px border-b bg-border md:grid-cols-[1fr_1fr_1fr]">
        <div className="bg-card px-5 py-3" />
        <div className="bg-card px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Without Setu
        </div>
        <div className="bg-gradient-to-br from-violet-500/10 to-blue-500/5 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-primary">
          With Setu
        </div>
      </div>
      {ROWS.map((row, i) => (
        <div
          key={row.feature}
          className={`grid grid-cols-1 gap-px md:grid-cols-[1fr_1fr_1fr] ${
            i < ROWS.length - 1 ? "border-b" : ""
          }`}
        >
          <div className="bg-card px-5 py-4 text-sm font-medium">
            {row.feature}
          </div>
          <div className="flex items-start gap-3 bg-card px-5 py-4 text-xs leading-relaxed text-muted-foreground">
            <X className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
            <span>{row.without}</span>
          </div>
          <div className="flex items-start gap-3 bg-gradient-to-br from-violet-500/5 to-blue-500/5 px-5 py-4 text-xs leading-relaxed">
            <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
            <span className="text-foreground">{row.with}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
