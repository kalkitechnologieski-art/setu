"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/app/actions/auth";
import type { AuthResult } from "@/lib/auth/result";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthResult | null, FormData>(
    async (_prev, formData) => resetPassword(formData),
    null
  );

  const showSuccess = state?.ok === true;
  const showError = state?.ok === false;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 chars, 1 uppercase, 1 number"
          minLength={8}
          required
          disabled={isPending || showSuccess}
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
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          {state.message}
        </div>
      )}

      <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isPending || showSuccess}>
        {isPending ? "Updating…" : showSuccess ? "Password updated" : "Update password"}
      </Button>
    </form>
  );
}
