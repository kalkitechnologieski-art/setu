"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInWithPassword, type AuthResult } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  /** Post-sign-in destination. */
  next: string;
}

/**
 * Login form — Client Component.
 *
 * `useActionState` binds the Server Action's `AuthResult` return value to
 * React state, so the action signature `(FormData) => Promise<AuthResult>`
 * works correctly with `<form action={formAction}>` (which expects
 * `(FormData) => void | Promise<void>`).
 */
export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<
    AuthResult | null,
    FormData
  >(async (_prev, formData) => signInWithPassword(formData), null);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          disabled={isPending}
          aria-invalid={state && !state.ok ? true : undefined}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          disabled={isPending}
          aria-invalid={state && !state.ok ? true : undefined}
        />
      </div>

      {state && !state.ok && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          {state.error}
        </div>
      )}

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={isPending}
      >
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
