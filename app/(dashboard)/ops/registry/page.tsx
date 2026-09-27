import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAgents, getFleetSummary } from "@/lib/ops/queries";
import { AgentGridCard } from "@/components/ops/agent-grid-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function RegistryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ops/registry");

  const [agents, summary] = await Promise.all([
    getAgents(user.id),
    getFleetSummary(user.id),
  ]);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/ops" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" /> Back to Operations
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Agent Registry</h1>
          <p className="text-sm text-muted-foreground">
            {summary.totalAgents} agents · {summary.activeAgents} active
          </p>
        </div>
        <Button variant="gradient" size="sm">+ Add agent</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <AgentGridCard
            key={a.id}
            slug={a.slug}
            name={a.name}
            role={a.role}
            description={a.description}
            icon={a.icon}
            autonomy={a.autonomy}
            status={a.status}
          />
        ))}
      </div>
    </div>
  );
}
