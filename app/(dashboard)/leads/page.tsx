import { Filter, Plus, Search } from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const DEMO = [
  { name: "Aarav Sharma",  email: "aarav@acme.in",     company: "Acme Industries", status: "qualified", score: 82 },
  { name: "Diya Patel",    email: "diya@brighttech.io",company: "BrightTech",      status: "contacted", score: 65 },
  { name: "Vihaan Reddy",  email: "vihaan@nexus.ai",   company: "Nexus AI",        status: "new",       score: 40 },
  { name: "Ananya Iyer",   email: "ananya@vertex.dev", company: "Vertex Labs",     status: "qualified", score: 78 },
  { name: "Kabir Mehta",   email: "kabir@solaris.co",  company: "Solaris Group",   status: "converted", score: 91 },
  { name: "Isha Kapoor",   email: "isha@quantum.in",   company: "Quantum",         status: "lost",      score: 22 },
];

const statusStyle: Record<string, string> = {
  new:       "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  contacted: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  qualified: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  converted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  lost:      "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default function LeadsPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {DEMO.length} active leads across your pipeline.
          </p>
        </div>
        <Button variant="gradient" size="sm">
          <Plus className="size-4" /> New Lead
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">All Leads</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search…" className="h-9 w-[220px] pl-9" />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="size-4" /> Filter
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO.map((row) => (
                  <TableRow key={row.email} className="cursor-pointer transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-semibold text-white">
                          {row.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{row.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{row.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.company}</TableCell>
                    <TableCell>
                      <Badge className={`rounded-full border-0 ${statusStyle[row.status]}`}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                            style={{ width: `${row.score}%` }}
                          />
                        </div>
                        <span className="w-8 text-xs font-semibold tabular-nums">{row.score}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

