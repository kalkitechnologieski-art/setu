import Link from "next/link";
import { redirect } from "next/navigation";
import { Filter, Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/premium/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

interface LeadRow {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  status: string;
  score: number;
  source: string;
}

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  contacted: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  qualified: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  converted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  lost: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const statusFilter = params.status ?? "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/leads");

  let query = supabase
    .from("leads")
    .select("id, name, email, company, status, score, source")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (q) {
    query = query.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`
    );
  }

  const { data } = await query;
  const leads = (data ?? []) as LeadRow[];

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
            Leads
          </h1>
          <p className="text-sm text-muted-foreground">
            {leads.length === 0
              ? "Every lead from every source, in one pipeline."
              : `${leads.length} lead${leads.length === 1 ? "" : "s"} in your pipeline.`}
          </p>
        </div>
      </div>

      {leads.length === 0 && !q && !statusFilter ? (
        <EmptyState
          icon={Users}
          title="No leads yet"
          description="Import a CSV, connect a platform, or ask Arjun to find leads matching your ICP."
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">
              {leads.length} lead{leads.length === 1 ? "" : "s"}
            </CardTitle>
            <form className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search leads…"
                  className="h-9 w-[200px] pl-9"
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                <Filter className="size-4" /> Filter
              </Button>
            </form>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Lead</th>
                    <th className="px-4 py-2.5 font-medium">Company</th>
                    <th className="px-4 py-2.5 font-medium">Source</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/leads/${l.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-[10px] font-semibold text-white">
                            {(l.name ?? "?")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium group-hover:text-primary">
                              {l.name ?? "Unnamed"}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {l.email ?? "—"}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {l.company ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {l.source}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`rounded-full border-0 text-[10px] ${
                            STATUS_STYLE[l.status] ?? ""
                          }`}
                        >
                          {l.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                              style={{ width: `${l.score}%` }}
                            />
                          </div>
                          <span className="w-8 text-xs font-semibold tabular-nums">
                            {l.score}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
