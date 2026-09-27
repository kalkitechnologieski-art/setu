import { Suspense } from "react";
import { ApprovalCard } from "@/components/widgets/approval-card";

export const dynamic = "force-dynamic";

const APPROVALS = [
  { agentName: "Meera",  action: "Place call to Aarav Sharma",    summary: "Outbound dial with AI opener referencing Series B.", confidence: 0.87, accent: "from-blue-500 to-cyan-500" },
  { agentName: "Meera",  action: "Send SMS to Diya Patel",        summary: "Follow-up SMS with calendar link.",                  confidence: 0.81, accent: "from-blue-500 to-cyan-500" },
  { agentName: "Siddhi", action: "Rebalance ₹18,400 budget",      summary: "Shift LinkedIn → TikTok for 7 days.",                confidence: 0.79, accent: "from-amber-500 to-orange-500" },
  { agentName: "Kabir",  action: "Launch sequence step 2",         summary: "Follow-up email to 42 cold leads.",                  confidence: 0.92, accent: "from-emerald-500 to-teal-500" },
];

export default function ApprovalsPage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
          Approvals
        </h1>
        <p className="text-sm text-muted-foreground">
          Human-in-the-loop queue. Nothing writes without your sign-off.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {APPROVALS.map((a, i) => (
          <Suspense key={i} fallback={<div className="h-56 rounded-2xl border bg-muted/30" />}>
            <ApprovalCard {...a} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}

