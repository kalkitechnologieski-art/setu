import { Mail, Megaphone, Phone, Plus, Radio } from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const CAMPAIGNS = [
  { name: "Q4 Enterprise Outreach", type: "email",         status: "active",  sent: 1240, reply: 184, icon: Mail },
  { name: "Warm Lead Voice Blitz",  type: "call",          status: "active",  sent: 312,  reply: 96,  icon: Phone },
  { name: "Product Launch Multi",   type: "multi_channel", status: "draft",   sent: 0,    reply: 0,   icon: Radio },
  { name: "Retargeting – Google",   type: "paid_ads",      status: "paused",  sent: 0,    reply: 142, icon: Megaphone },
  { name: "Enterprise Drip",        type: "email",         status: "completed",sent: 890, reply: 121, icon: Mail },
];

const statusStyle: Record<string, string> = {
  active:    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  paused:    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  draft:     "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export default function CampaignsPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            {CAMPAIGNS.length} campaigns · {CAMPAIGNS.filter(c => c.status === "active").length} active
          </p>
        </div>
        <Button variant="gradient" size="sm">
          <Plus className="size-4" /> New Campaign
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CAMPAIGNS.map((c) => {
          const Icon = c.icon;
          const replyRate = c.sent > 0 ? ((c.reply / c.sent) * 100).toFixed(1) : "0.0";

          return (
            <Card key={c.name} className="group overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/10 text-violet-600 dark:text-violet-400">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-sm font-semibold">{c.name}</CardTitle>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                      {c.type.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <Badge className={`rounded-full border-0 text-[10px] ${statusStyle[c.status]}`}>
                  {c.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center">
                  <div>
                    <div className="text-sm font-semibold tabular-nums">{c.sent.toLocaleString()}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sent</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold tabular-nums">{c.reply.toLocaleString()}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Replies</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold tabular-nums">{replyRate}%</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rate</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Open campaign
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

