import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPendingChains } from "@/lib/ops/queries";
import { ApprovalChainItem } from "@/components/ops/approval-chain-item";
import { agentGradient } from "@/lib/ops/design";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ops/approvals");

  const chains = await getPendingChains(user.id);

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <Link href="/ops" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3" /> Back to Operations
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Sequential sign-off chains waiting on your team.
        </p>
      </div>

      {chains.length > 0 ? (
        <div className="space-y-3">
          {chains.map((c) => (
            <ApprovalChainItem
              key={c.id}
              summary={`Approval ${c.approval_id.slice(0, 8)} · step ${c.step_index + 1}`}
              agentName={c.required_role}
              agentGradient={agentGradient("siddhi")}
              steps={[
                { role: c.required_role, status: "pending" },
              ]}
              createdAt={new Date(c.created_at).toLocaleString()}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/40 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Inbox className="size-5" />
          </div>
          <div className="text-sm font-semibold">No pending approvals</div>
          <p className="max-w-xs text-xs text-muted-foreground">
            Your agents are running within their autonomy limits. You&apos;ll be notified when a decision is needed.
          </p>
        </div>
      )}
    </div>
  );
}
