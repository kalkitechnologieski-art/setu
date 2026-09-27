import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, Info, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGovernanceEvents } from "@/lib/ops/queries";
import { ACCENT_BY_SEVERITY } from "@/lib/ops/design";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical") return <ShieldAlert className="size-3.5" />;
  if (severity === "warning")  return <AlertTriangle className="size-3.5" />;
  return <Info className="size-3.5" />;
}

export default async function GovernancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ops/governance");

  const events = await getGovernanceEvents(user.id, 200);

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <Link href="/ops" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3" /> Back to Operations
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Governance Ledger</h1>
        <p className="text-sm text-muted-foreground">
          Immutable audit trail. Every agent decision, every human sign-off, every system event.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full">
          <thead className="border-b bg-muted/30">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Severity</th>
              <th className="px-4 py-2.5 font-medium">Actor</th>
              <th className="px-4 py-2.5 font-medium">Event</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Summary</th>
              <th className="px-4 py-2.5 text-right font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const accent = ACCENT_BY_SEVERITY[(e.severity as keyof typeof ACCENT_BY_SEVERITY)] ?? ACCENT_BY_SEVERITY.info;
              return (
                <tr key={e.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      accent.bg, accent.text
                    )}>
                      <SeverityIcon severity={e.severity} />
                      {e.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono">
                      {e.actor_type}:{e.actor_id.slice(0, 12)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium">{e.event_type}</td>
                  <td className="hidden max-w-md truncate px-4 py-2.5 text-xs text-muted-foreground md:table-cell">
                    {e.summary}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  No governance events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
