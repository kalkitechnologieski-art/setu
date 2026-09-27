"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { signUpWithPassword, type AuthResult } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Signup form — Client Component.
 *
 * On success the Server Action returns `{ ok: true, message }` (no redirect,
 * since the user must confirm email first). We render the message inline.
 */
export function SignupForm() {
  const [state, formAction, isPending] = useActionState<
    AuthResult | null,
    FormData
  >(async (_prev, formData) => signUpWithPassword(formData), null);

  const showSuccess = state?.ok === true;
  const showError = state?.ok === false;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          autoComplete="name"
          placeholder="Aarav Sharma"
          disabled={isPending}
        />
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
          disabled={isPending}
          aria-invalid={showError ? true : undefined}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
          disabled={isPending}
          aria-invalid={showError ? true : undefined}
        />
      </div>

      {showError && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          {state.error}
        </div>
      )}

      {showSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          <span>{state.message ?? "Check your email to confirm your account."}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={isPending || showSuccess}
      >
        {isPending ? "Creating…" : showSuccess ? "Check your inbox" : "Create account"}
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </form>
  );
}
