import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlatformCard } from "@/components/auth/platform-card";

export const dynamic = "force-dynamic";

export default function ConnectPage() {
  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Back to dashboard
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Connect your platforms
        </h1>
        <p className="text-sm text-muted-foreground">
          Your AI employees use these connections to read performance data and
          apply approved changes. Add only what you need.
        </p>
      </header>

      <div className="space-y-3">
        <PlatformCard
          provider="google_ads"
          name="Google Ads"
          description="Campaign performance, keyword data, budget reallocation."
          scopes={["adwords"]}
        />
        <PlatformCard
          provider="youtube"
          name="YouTube"
          description="Channel analytics, video performance, audience insights."
          scopes={["youtube.readonly", "youtube.force-ssl"]}
        />
        <PlatformCard
          provider="meta_ads"
          name="Meta Business"
          description="Facebook + Instagram ads, pages, audiences."
          scopes={["ads_management", "ads_read", "business_management"]}
        />
      </div>

      <div className="rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
        <strong className="font-semibold text-foreground">Note on Google:</strong>{" "}
        if your OAuth consent screen is in <em>Testing</em> mode, refresh tokens
        expire every 7 days. Publish the app in Google Cloud Console to receive
        long-lived tokens.
      </div>
    </div>
  );
}
