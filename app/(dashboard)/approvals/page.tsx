import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ApprovalCard } from "@/components/widgets/approval-card";
import { EmptyState } from "@/components/ui/premium/empty-state";

export const dynamic = "force-dynamic";

interface ApprovalRow {
  id: string; agent_name: string; action: string;
  reasoning: string | null; confidence: number | null;
}

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/approvals");

  let approvals: ApprovalRow[] = [];
  try {
    const { data } = await supabase
      .from("approvals")
      .select("id, agent_name, action, reasoning, confidence")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    approvals = (data ?? []) as ApprovalRow[];
  } catch (e) { console.error("[approvals]", e); }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          {approvals.length === 0 ? "Nothing waiting." : `${approvals.length} decision${approvals.length === 1 ? "" : "s"} need your sign-off.`}
        </p>
      </div>
      {approvals.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="All caught up" description="When an agent needs your approval, it will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {approvals.map((a) => (
            <ApprovalCard key={a.id} approvalId={a.id} agentName={a.agent_name}
              action={a.action} summary={a.action} reasoning={a.reasoning ?? undefined}
              confidence={a.confidence ?? undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
