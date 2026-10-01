
import Link from "next/link";
import { Play, Plus, Workflow, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { queryRows } from "@/lib/db/untyped";

interface WorkflowListProps {
  userId: string;
  serviceId: string;
}

interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger_type: string;
}

export async function WorkflowList({ userId, serviceId }: WorkflowListProps) {
  const rows = await queryRows(
    "service_workflows",
    { user_id: userId, service_id: serviceId },
    { orderBy: "created_at", limit: 20 }
  );
  const workflows = rows as unknown as WorkflowRow[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Workflow className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Workflows</CardTitle>
        </div>
        <Link
          href={`/services/${serviceId}/workflows`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-dashed bg-card/40 px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground">
                No workflows configured yet.
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Workflows chain multiple services together — e.g. Lead search
                → Email draft → WhatsApp follow-up.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href={`/services/${serviceId}/workflows/new`}
                className="group flex items-center gap-3 rounded-xl border bg-card/40 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-blue-500/10 text-violet-600 dark:text-violet-400">
                  <Plus className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Create workflow</div>
                  <div className="text-[10px] text-muted-foreground">
                    Chain services into a DAG
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>

              <Link
                href={`/services/${serviceId}/workflows/templates`}
                className="group flex items-center gap-3 rounded-xl border bg-card/40 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400">
                  <Workflow className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Use template</div>
                  <div className="text-[10px] text-muted-foreground">
                    Start from a pre-built flow
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {workflows.map((wf) => (
              <li key={wf.id}>
                <Link
                  href={`/services/${serviceId}/workflows/${wf.id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border bg-card/60 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {wf.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="h-4 text-[10px] uppercase"
                      >
                        {wf.trigger_type}
                      </Badge>
                      {!wf.enabled && (
                        <Badge
                          variant="outline"
                          className="h-4 text-[10px] uppercase text-slate-500"
                        >
                          paused
                        </Badge>
                      )}
                    </div>
                    {wf.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {wf.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="inline size-3" /> Run
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
