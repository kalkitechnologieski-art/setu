import { Suspense } from "react";
import { InboxItem, type InboxChannel } from "@/components/widgets/inbox-item";
import { ApprovalCard } from "@/components/widgets/approval-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const MOCK_ITEMS: Array<{
  channel: InboxChannel;
  sender: string;
  summary: string;
  timestamp: string;
  confidence?: number;
}> = [
  { channel: "approval", sender: "Meera", summary: "Approve outbound call to Aarav Sharma — ICP score 82, opened pricing 3×", timestamp: "2m", confidence: 0.87 },
  { channel: "email",    sender: "Kabir", summary: "Drafted follow-up to Diya Patel — Q4 pricing question",           timestamp: "18m" },
  { channel: "signal",   sender: "Arjun", summary: "Acme Industries raised Series B — matches your ICP exactly",       timestamp: "1h",  confidence: 0.94 },
  { channel: "call",     sender: "Meera", summary: "Vihaan Reddy call completed — positive sentiment, asked for pricing", timestamp: "3h" },
  { channel: "approval", sender: "Siddhi", summary: "Rebalance ₹18,400 from LinkedIn to TikTok — ROAS gap 2.9 → 5.1", timestamp: "5h", confidence: 0.79 },
];

export default function InboxPage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
          Inbox
        </h1>
        <p className="text-sm text-muted-foreground">
          Every decision your workforce is waiting on, in one place.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Suspense fallback={<div className="h-96 rounded-2xl border bg-muted/30" />}>
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-base">Pending decisions ({MOCK_ITEMS.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {MOCK_ITEMS.map((item, i) => (
                <InboxItem
                  key={i}
                  channel={item.channel}
                  sender={item.sender}
                  summary={item.summary}
                  timestamp={item.timestamp}
                  confidence={item.confidence}
                  active={i === 0}
                />
              ))}
            </CardContent>
          </Card>
        </Suspense>

        <aside className="space-y-4">
          <ApprovalCard
            agentName="Meera"
            action="Approve outbound call"
            summary="Dial Aarav Sharma (+91-98xxx-xxxx). AI opener: reference Series B announcement."
            reasoning="ICP score 82. Opened two emails in last 48h. Viewed pricing page three times. SDR notes match your Q4 enterprise playbook."
            confidence={0.87}
          />
          <ApprovalCard
            agentName="Siddhi"
            action="Rebalance ₹18,400"
            summary="Shift LinkedIn Ads budget to TikTok Ads for the next 7 days."
            reasoning="LinkedIn ROAS 2.9 vs TikTok ROAS 5.1 over trailing 30d. Confidence from 14-day rolling window."
            confidence={0.79}
            accent="from-amber-500 to-orange-500"
          />
        </aside>
      </div>
    </div>
  );
}

