
import { redirect } from "next/navigation";
import { Mail, Send, Reply, AlertTriangle, FileText, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";
import { ServiceHeader } from "@/components/services/service-header";
import { DependencyStrip } from "@/components/services/dependency-strip";
import { ServiceKPIRow } from "@/components/services/service-kpi-row";
import { ServiceActionsGrid } from "@/components/services/service-actions-grid";
import { WorkflowList } from "@/components/services/workflow-list";
import { WidgetBoundary } from "@/components/shared/widget-boundary";

export const dynamic = "force-dynamic";

const OUTGOING = ["leads", "assistant"];
const INCOMING = ["assistant"];

export default async function EmailServicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/services/email");

  bootstrapServices();
  const bus = getServiceBus();
  const health = await bus.healthAll();
  const svc = health.find((h) => h.id === "email");
  if (!svc) redirect("/services");

  const outgoing = health.filter((h) => OUTGOING.includes(h.id));
  const incoming = health.filter((h) => INCOMING.includes(h.id));

  const { count: sentCount } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .not("sent_at", "is", null);

  const { count: replyCount } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .not("replied_at", "is", null);

  const { count: bounceCount } = await supabase
    .from("email_bounces")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const kpis = [
    { label: "Sent", value: sentCount ?? 0, icon: Send, accent: "violet" as const },
    { label: "Replies", value: replyCount ?? 0, icon: Reply, accent: "emerald" as const },
    { label: "Bounces", value: bounceCount ?? 0, icon: AlertTriangle, accent: "rose" as const },
    { label: "Providers", value: svc.providers.length, icon: Mail, accent: "amber" as const },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <ServiceHeader
        service={svc}
        icon={Mail}
        title="Email Outreach"
        role="Kabir — Nurture Writer"
        description="Drafts, personalises, and sends per-channel sequences. Consumes leads from Arjun and hands positive replies to Meera for calls."
        accentClass="from-emerald-500 to-teal-500"
        actions={[
          { label: "New sequence", href: "/content", variant: "gradient", icon: FileText },
          { label: "Deliverability", href: "/content", variant: "outline", icon: BarChart3 },
        ]}
      />

      <WidgetBoundary label="Dependencies">
        <DependencyStrip current={svc} incoming={incoming} outgoing={outgoing} />
      </WidgetBoundary>

      <ServiceKPIRow kpis={kpis} />

      <WidgetBoundary label="Quick actions">
        <ServiceActionsGrid
          actions={[
            { label: "Build sequence", href: "/content", description: "Visual sequence editor" },
            { label: "View templates", href: "/content", description: "Manage email variants" },
            { label: "Check replies", href: "/inbox", description: "Classified reply inbox" },
            { label: "Deliverability", href: "/content", description: "SPF/DKIM/DMARC status" },
          ]}
        />
      </WidgetBoundary>

      <WidgetBoundary label="Workflows">
        <WorkflowList userId={user.id} serviceId="email" />
      </WidgetBoundary>
    </div>
  );
}
