"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { ConcertHeroIllustration } from "@/components/ticketbox-illustrations";
import { authService } from "@/services/auth.service";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { getAuthErrorMessage } from "@/utils/error.utils";

function ResendVerificationForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams?.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authService.resendVerification(email);
      setSuccess(true);
    } catch (requestError: unknown) {
      setError(getAuthErrorMessage(requestError, "resend-verification"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <TicketBoxAuthShell
        title="Email sent"
        description="We've sent a new verification link to your email address."
        sidebar={<ConcertHeroIllustration />}
        footerLinks={[{ label: "Return to sign in", href: "/login" }]}
      >
        <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
          <div className="rounded-full bg-green-50 p-3 text-green-600 dark:bg-green-950/50 dark:text-green-400">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <p className="max-w-sm text-muted-foreground">
            Please check your inbox and click the link to verify your account.
          </p>
        </div>
      </TicketBoxAuthShell>
    );
  }

  return (
    <TicketBoxAuthShell
      title="Resend verification"
      description="Enter your email address and we'll send you a new link to verify your account."
      sidebar={<ConcertHeroIllustration />}
      footerLinks={[{ label: "Return to sign in", href: "/login" }]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        {error ? (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="space-y-1">
          <label className="ticketbox-label" htmlFor="email">
            Email address
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="ticketbox-input pl-10"
              placeholder="name@example.com"
              required
              disabled={loading}
            />
          </div>
        </div>

        <button
          className="ticketbox-button-primary mt-4 w-full"
          disabled={loading || !email}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send verification email"
          )}
        </button>
      </form>
    </TicketBoxAuthShell>
  );
}

export default function ResendVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="ticketbox-panel flex items-center gap-4 px-6 py-5">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="ticketbox-muted">Loading resend verification...</p>
          </div>
        </div>
      }
    >
      <ResendVerificationForm />
    </Suspense>
  );
}
