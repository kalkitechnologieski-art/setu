import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/premium/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface CampaignRow {
  id: string; name: string; status: string; type: string; metrics: Record<string, number>;
}

const STATUS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  paused: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  draft: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/campaigns");

  let campaigns: CampaignRow[] = [];
  try {
    const { data } = await supabase.from("campaigns")
      .select("id, name, status, type, metrics")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    campaigns = (data ?? []) as unknown as CampaignRow[];
  } catch (e) { console.error("[campaigns]", e); }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          {campaigns.length === 0 ? "Launch multi-channel campaigns." : `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}.`}
        </p>
      </div>
      {campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns yet" description="Launch your first campaign to start reaching leads." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => {
            const sent = c.metrics?.sent ?? 0;
            const replied = c.metrics?.replied ?? 0;
            const rate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : "0.0";
            return (
              <Card key={c.id} className="transition-all hover:shadow-lg hover:shadow-primary/5">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-sm font-semibold">{c.name}</CardTitle>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">{c.type.replace("_", " ")}</p>
                  </div>
                  <Badge className={`rounded-full border-0 text-[10px] ${STATUS[c.status] ?? ""}`}>{c.status}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center">
                    <div><div className="text-sm font-semibold tabular-nums">{sent.toLocaleString()}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sent</div></div>
                    <div><div className="text-sm font-semibold tabular-nums">{replied.toLocaleString()}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Replies</div></div>
                    <div><div className="text-sm font-semibold tabular-nums">{rate}%</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rate</div></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
