import Link from "next/link";
import { Mail } from "lucide-react";
import { VerifyForm } from "@/components/auth/verify-form";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = params.email ?? "";

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-blue-500/10 text-violet-600 dark:text-violet-400">
        <Mail className="size-5" />
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Confirm your email</h1>
        <p className="text-sm text-muted-foreground">
          {email
            ? `We sent a 6-digit code to ${email}. Enter it below to finish signing up.`
            : "We sent a 6-digit code to your email. Enter it below to finish signing up."}
        </p>
      </header>

      {email ? (
        <VerifyForm email={email} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Missing email — <Link href="/signup" className="font-medium text-primary hover:underline">start over</Link>.
        </p>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
