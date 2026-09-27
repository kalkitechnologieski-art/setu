import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFunnelData } from "@/lib/ops/queries";
import { FunnelChart } from "@/components/widgets/funnel-chart";
import { EmptyState } from "@/components/ui/premium/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/analytics");

  let funnel: Awaited<ReturnType<typeof getFunnelData>> = [];
  try { funnel = await getFunnelData(user.id); }
  catch (e) { console.error("[analytics]", e); }

  const hasData = (funnel[0]?.count ?? 0) > 0;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">Analytics</h1>
        <p className="text-sm text-muted-foreground">Funnel and cohort data from your live pipeline.</p>
      </div>
      {!hasData ? (
        <EmptyState icon={BarChart3} title="No data yet" description="Analytics will populate as leads enter your pipeline." />
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Conversion funnel</CardTitle></CardHeader>
          <CardContent>
            <FunnelChart stages={funnel.map((s, i) => ({
              label: s.stage, value: s.count,
              color: i === 0 ? "from-violet-500 to-violet-400"
                : i === funnel.length - 1 ? "from-emerald-500 to-emerald-400"
                : "from-violet-500 to-blue-500",
            }))} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
