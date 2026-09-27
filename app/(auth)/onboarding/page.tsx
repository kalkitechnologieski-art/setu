import Link from "next/link";
import {
  ArrowRight, BarChart3, CheckCircle2, Plug, Search, Sparkles, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { GuideTip } from "@/components/guided/guide-tip";
import { StepWizard } from "@/components/guided/step-wizard";

export const dynamic = "force-dynamic";

const WIZARD_STEPS = [
  { id: "welcome",  label: "Welcome" },
  { id: "connect",  label: "Connect" },
  { id: "icp",      label: "ICP" },
  { id: "launch",   label: "Launch" },
];

const TASKS = [
  {
    key: "connect",
    icon: Plug,
    title: "Connect a platform",
    description:
      "Link Google Ads or Meta to enable performance marketing. You can add more later.",
    href: "/connect",
    cta: "Connect platforms",
    time: "~1 min",
    accent: "from-violet-500 to-indigo-500",
  },
  {
    key: "icp",
    icon: Search,
    title: "Define your ICP",
    description:
      "Tell Arjun who your ideal customer is. Two sentences is enough to start.",
    href: "/settings",
    cta: "Set up ICP",
    time: "~2 min",
    accent: "from-blue-500 to-cyan-500",
  },
  {
    key: "launch",
    icon: BarChart3,
    title: "Launch your first campaign",
    description:
      "Siddhi audits your ad accounts and drafts a reallocation. You approve with one click.",
    href: "/performance",
    cta: "Open performance",
    time: "~30 sec",
    accent: "from-emerald-500 to-teal-500",
  },
  {
    key: "team",
    icon: Users,
    title: "Meet your workforce",
    description:
      "Tour the four AI employees. See what each one does and how to direct them.",
    href: "/workforce",
    cta: "Open workforce",
    time: "~1 min",
    accent: "from-amber-500 to-orange-500",
  },
];

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? "";

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          Account created
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome{name ? `, ${name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Four quick steps to get your AI workforce running. Each is optional —
          nothing blocks you.
        </p>
      </header>

      {/* Wizard */}
      <StepWizard steps={WIZARD_STEPS} currentIndex={1} />

      {/* Guided tip */}
      <GuideTip
        title="Start with one task"
        body="The fastest path is Connect → ICP. That unlocks Arjun and Siddhi. Everything else can wait."
      />

      {/* Tasks */}
      <ol className="space-y-3">
        {TASKS.map((task, i) => {
          const Icon = task.icon;
          return (
            <li
              key={task.key}
              className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:shadow-md hover:shadow-primary/5"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${task.accent} text-white shadow-sm`}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold tracking-tight">
                      <span className="mr-2 text-xs tabular-nums text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {task.title}
                    </h3>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {task.time}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {task.description}
                  </p>
                  <div className="mt-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={task.href}>
                        {task.cta} <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </Link>
        <Button variant="gradient" size="sm" asChild>
          <Link href="/connect">
            <Sparkles className="size-3.5" /> Connect a platform
          </Link>
        </Button>
      </div>
    </div>
  );
}
