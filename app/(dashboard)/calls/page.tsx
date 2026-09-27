import { redirect } from "next/navigation";
import { PhoneIncoming, PhoneOutgoing, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/premium/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface CallRow {
  id: string; direction: string; duration_seconds: number | null;
  sentiment: string | null; summary: string | null; created_at: string;
}

const SENT: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  neutral: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  negative: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default async function CallsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/calls");

  let calls: CallRow[] = [];
  try {
    const { data } = await supabase.from("calls")
      .select("id, direction, duration_seconds, sentiment, summary, created_at")
      .order("created_at", { ascending: false }).limit(50);
    calls = (data ?? []) as CallRow[];
  } catch (e) { console.error("[calls]", e); }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">Calls</h1>
        <p className="text-sm text-muted-foreground">
          {calls.length === 0 ? "Voice conversations handled by Meera will appear here." : `${calls.length} call${calls.length === 1 ? "" : "s"} logged.`}
        </p>
      </div>
      {calls.length === 0 ? (
        <EmptyState icon={Phone} title="No calls yet" description="Once Meera places her first call, transcripts and sentiment will appear here." />
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent calls</CardTitle></CardHeader>
          <CardContent className="space-y-2 p-3">
            {calls.map((c) => {
              const Icon = c.direction === "outbound" ? PhoneOutgoing : PhoneIncoming;
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/40">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.summary ?? "Call completed"}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.direction} · {c.duration_seconds ?? 0}s · {new Date(c.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {c.sentiment && <Badge className={`rounded-full border-0 ${SENT[c.sentiment] ?? ""}`}>{c.sentiment}</Badge>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
