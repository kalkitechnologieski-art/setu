import { Suspense } from "react";
import Link from "next/link";
import {
  BarChart3, DollarSign, Megaphone, Phone, Search, Sparkles, Target, Users,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { Widget } from "@/components/dashboard/widget";
import { EmployeeStatus } from "@/components/widgets/employee-status";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const SERIES = Array.from({ length: 14 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  const base = 20 + i * 3;
  return {
    date: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
    leads: base + Math.floor(Math.random() * 12),
    conversions: Math.floor(base * 0.3) + Math.floor(Math.random() * 4),
  };
});

const RECENT = [
  { name: "Aarav Sharma", company: "Acme Industries", status: "Qualified", score: 82, at: "2m ago" },
  { name: "Diya Patel",   company: "BrightTech",      status: "Contacted", score: 65, at: "18m ago" },
  { name: "Vihaan Reddy", company: "Nexus AI",        status: "New",       score: 40, at: "1h ago" },
  { name: "Ananya Iyer",  company: "Vertex Labs",     status: "Qualified", score: 78, at: "3h ago" },
  { name: "Kabir Mehta",  company: "Solaris Group",   status: "Converted", score: 91, at: "5h ago" },
];

const QUICK_ACTIONS = [
  { label: "Find 100 leads matching my ICP", icon: Search,    href: "/signals",     accent: "from-violet-500 to-indigo-500" },
  { label: "Call my hot leads",              icon: Phone,     href: "/calls",       accent: "from-blue-500 to-cyan-500" },
  { label: "Draft a follow-up sequence",     icon: Megaphone, href: "/inbox",       accent: "from-emerald-500 to-teal-500" },
  { label: "Audit my ad spend",              icon: BarChart3, href: "/performance", accent: "from-amber-500 to-orange-500" },
];

const EMPLOYEE_ROW = [
  { name: "Arjun",  role: "Outbound SDR",     icon: Search,    accent: "from-violet-500 to-indigo-500", status: "working"           as const, runsToday: 46, pendingApprovals: 0, lastRunLabel: "just now" },
  { name: "Meera",  role: "Voice Agent",      icon: Phone,     accent: "from-blue-500 to-cyan-500",     status: "awaiting_approval" as const, runsToday: 32, pendingApprovals: 3, lastRunLabel: "10m ago" },
  { name: "Kabir",  role: "Nurture Writer",   icon: Megaphone, accent: "from-emerald-500 to-teal-500",  status: "idle"              as const, runsToday: 25, pendingApprovals: 0, lastRunLabel: "20m ago" },
  { name: "Siddhi", role: "Performance Lead", icon: BarChart3, accent: "from-amber-500 to-orange-500",  status: "thinking"          as const, runsToday: 39, pendingApprovals: 1, lastRunLabel: "30m ago" },
];

export default function DashboardPage() {
  const totalLeads = SERIES.reduce((s, p) => s + p.leads, 0);
  const totalConv  = SERIES.reduce((s, p) => s + p.conversions, 0);
  const convRate   = totalLeads > 0 ? ((totalConv / totalLeads) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-5 md:space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Your workforce handled 47 decisions while you were away.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/inbox"><Sparkles className="size-4" /> Open Inbox</Link>
          </Button>
          <Button variant="gradient" size="sm" asChild>
            <Link href="/workforce">Open Workforce</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {EMPLOYEE_ROW.map((e) => (
          <Suspense key={e.name} fallback={<div className="h-40 rounded-2xl border bg-muted/30" />}>
            <EmployeeStatus
              name={e.name}
              role={e.role}
              icon={e.icon}
              accent={e.accent}
              status={e.status}
              runsToday={e.runsToday}
              pendingApprovals={e.pendingApprovals}
              lastRunLabel={e.lastRunLabel}
            />
          </Suspense>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard label="Total Leads"  value={totalLeads.toLocaleString()} delta={12.4} icon={Users}      accent="violet"  hint="14d" />
        <StatCard label="Conversions"  value={totalConv.toLocaleString()}  delta={8.1}  icon={Target}     accent="emerald" hint="14d" />
        <StatCard label="Conv. Rate"   value={`${convRate}%`}              delta={2.3}  icon={BarChart3}  accent="blue"    hint="vs prior" />
        <StatCard label="Ad Spend"     value="₹1.24L"                      delta={-4.2} icon={DollarSign} accent="amber"   hint="30d" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              href={a.href}
              className="group relative overflow-hidden rounded-2xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${a.accent} opacity-30 blur-2xl transition-transform group-hover:scale-125`} />
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${a.accent} text-white shadow-sm`}>
                <Icon className="size-5" />
              </div>
              <div className="relative mt-3 text-sm font-semibold leading-snug">{a.label}</div>
              <div className="relative mt-1 text-xs text-primary">Open →</div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnalyticsChart data={SERIES} />
        </div>

        <Widget
          title="Recent Activity"
          description="Live pipeline events"
          icon={Users}
          action={
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/leads">View all</Link>
            </Button>
          }
        >
          <ul className="space-y-2.5">
            {RECENT.map((lead) => (
              <li
                key={lead.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-[10px] font-semibold text-white">
                    {lead.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{lead.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {lead.company} · {lead.at}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {lead.status}
                </span>
              </li>
            ))}
          </ul>
        </Widget>
      </div>
    </div>
  );
}
