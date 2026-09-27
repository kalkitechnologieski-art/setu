import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="space-y-8 animate-fade-up">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          Must be at least 8 characters, with one uppercase letter and one number.
        </p>
      </header>

      <ResetPasswordForm />

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
