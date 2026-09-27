import Link from "next/link";
import {
  BarChart3, Bot, CheckCircle2, Megaphone, Phone, Search, Shield, Sparkles, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/ui/premium/aurora-background";
import { CtaButton } from "@/components/premium/cta-button";
import { TrustLogos } from "@/components/premium/trust-logos";
import { Testimonials } from "@/components/premium/testimonials";
import { FeatureComparison } from "@/components/premium/feature-comparison";
import { DeviceMockup } from "@/components/premium/device-mockup";
import { SectionHeader } from "@/components/premium/section-header";

const EMPLOYEES = [
  { name: "Arjun",  role: "Outbound SDR",     icon: Search,    accent: "from-violet-500 to-indigo-500", pitch: "Finds, enriches, and scores every lead against your ICP." },
  { name: "Meera",  role: "Voice Agent",      icon: Phone,     accent: "from-blue-500 to-cyan-500",     pitch: "Places AI calls, transcribes, extracts intent in real time." },
  { name: "Kabir",  role: "Nurture Writer",   icon: Megaphone, accent: "from-emerald-500 to-teal-500",  pitch: "Drafts per-channel sequences, personalises, A/B tests." },
  { name: "Siddhi", role: "Performance Lead", icon: BarChart3, accent: "from-amber-500 to-orange-500",  pitch: "Monitors ROAS cross-platform, drafts budget reallocations." },
];

const PILLARS = [
  { icon: Bot,     title: "Four AI employees, one platform", body: "Each agent owns a revenue motion — lead gen, calling, email, ads. They run in parallel, report to you." },
  { icon: Shield,  title: "Human-in-the-loop by default",    body: "Every write pauses for approval. You see the reasoning, the confidence, the payload — then decide." },
  { icon: Zap,     title: "Managed infrastructure",           body: "No servers, no cards. Runs on free-tier APIs. Every credential encrypted in Supabase Vault." },
];

const STEPS = [
  { n: "01", t: "Sign in with Google",    d: "One click. No forms, no passwords." },
  { n: "02", t: "Connect your platforms", d: "Google Ads, YouTube, Meta — scoped OAuth." },
  { n: "03", t: "Watch the workforce run", d: "Approvals land in your inbox. You stay in control." },
];

export default function LandingPage() {
  return (
    <div className="relative">
      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <AuroraBackground opacity={0.55} />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-12 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="size-3.5 text-primary" />
              <span>AI workforce for revenue teams</span>
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              The AI workforce
              <br />
              <span className="gradient-text">that runs your revenue.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Four autonomous employees — lead discovery, voice outreach,
              nurture sequences, and performance marketing — operating in
              parallel from one control plane. You approve. They execute.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <CtaButton href="/signup">Start free</CtaButton>
              <Button variant="outline" size="xl" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>

            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {["No credit card", "Free tier forever", "Set up in 2 minutes"].map((f) => (
                <li key={f} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Mockup */}
          <div className="mt-16">
            <DeviceMockup />
          </div>

          {/* Trust logos */}
          <div className="mt-16 text-center">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Trusted by revenue teams at
            </p>
            <TrustLogos />
          </div>
        </div>
      </section>

      {/* ─── EMPLOYEES ─────────────────────────────────────────────── */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeader
            eyebrow="The workforce"
            title="Four specialists. One control plane."
            description="Each employee owns a distinct revenue motion. They coordinate through a shared supervisor, never stepping on each other."
          />
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {EMPLOYEES.map((e) => {
              const Icon = e.icon;
              return (
                <div
                  key={e.name}
                  className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${e.accent} opacity-30 blur-2xl transition-transform duration-500 group-hover:scale-125`} />
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${e.accent} text-white shadow-sm`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="relative mt-4">
                    <div className="text-sm font-semibold tracking-tight">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.role}</div>
                  </div>
                  <p className="relative mt-3 text-xs leading-relaxed text-muted-foreground">
                    {e.pitch}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── PILLARS ───────────────────────────────────────────────── */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeader
            eyebrow="Why Setu"
            title="Built for teams that ship"
            description="Every architectural decision serves one goal: let you move fast without losing control."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="rounded-2xl border bg-card p-6 transition-all hover:shadow-md hover:shadow-primary/5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/10 text-violet-600 dark:text-violet-400">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold tracking-tight">{p.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ────────────────────────────────────────────── */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeader
            eyebrow="Before / after"
            title="The difference in practice"
            description="Same team, same quota. The work changes; the outcome moves."
          />
          <div className="mx-auto mt-12 max-w-4xl">
            <FeatureComparison />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeader
            eyebrow="Setup"
            title="From zero to running in 2 minutes"
            description="No server provisioning. No API keys to hunt. Connect and go."
          />
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="relative overflow-hidden rounded-2xl border bg-card p-6">
                <div className="pointer-events-none absolute -right-6 -top-6 text-7xl font-bold tabular-nums text-primary/5">
                  {s.n}
                </div>
                <div className="relative text-sm font-semibold tracking-tight">{s.t}</div>
                <p className="relative mt-2 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── TESTIMONIALS ──────────────────────────────────────────── */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeader
            eyebrow="Proof"
            title="What teams say"
            description="Pilot results from revenue teams using Setu in production."
          />
          <div className="mt-12">
            <Testimonials />
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t">
        <AuroraBackground opacity={0.4} />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Start with zero setup
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
            No credit card. No servers. Connect Google or Meta when you&apos;re ready, not before.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <CtaButton href="/signup">Create your workspace</CtaButton>
            <Button variant="outline" size="xl" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
