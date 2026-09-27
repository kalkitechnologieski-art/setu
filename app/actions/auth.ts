"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrigin, callbackUrl } from "@/lib/auth/urls";
import {
  SignUpSchema,
  SignInSchema,
  MagicLinkSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyOtpSchema,
} from "@/lib/schemas/auth";
import {
  authSuccess,
  authFailure,
  type AuthResult,
  type AuthErrorCode,
} from "@/lib/auth/result";

// ─── Helpers ──────────────────────────────────────────────────────────────

function mapSupabaseAuthError(message: string, status?: number): AuthErrorCode {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "INVALID_CREDENTIALS";
  if (m.includes("email not confirmed"))       return "EMAIL_NOT_CONFIRMED";
  if (m.includes("already registered") || m.includes("user already")) return "EMAIL_IN_USE";
  if (m.includes("password") && m.includes("weak")) return "WEAK_PASSWORD";
  if (m.includes("rate limit") || status === 429)   return "RATE_LIMITED";
  if (m.includes("session") && m.includes("expired")) return "SESSION_EXPIRED";
  if (m.includes("oauth"))                     return "OAUTH_ERROR";
  return "UPSTREAM_ERROR";
}

function zodFieldErrors(flat: { fieldErrors: Record<string, string[] | undefined> }): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(flat.fieldErrors)) {
    if (v && v.length) out[k] = v;
  }
  return out;
}

// ─── SIGN UP ──────────────────────────────────────────────────────────────
// Creates an account. Supabase sends a confirmation email by default.
// The callback route exchanges the confirmation link for a session.

export async function signUpWithEmail(formData: FormData): Promise<AuthResult> {
  const raw = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    full_name: String(formData.get("full_name") ?? "").trim(),
    next: String(formData.get("next") ?? "").trim() || undefined,
  };

  const parsed = SignUpSchema.safeParse(raw);
  if (!parsed.success) {
    return authFailure(
      "VALIDATION_ERROR",
      "Please check the highlighted fields.",
      zodFieldErrors(parsed.error.flatten())
    );
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { email, password, full_name, next } = parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl(origin, next ?? "/onboarding"),
      data: {
        full_name,
        // The database trigger reads this and writes it into public.profiles.
        signup_source: "email",
      },
    },
  });

  if (error) {
    const code = mapSupabaseAuthError(error.message, error.status);
    return authFailure(code, error.message);
  }

  // Supabase returns a user with empty identities when the email is already
  // registered — this is a security feature that avoids leaking which emails
  // exist. Respond with a neutral "check your email" message either way.
  const alreadyRegistered =
    data.user && (!data.user.identities || data.user.identities.length === 0);

  return authSuccess({
    message: "Check your inbox to confirm your email address.",
    needsEmailConfirmation: true,
    // The caller decides whether to redirect to /verify.
  });

  // Silence the unused variable — kept for future logging.
  void alreadyRegistered;
}

// ─── SIGN IN ──────────────────────────────────────────────────────────────

export async function signInWithEmail(formData: FormData): Promise<AuthResult> {
  const raw = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? "").trim() || undefined,
  };

  const parsed = SignInSchema.safeParse(raw);
  if (!parsed.success) {
    return authFailure(
      "VALIDATION_ERROR",
      "Please check the highlighted fields.",
      zodFieldErrors(parsed.error.flatten())
    );
  }

  const supabase = await createClient();
  const { email, password, next } = parsed.data;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const code = mapSupabaseAuthError(error.message, error.status);
    return authFailure(code, code === "INVALID_CREDENTIALS" ? "Invalid email or password." : error.message);
  }

  revalidatePath("/", "layout");
  redirect(next ?? "/dashboard");
}

// ─── OAUTH (Google, GitHub) ───────────────────────────────────────────────
// Runs from a Server Action so @supabase/ssr can set the PKCE code-verifier
// cookie on the response. Calling from a Client Component breaks the flow.

export async function signInWithOAuth(provider: "google" | "github", next?: string): Promise<AuthResult> {
  if (provider !== "google" && provider !== "github") {
    return authFailure("OAUTH_ERROR", "Unsupported provider");
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl(origin, next ?? "/dashboard"),
      queryParams:
        provider === "google"
          ? { access_type: "offline", prompt: "consent" }
          : undefined,
    },
  });

  if (error) {
    return authFailure("OAUTH_ERROR", error.message);
  }

  if (data.url) redirect(data.url);
  return authFailure("OAUTH_ERROR", "Could not start OAuth flow");
}

// ─── MAGIC LINK ───────────────────────────────────────────────────────────

export async function signInWithMagicLink(formData: FormData): Promise<AuthResult> {
  const raw = {
    email: String(formData.get("email") ?? "").trim(),
    next: String(formData.get("next") ?? "").trim() || undefined,
  };

  const parsed = MagicLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return authFailure(
      "VALIDATION_ERROR",
      "Enter a valid email.",
      zodFieldErrors(parsed.error.flatten())
    );
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: callbackUrl(origin, parsed.data.next ?? "/dashboard"),
      shouldCreateUser: false,
    },
  });

  if (error) {
    const code = mapSupabaseAuthError(error.message, error.status);
    return authFailure(code, error.message);
  }

  return authSuccess({ message: "Check your email for the sign-in link." });
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────

export async function requestPasswordReset(formData: FormData): Promise<AuthResult> {
  const raw = { email: String(formData.get("email") ?? "").trim() };

  const parsed = ForgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return authFailure(
      "VALIDATION_ERROR",
      "Enter a valid email.",
      zodFieldErrors(parsed.error.flatten())
    );
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    const code = mapSupabaseAuthError(error.message, error.status);
    return authFailure(code, error.message);
  }

  return authSuccess({ message: "If an account exists, a reset link is on its way." });
}

// ─── RESET PASSWORD (after clicking the email link) ───────────────────────

export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const raw = { password: String(formData.get("password") ?? "") };

  const parsed = ResetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return authFailure(
      "VALIDATION_ERROR",
      "Choose a stronger password.",
      zodFieldErrors(parsed.error.flatten())
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    const code = mapSupabaseAuthError(error.message, error.status);
    return authFailure(code, error.message);
  }

  revalidatePath("/", "layout");
  return authSuccess({ message: "Password updated. You can now sign in." });
}

// ─── VERIFY EMAIL OTP ─────────────────────────────────────────────────────

export async function verifyEmailOtp(formData: FormData): Promise<AuthResult> {
  const raw = {
    email: String(formData.get("email") ?? "").trim(),
    token: String(formData.get("token") ?? "").trim(),
  };

  const parsed = VerifyOtpSchema.safeParse(raw);
  if (!parsed.success) {
    return authFailure(
      "VALIDATION_ERROR",
      "Enter the 6-digit code from your email.",
      zodFieldErrors(parsed.error.flatten())
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });

  if (error) {
    const code = mapSupabaseAuthError(error.message, error.status);
    return authFailure(code, error.message);
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

// ─── SIGN OUT ─────────────────────────────────────────────────────────────
// `scope: 'local'` signs out ONLY this device. The default is 'global',
// which terminates every session the user has — a documented footgun.

export async function signOut(): Promise<AuthResult> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/login");
}

// ─── SIGN OUT EVERYWHERE (Settings page only) ─────────────────────────────

export async function signOutEverywhere(): Promise<AuthResult> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  revalidatePath("/", "layout");
  redirect("/login");
}
