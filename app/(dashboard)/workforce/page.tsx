import { Suspense } from "react";
import {
  BarChart3, Megaphone, Phone, Search, type LucideIcon,
} from "lucide-react";
import { EmployeeStatus } from "@/components/widgets/employee-status";
import { AgentKpiRibbon } from "@/components/widgets/agent-kpi-ribbon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────

type LiveStatus =
  | "idle" | "thinking" | "working"
  | "awaiting_approval" | "error" | "offline";

interface WorkforceEmployee {
  name: string;
  role: string;
  icon: LucideIcon;
  accent: string;
  status: LiveStatus;
  runsToday: number;
  pendingApprovals: number;
  /**
   * Relative-age label — precomputed as a string.
   * We never call `Date.now()` during render (React 19.2 flags this as
   * impure via react-hooks/purity). When this list becomes dynamic, the
   * page will accept `lastRunAt` as a Server-Component prop instead.
   */
  lastRunLabel: string;
}

// ─── Data — pure, no impure function calls at render time ─────────────────

const EMPLOYEES: readonly WorkforceEmployee[] = [
  {
    name: "Arjun",
    role: "Outbound SDR",
    icon: Search,
    accent: "from-violet-500 to-indigo-500",
    status: "working",
    runsToday: 46,
    pendingApprovals: 0,
    lastRunLabel: "just now",
  },
  {
    name: "Meera",
    role: "Voice Agent",
    icon: Phone,
    accent: "from-blue-500 to-cyan-500",
    status: "awaiting_approval",
    runsToday: 32,
    pendingApprovals: 3,
    lastRunLabel: "10m ago",
  },
  {
    name: "Kabir",
    role: "Nurture Writer",
    icon: Megaphone,
    accent: "from-emerald-500 to-teal-500",
    status: "idle",
    runsToday: 25,
    pendingApprovals: 0,
    lastRunLabel: "20m ago",
  },
  {
    name: "Siddhi",
    role: "Performance Lead",
    icon: BarChart3,
    accent: "from-amber-500 to-orange-500",
    status: "thinking",
    runsToday: 39,
    pendingApprovals: 1,
    lastRunLabel: "30m ago",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────

export default function WorkforcePage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
            Workforce
          </h1>
          <p className="text-sm text-muted-foreground">
            Four AI employees running your revenue motions in parallel.
          </p>
        </div>
        <Button variant="gradient" size="sm">Hire agent</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EMPLOYEES.map((e) => (
          <Suspense
            key={e.name}
            fallback={<div className="h-40 rounded-2xl border bg-muted/30" />}
          >
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fleet KPIs — last 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          <AgentKpiRibbon
            kpis={[
              { label: "Total runs", value: "1,284" },
              { label: "Tokens",     value: "4.2M" },
              { label: "Cost",       value: "$38.40" },
              { label: "Success",    value: "97.1%" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
