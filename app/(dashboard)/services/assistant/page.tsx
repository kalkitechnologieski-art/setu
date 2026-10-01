
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, MessageSquare, Zap, Target, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";
import { countRows } from "@/lib/db/untyped";
import { ServiceHeader } from "@/components/services/service-header";
import { DependencyStrip } from "@/components/services/dependency-strip";
import { ServiceKPIRow } from "@/components/services/service-kpi-row";
import { ServiceActionsGrid } from "@/components/services/service-actions-grid";
import { WorkflowList } from "@/components/services/workflow-list";
import { WidgetBoundary } from "@/components/shared/widget-boundary";

export const dynamic = "force-dynamic";

const OUTGOING = ["leads", "email", "calling", "performance"];
const INCOMING: string[] = [];

export default async function AssistantServicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/services/assistant");

  bootstrapServices();
  const bus = getServiceBus();
  const health = await bus.healthAll();
  const svc = health.find((h) => h.id === "assistant");
  if (!svc) redirect("/services");

  const outgoing = health.filter((h) => OUTGOING.includes(h.id));
  const incoming = health.filter((h) => INCOMING.includes(h.id));

  // Use untyped count for siddhi_messages (not yet in types.ts)
  const msgCount = await countRows("siddhi_messages", {});

  const { count: briefCount } = await supabase
    .from("briefings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const kpis = [
    { label: "Messages", value: msgCount, icon: MessageSquare, accent: "violet" as const },
    { label: "Briefings", value: briefCount ?? 0, icon: Sparkles, accent: "emerald" as const },
    { label: "Providers", value: svc.providers.length, icon: Zap, accent: "amber" as const },
    { label: "Consumers", value: incoming.length, icon: Target, accent: "blue" as const },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <ServiceHeader
        service={svc}
        icon={Sparkles}
        title="Siddhi Assistant"
        role="Orchestration layer"
        description="Coordinates all four AI employees. Falls back gracefully across Groq, Gemini, OpenRouter, and Modal when providers fail."
        accentClass="from-violet-500 to-blue-500"
      />

      <WidgetBoundary label="Dependencies">
        <DependencyStrip current={svc} incoming={incoming} outgoing={outgoing} />
      </WidgetBoundary>

      <ServiceKPIRow kpis={kpis} />

      <WidgetBoundary label="Quick actions">
        <ServiceActionsGrid
          actions={[
            { label: "Open Siddhi", href: "/dashboard", description: "Chat with the assistant" },
            { label: "Generate briefing", href: "/dashboard", description: "7-section daily report" },
            { label: "View traces", href: "/ops/activity", description: "Agent run history" },
            { label: "Configure providers", href: "/ops/services", description: "LLM chain order" },
          ]}
        />
      </WidgetBoundary>

      <WidgetBoundary label="Workflows">
        <WorkflowList userId={user.id} serviceId="assistant" />
      </WidgetBoundary>

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Cross-service orchestration
            </div>
            <p className="text-xs text-muted-foreground">
              Siddhi coordinates all services through the shared bus.
            </p>
          </div>
          <Link
            href="/ops/services"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Service health <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
