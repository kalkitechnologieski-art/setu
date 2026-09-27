// components/action-form.tsx
"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  type ActionResult,
  ACTION_ERROR_MESSAGES,
} from "@/lib/types/action";
import { Button } from "@/components/ui/button";

// ─── Initial state ────────────────────────────────────────────────────────

type ActionState<T> = ActionResult<T> | null;

// ─── Submit button with pending state ─────────────────────────────────────

function SubmitButton({
  children,
  pendingText = "Submitting…",
}: {
  children: ReactNode;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </Button>
  );
}

// ─── Generic form wrapper ─────────────────────────────────────────────────

interface ActionFormProps<T> {
  /** The Server Action created via withAction(). */
  action: (input: unknown) => Promise<ActionResult<T>>;
  /** Called with the typed data on success. */
  onSuccess?: (data: T) => void;
  /** Renders the form fields; receives fieldErrors for inline display. */
  children: (state: {
    fieldErrors?: Record<string, string[]>;
    pending: boolean;
  }) => ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  className?: string;
}

export function ActionForm<T>({
  action,
  onSuccess,
  children,
  submitLabel = "Submit",
  pendingLabel = "Submitting…",
  className,
}: ActionFormProps<T>) {
  const [state, formAction, isPending] = useActionState<
    ActionState<T>,
    FormData
  >(async (_prev, formData) => {
    // Serialise FormData → plain object so Zod can validate
    const input: Record<string, unknown> = {};
    formData.forEach((value, key) => { input[key] = value; });
    const result = await action(input);
    if (result.success && onSuccess) onSuccess(result.data);
    return result;
  }, null);

  const fieldErrors =
    state && !state.success ? state.fieldErrors : undefined;

  const formErrorMessage =
    state && !state.success
      ? state.message || ACTION_ERROR_MESSAGES[state.error]
      : null;

  const successMessage = state && state.success ? "Success" : null;

  return (
    <form action={formAction} className={className} noValidate>
      {children({ fieldErrors, pending: isPending })}

      {formErrorMessage && (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm text-destructive"
        >
          {formErrorMessage}
        </p>
      )}

      {successMessage && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-emerald-600"
        >
          {successMessage}
        </p>
      )}

      <SubmitButton pendingText={pendingLabel}>{submitLabel}</SubmitButton>
    </form>
  );
}

// ─── Field error helper ───────────────────────────────────────────────────

export function FieldError({
  errors,
  name,
}: {
  errors?: Record<string, string[]>;
  name: string;
}) {
  const messages = errors?.[name];
  if (!messages || messages.length === 0) return null;
  return (
    <p
      role="alert"
      aria-live="polite"
      className="mt-1 text-xs text-destructive"
    >
      {messages[0]}
    </p>
  );
}
