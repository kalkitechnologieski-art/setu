import { PhoneOutgoing, PhoneIncoming } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const CALLS = [
  { contact: "Aarav Sharma",  direction: "outbound", duration: "4m 12s", sentiment: "positive", outcome: "Meeting booked" },
  { contact: "Diya Patel",    direction: "outbound", duration: "2m 48s", sentiment: "neutral",  outcome: "Follow-up scheduled" },
  { contact: "Vihaan Reddy",  direction: "inbound",  duration: "6m 03s", sentiment: "positive", outcome: "Pricing shared" },
  { contact: "Ananya Iyer",   direction: "outbound", duration: "1m 22s", sentiment: "negative", outcome: "Not interested" },
  { contact: "Kabir Mehta",   direction: "outbound", duration: "5m 31s", sentiment: "positive", outcome: "Demo booked" },
];

const SENT_STYLE: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  neutral:  "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  negative: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default function CallsPage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
          Calls
        </h1>
        <p className="text-sm text-muted-foreground">
          Voice conversations handled by Meera with transcripts + sentiment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent calls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3">
          {CALLS.map((c) => {
            const Icon = c.direction === "outbound" ? PhoneOutgoing : PhoneIncoming;
            return (
              <div
                key={c.contact + c.duration}
                className="flex items-center justify-between gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.contact}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.direction} · {c.duration}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge className={`rounded-full border-0 ${SENT_STYLE[c.sentiment]}`}>
                    {c.sentiment}
                  </Badge>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {c.outcome}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

