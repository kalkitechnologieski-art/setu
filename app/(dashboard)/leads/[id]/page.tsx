import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  contacted: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  qualified: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  converted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  lost: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/leads/${id}`);

  const { data: lead } = await supabase
    .from("leads")
    .select("id, name, email, phone, company, title, status, score, source, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!lead) notFound();

  const [emailsRes, callsRes] = await Promise.all([
    supabase
      .from("emails")
      .select("id, subject, status, sent_at, opened_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("calls")
      .select("id, direction, sentiment, summary, duration_seconds, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const emails = emailsRes.data ?? [];
  const calls = callsRes.data ?? [];

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Back to leads
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-lg font-semibold text-white">
                {(lead.name ?? "?")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {lead.name ?? "Unnamed Lead"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {lead.title ?? ""}
                  {lead.title && lead.company ? " · " : ""}
                  {lead.company ?? ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    className={`rounded-full border-0 text-[10px] ${
                      STATUS_STYLE[lead.status] ?? ""
                    }`}
                  >
                    {lead.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {lead.source}
                  </Badge>
                  <span className="text-xs font-semibold tabular-nums">
                    Score: {lead.score}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${lead.email ?? ""}`}>
                  <Mail className="size-3.5" /> Email
                </a>
              </Button>
              {lead.phone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="size-3.5" /> Call
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Email
              </div>
              <div className="mt-0.5 truncate text-sm">
                {lead.email ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Phone
              </div>
              <div className="mt-0.5 text-sm">{lead.phone ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Created
              </div>
              <div className="mt-0.5 text-sm">
                {new Date(lead.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emails ({emails.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {emails.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No emails yet.
              </p>
            ) : (
              emails.map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border bg-card/60 p-2.5"
                >
                  <div className="truncate text-xs font-medium">
                    {e.subject ?? "(no subject)"}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="capitalize">{e.status}</span>
                    {e.sent_at && (
                      <span>{new Date(e.sent_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calls ({calls.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {calls.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No calls yet.
              </p>
            ) : (
              calls.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border bg-card/60 p-2.5"
                >
                  <div className="truncate text-xs font-medium">
                    {c.summary ?? `${c.direction} call`}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="capitalize">
                      {c.sentiment ?? "neutral"}
                    </span>
                    <span>{c.duration_seconds ?? 0}s</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
