import { redirect } from "next/navigation";
import { Radar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignalCard } from "@/components/widgets/signal-card";
import { EmptyState } from "@/components/ui/premium/empty-state";

export const dynamic = "force-dynamic";

interface SignalRow {
  id: string; title: string; description: string | null;
  signal_type: string; source: string; icp_score: number | null; urgency: string | null;
}

export default async function SignalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/signals");

  let signals: SignalRow[] = [];
  try {
    const { data } = await supabase
      .from("signals")
      .select("id, title, description, signal_type, source, icp_score, urgency")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    signals = (data ?? []) as SignalRow[];
  } catch (e) { console.error("[signals]", e); }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">Signals</h1>
        <p className="text-sm text-muted-foreground">
          {signals.length === 0 ? "Buying intent detected across your accounts." : `${signals.length} signal${signals.length === 1 ? "" : "s"} detected.`}
        </p>
      </div>
      {signals.length === 0 ? (
        <EmptyState icon={Radar} title="No signals yet" description="Arjun scans for buying signals. New signals will appear here automatically." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {signals.map((s) => (
            <SignalCard key={s.id} title={s.title} description={s.description ?? undefined}
              signalType={s.signal_type} source={s.source} icpScore={s.icp_score ?? undefined}
              urgency={(s.urgency as "low" | "medium" | "high" | "critical") ?? "medium"} />
          ))}
        </div>
      )}
    </div>
  );
}
