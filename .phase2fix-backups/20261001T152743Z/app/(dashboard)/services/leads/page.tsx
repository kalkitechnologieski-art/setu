
import { redirect } from "next/navigation";
import { Search, Target, Phone, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";
import { ServiceHeader } from "@/components/services/service-header";
import { DependencyStrip } from "@/components/services/dependency-strip";
import { ServiceKPIRow } from "@/components/services/service-kpi-row";
import { WorkflowList } from "@/components/services/workflow-list";
import { WidgetBoundary } from "@/components/shared/widget-boundary";

export const dynamic = "force-dynamic";

const OUTGOING = ["assistant"];
const INCOMING = ["email", "calling", "assistant"];

export default async function LeadsServicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/services/leads");

  bootstrapServices();
  const bus = getServiceBus();
  const health = await bus.healthAll();
  const svc = health.find((h) => h.id === "leads");
  if (!svc) redirect("/services");

  const outgoing = health.filter((h) => OUTGOING.includes(h.id));
  const incoming = health.filter((h) => INCOMING.includes(h.id));

  const { count: totalLeads } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const kpis = [
    { label: "Total Leads", value: totalLeads ?? 0, icon: Search, accent: "violet" as const },
    { label: "Email Ready", value: 0, icon: Mail, accent: "blue" as const, hint: "eligible" },
    { label: "Call Ready", value: 0, icon: Phone, accent: "emerald" as const, hint: "eligible" },
    { label: "Providers", value: svc.providers.length, icon: Target, accent: "amber" as const },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <ServiceHeader
        service={svc}
        icon={Search}
        title="Lead Discovery"
        role="Arjun — Outbound SDR"
        description="Finds, enriches, and scores leads against your ICP. Feeds the Email and Calling services with qualified, consented contacts."
        accentClass="from-violet-500 to-indigo-500"
      />

      <WidgetBoundary label="Dependencies">
        <DependencyStrip current={svc} incoming={incoming} outgoing={outgoing} />
      </WidgetBoundary>

      <ServiceKPIRow kpis={kpis} />

      <WidgetBoundary label="Workflows">
        <WorkflowList userId={user.id} serviceId="leads" />
      </WidgetBoundary>
    </div>
  );
}
