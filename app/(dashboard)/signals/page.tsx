import { Suspense } from "react";
import { SignalCard } from "@/components/widgets/signal-card";

export const dynamic = "force-dynamic";

const SIGNALS = [
  { title: "Acme Industries raised Series B",       description: "$24M led by Sequoia. Hiring 12 SDRs in Q1.", signalType: "funding",     source: "Crunchbase", icpScore: 94, urgency: "critical" as const },
  { title: "BrightTech migrated to Snowflake",       description: "Job postings mention dbt + Snowflake stack.", signalType: "tech_change", source: "LinkedIn",   icpScore: 78, urgency: "high"     as const },
  { title: "Nexus AI posted 3 growth roles",         description: "Head of Growth + 2 SDRs opened this week.", signalType: "hiring",      source: "LinkedIn",   icpScore: 82, urgency: "high"     as const },
  { title: "Vertex Labs viewed pricing page 5×",     description: "Same IP, three sessions in 24h.",           signalType: "intent",      source: "GA4",        icpScore: 71, urgency: "medium"   as const },
  { title: "Solaris Group renewed enterprise plan",  description: "Upsell signal — expanding to 3 new regions.", signalType: "expansion", source: "CRM",        icpScore: 88, urgency: "medium"   as const },
];

export default function SignalsPage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
          Signals
        </h1>
        <p className="text-sm text-muted-foreground">
          Live buying intent — routed to Arjun for enrichment.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SIGNALS.map((s, i) => (
          <Suspense key={i} fallback={<div className="h-44 rounded-2xl border bg-muted/30" />}>
            <SignalCard {...s} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}

