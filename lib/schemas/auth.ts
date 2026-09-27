// lib/schemas/auth.ts
import { z } from "zod";

export const EmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email")
  .max(320)
  .toLowerCase();

export const PasswordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(72, "Maximum 72 characters")
  .regex(/[A-Z]/, "Include one uppercase letter")
  .regex(/[a-z]/, "Include one lowercase letter")
  .regex(/[0-9]/, "Include one number");

export const SignUpSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  full_name: z.string().trim().min(1, "Name is required").max(100),
  next: z.string().trim().max(500).optional(),
});

export const SignInSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Password is required").max(72),
  next: z.string().trim().max(500).optional(),
});

export const MagicLinkSchema = z.object({
  email: EmailSchema,
  next: z.string().trim().max(500).optional(),
});

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

export const ResetPasswordSchema = z.object({
  password: PasswordSchema,
});

export const VerifyOtpSchema = z.object({
  email: EmailSchema,
  token: z.string().trim().length(6, "Enter the 6-digit code"),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
export type MagicLinkInput = z.infer<typeof MagicLinkSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
