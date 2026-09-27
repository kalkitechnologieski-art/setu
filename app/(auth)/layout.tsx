import Link from "next/link";
import { Sparkles, Shield, Zap, TrendingUp } from "lucide-react";
import { AuroraBackground } from "@/components/ui/premium/aurora-background";

const HIGHLIGHTS = [
  { icon: Zap,          text: "Four AI employees running in parallel" },
  { icon: TrendingUp,   text: "Cross-platform ads, one control plane" },
  { icon: Shield,       text: "Every write gated by human approval" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-background">
      {/* ── Left panel: brand + gradient ───────────────────────────────── */}
      <aside className="relative hidden w-1/2 overflow-hidden lg:block">
        <AuroraBackground opacity={0.7} />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white shadow-lg">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight gradient-text">
                Setu Kalki
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Intelligence OS
              </div>
            </div>
          </Link>

          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              The AI workforce
              <br />
              that runs your revenue.
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Sign in to orchestrate four autonomous employees — lead discovery,
              voice outreach, nurture sequences, and performance marketing —
              from one control plane.
            </p>

            <ul className="space-y-3">
              {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-muted-foreground">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Setu Kalki Intelligence
          </p>
        </div>
      </aside>

      {/* ── Right panel: form ─────────────────────────────────────────── */}
      <main className="relative flex w-full flex-1 items-center justify-center px-4 py-12 lg:w-1/2 lg:px-12">
        {/* Mobile brand mark */}
        <Link
          href="/"
          className="absolute left-4 top-6 flex items-center gap-2 lg:hidden"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="text-sm font-semibold gradient-text">Setu Kalki</span>
        </Link>

        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
