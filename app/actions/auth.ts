"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// ─── Result contract ──────────────────────────────────────────────────────

export type AuthResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

// ─── Sign in with email + password ────────────────────────────────────────

export async function signInWithPassword(
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Never reveal whether the email exists.
    return { ok: false, error: "Invalid email or password" };
  }

  redirect(next);
}

// ─── Sign up ──────────────────────────────────────────────────────────────

export async function signUpWithPassword(
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || password.length < 8) {
    return { ok: false, error: "Email and an 8+ character password are required" };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/callback`,
      data: { full_name: fullName || null },
    },
  });

  if (error) return { ok: false, error: error.message };

  return { ok: true, message: "Check your email to confirm your account." };
}

// ─── Sign in with magic link (via email OTP) ──────────────────────────────

export async function signInWithMagicLink(
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, error: "Email is required" };

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/callback`,
      shouldCreateUser: false,
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Check your email for the sign-in link." };
}

// ─── Sign in with OAuth (Google / GitHub) ─────────────────────────────────
// Runs from a Server Action so the PKCE code-verifier cookie is set on the
// response that Next.js generates. Calling from a Client Component is the
// #1 cause of "both auth code and code verifier should be non-empty".

export async function signInWithOAuth(
  provider: "google" | "github"
): Promise<AuthResult> {
  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/callback`,
      queryParams:
        provider === "google"
          ? { access_type: "offline", prompt: "consent" }
          : undefined,
    },
  });

  if (error) return { ok: false, error: error.message };
  if (data.url) redirect(data.url);

  return { ok: false, error: "OAuth initialization failed" };
}

// ─── Sign out (local scope — this device only) ────────────────────────────

export async function signOut(): Promise<AuthResult> {
  const supabase = await createClient();
  // scope: 'local' logs out ONLY this device. Global would log out every
  // device the user has ever signed into — a documented footgun.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

// ─── Sign out of ALL devices (Settings page only) ─────────────────────────

export async function signOutEverywhere(): Promise<AuthResult> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}
