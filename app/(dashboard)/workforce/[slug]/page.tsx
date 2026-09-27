import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAgents, getAgentRunHistory } from "@/lib/ops/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  running: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  failed: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  pending_approval: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export default async function AgentDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/workforce/${slug}`);

  const agents = await getAgents(user.id);
  const agent = agents.find((a) => a.slug === slug);
  if (!agent) notFound();

  const runs = await getAgentRunHistory(user.id, slug, 40);

  const totalRuns = runs.length;
  const completed = runs.filter((r) => r.status === "completed").length;
  const failed = runs.filter((r) => r.status === "failed").length;
  const successRate = totalRuns > 0 ? (completed / totalRuns) * 100 : 100;
  const avgDuration =
    totalRuns > 0
      ? Math.round(runs.reduce((s, r) => s + r.durationMs, 0) / totalRuns)
      : 0;

  return (
    <div className="space-y-5 animate-fade-up">
      <Link
        href="/workforce"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Back to workforce
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-lg font-semibold text-white">
            {agent.name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {agent.name}
            </h1>
            <p className="text-sm text-muted-foreground">{agent.role}</p>
            {agent.description && (
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                {agent.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="rounded-full border-0 text-[10px]" variant="outline">
            Autonomy: {agent.autonomy}
          </Badge>
          <Badge
            className="rounded-full border-0 text-[10px]"
            variant="outline"
          >
            Status: {agent.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold tabular-nums">
              {totalRuns}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Total runs
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold tabular-nums">
              {successRate.toFixed(0)}%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Success rate
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold tabular-nums">
              {failed}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Failed runs
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold tabular-nums">
              {avgDuration}ms
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Avg duration
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No runs yet. This agent hasn&apos;t been triggered.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Tokens</th>
                    <th className="px-4 py-2.5 font-medium">Duration</th>
                    <th className="px-4 py-2.5 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2.5">
                        <Badge
                          className={`rounded-full border-0 text-[10px] ${
                            STATUS_STYLE[r.status] ?? ""
                          }`}
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                        {r.tokensUsed.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                        {r.durationMs}ms
                      </td>
                      <td className="px-4 py-2.5 text-right text-[10px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
