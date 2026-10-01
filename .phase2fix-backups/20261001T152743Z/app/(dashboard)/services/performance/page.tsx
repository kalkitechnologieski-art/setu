
import { redirect } from "next/navigation";
import { BarChart3, DollarSign, TrendingUp, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";
import { ServiceHeader } from "@/components/services/service-header";
import { DependencyStrip } from "@/components/services/dependency-strip";
import { ServiceKPIRow } from "@/components/services/service-kpi-row";
import { WorkflowList } from "@/components/services/workflow-list";
import { WidgetBoundary } from "@/components/shared/widget-boundary";

export const dynamic = "force-dynamic";

const OUTGOING = ["assistant"];
const INCOMING = ["assistant"];

export default async function PerformanceServicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/services/performance");

  bootstrapServices();
  const bus = getServiceBus();
  const health = await bus.healthAll();
  const svc = health.find((h) => h.id === "performance");
  if (!svc) redirect("/services");

  const outgoing = health.filter((h) => OUTGOING.includes(h.id));
  const incoming = health.filter((h) => INCOMING.includes(h.id));

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: perf } = await supabase
    .from("ad_performance")
    .select("spend, conversions, roas")
    .eq("user_id", user.id)
    .gte("synced_at", since);

  const totalSpend = (perf ?? []).reduce((s, p) => s + Number(p.spend), 0);
  const totalConv = (perf ?? []).reduce((s, p) => s + p.conversions, 0);
  const avgRoas =
    (perf ?? []).length > 0
      ? (perf ?? []).reduce((s, p) => s + Number(p.roas), 0) / (perf ?? []).length
      : 0;

  const kpis = [
    { label: "Spend (30d)", value: `₹${(totalSpend / 1000).toFixed(1)}K`, icon: DollarSign, accent: "violet" as const },
    { label: "Conversions", value: totalConv, icon: Target, accent: "emerald" as const },
    { label: "Avg ROAS", value: `${avgRoas.toFixed(2)}x`, icon: TrendingUp, accent: "amber" as const },
    { label: "Providers", value: svc.providers.length, icon: BarChart3, accent: "blue" as const },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <ServiceHeader
        service={svc}
        icon={BarChart3}
        title="Performance Marketing"
        role="Siddhi — Performance Marketing Lead"
        description="Monitors ROAS across platforms and drafts budget reallocations. Gates on Google Ads and Meta Ads OAuth connections."
        accentClass="from-amber-500 to-orange-500"
      />

      <WidgetBoundary label="Dependencies">
        <DependencyStrip current={svc} incoming={incoming} outgoing={outgoing} />
      </WidgetBoundary>

      <ServiceKPIRow kpis={kpis} />

      <WidgetBoundary label="Workflows">
        <WorkflowList userId={user.id} serviceId="performance" />
      </WidgetBoundary>
    </div>
  );
}
