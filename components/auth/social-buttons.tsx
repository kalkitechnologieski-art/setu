"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/premium/loading-dots";
import { signInWithOAuth } from "@/app/actions/auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.55v-2.1c-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.69.42.36.78 1.06.78 2.14v3.18c0 .3.21.66.8.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function SocialButtons({ next }: { next?: string }) {
  const [pending, setPending] = useState<"google" | "github" | null>(null);
  const [isPending, startTransition] = useTransition();

  function handle(provider: "google" | "github") {
    setPending(provider);
    startTransition(async () => {
      try {
        await signInWithOAuth(provider, next);
      } catch {
        setPending(null);
      }
    });
  }

  const disabled = pending !== null || isPending;

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full justify-center gap-3"
        disabled={disabled}
        onClick={() => handle("google")}
      >
        {pending === "google" ? <LoadingDots /> : <GoogleIcon />}
        <span>Continue with Google</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full justify-center gap-3"
        disabled={disabled}
        onClick={() => handle("github")}
      >
        {pending === "github" ? <LoadingDots /> : <GitHubIcon />}
        <span>Continue with GitHub</span>
      </Button>
    </div>
  );
}
