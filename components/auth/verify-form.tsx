"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyEmailOtp } from "@/app/actions/auth";
import type { AuthResult } from "@/lib/auth/result";

export function VerifyForm({ email }: { email: string }) {
  const [state, formAction, isPending] = useActionState<AuthResult | null, FormData>(
    async (_prev, formData) => verifyEmailOtp(formData),
    null
  );

  const showError = state?.ok === false;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="email" value={email} />

      <div className="space-y-2">
        <Label htmlFor="token">6-digit code</Label>
        <Input
          id="token"
          name="token"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="123456"
          required
          disabled={isPending}
          className="text-center text-lg tracking-[0.5em]"
        />
      </div>

      {showError && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {state.message}
        </div>
      )}

      <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Verifying…" : "Verify email"}
      </Button>
    </form>
  );
}
