
import { redirect } from "next/navigation";
import { Phone, PhoneOutgoing, Heart, Target, Mic, FileAudio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";
import { ServiceHeader } from "@/components/services/service-header";
import { DependencyStrip } from "@/components/services/dependency-strip";
import { ServiceKPIRow } from "@/components/services/service-kpi-row";
import { ServiceActionsGrid } from "@/components/services/service-actions-grid";
import { WorkflowList } from "@/components/services/workflow-list";
import { WidgetBoundary } from "@/components/shared/widget-boundary";

export const dynamic = "force-dynamic";

const OUTGOING = ["leads", "email", "assistant"];
const INCOMING = ["assistant"];

export default async function CallingServicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/services/calling");

  bootstrapServices();
  const bus = getServiceBus();
  const health = await bus.healthAll();
  const svc = health.find((h) => h.id === "calling");
  if (!svc) redirect("/services");

  const outgoing = health.filter((h) => OUTGOING.includes(h.id));
  const incoming = health.filter((h) => INCOMING.includes(h.id));

  const { count: totalCalls } = await supabase
    .from("calls")
    .select("id", { count: "exact", head: true })
    .eq("direction", "outbound");

  const { count: positiveCalls } = await supabase
    .from("calls")
    .select("id", { count: "exact", head: true })
    .eq("sentiment", "positive");

  const kpis = [
    { label: "Calls Placed", value: totalCalls ?? 0, icon: PhoneOutgoing, accent: "violet" as const },
    { label: "Positive", value: positiveCalls ?? 0, icon: Heart, accent: "emerald" as const },
    { label: "Queue", value: 0, icon: Phone, accent: "amber" as const, hint: "pending" },
    { label: "Providers", value: svc.providers.length, icon: Target, accent: "blue" as const },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <ServiceHeader
        service={svc}
        icon={Phone}
        title="Voice Outreach"
        role="Meera — Voice Agent"
        description="Places AI calls, transcribes, and extracts intent in real time. Hands positive calls back to Kabir for email follow-ups."
        accentClass="from-blue-500 to-cyan-500"
        actions={[
          { label: "Call queue", href: "/calls", variant: "gradient", icon: Mic },
          { label: "Transcripts", href: "/calls", variant: "outline", icon: FileAudio },
        ]}
      />

      <WidgetBoundary label="Dependencies">
        <DependencyStrip current={svc} incoming={incoming} outgoing={outgoing} />
      </WidgetBoundary>

      <ServiceKPIRow kpis={kpis} />

      <WidgetBoundary label="Quick actions">
        <ServiceActionsGrid
          actions={[
            { label: "View queue", href: "/calls", description: "Priority call order" },
            { label: "Browse transcripts", href: "/calls", description: "Searchable + sentiment" },
            { label: "Edit scripts", href: "/calls", description: "Objection handlers" },
            { label: "Call analytics", href: "/calls", description: "Dials, connects, conversions" },
          ]}
        />
      </WidgetBoundary>

      <WidgetBoundary label="Workflows">
        <WorkflowList userId={user.id} serviceId="calling" />
      </WidgetBoundary>
    </div>
  );
}
