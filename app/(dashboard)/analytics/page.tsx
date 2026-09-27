import { FunnelChart } from "@/components/widgets/funnel-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const STAGES = [
  { label: "Leads captured",     value: 1240, color: "from-violet-500 to-violet-400" },
  { label: "Qualified (ICP ≥ 70)", value: 612,  color: "from-violet-500 to-blue-500" },
  { label: "Contacted",          value: 418,  color: "from-blue-500 to-cyan-500" },
  { label: "Meeting booked",     value: 184,  color: "from-emerald-500 to-teal-500" },
  { label: "Converted",          value: 71,   color: "from-emerald-500 to-emerald-400" },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Deep funnel, cohort, and attribution views.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion funnel — last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={STAGES} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel attribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { ch: "Organic search", pct: 34, color: "from-violet-500 to-violet-400" },
              { ch: "Paid ads",       pct: 27, color: "from-blue-500 to-cyan-500" },
              { ch: "Outbound",       pct: 22, color: "from-emerald-500 to-teal-500" },
              { ch: "Referral",       pct: 12, color: "from-amber-500 to-orange-500" },
              { ch: "Direct",         pct: 5,  color: "from-slate-500 to-slate-400" },
            ].map((r) => (
              <div key={r.ch}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium">{r.ch}</span>
                  <span className="tabular-nums text-muted-foreground">{r.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full bg-gradient-to-r ${r.color}`} style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

