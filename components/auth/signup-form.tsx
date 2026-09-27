"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpWithEmail } from "@/app/actions/auth";
import type { AuthResult } from "@/lib/auth/result";

export function SignUpForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState<AuthResult | null, FormData>(
    async (_prev, formData) => signUpWithEmail(formData),
    null
  );

  const showSuccess = state?.ok === true;
  const showError = state?.ok === false;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          autoComplete="name"
          placeholder="Aarav Sharma"
          required
          disabled={isPending || showSuccess}
          aria-invalid={showError && state.fieldErrors?.full_name ? true : undefined}
        />
        {showError && state.fieldErrors?.full_name && (
          <p className="text-xs text-destructive">{state.fieldErrors.full_name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          disabled={isPending || showSuccess}
          aria-invalid={showError && state.fieldErrors?.email ? true : undefined}
        />
        {showError && state.fieldErrors?.email && (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 chars, 1 uppercase, 1 number"
          minLength={8}
          required
          disabled={isPending || showSuccess}
          aria-invalid={showError && state.fieldErrors?.password ? true : undefined}
        />
        {showError && state.fieldErrors?.password && (
          <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      {showError && !state.fieldErrors && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {state.message}
        </div>
      )}

      {showSuccess && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          <span>{state.message ?? "Check your email to confirm your account."}</span>
        </div>
      )}

      <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isPending || showSuccess}>
        {isPending ? "Creating…" : showSuccess ? "Check your inbox" : "Create account"}
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </form>
  );
}
