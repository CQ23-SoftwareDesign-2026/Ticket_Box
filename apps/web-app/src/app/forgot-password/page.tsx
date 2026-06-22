"use client";

import { useState } from "react";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { ConcertHeroIllustration } from "@/components/ticketbox-illustrations";
import { authService } from "@/services/auth.service";
import { AlertCircle, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { getErrorMessage } from "@/utils/error.utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.forgotPassword(email);
      setSuccess(true);
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <TicketBoxAuthShell
        title="Check your email"
        description="If an account exists with that email address, we've sent a password reset link."
        sidebar={<ConcertHeroIllustration />}
        footerLinks={[{ label: "Return to sign in", href: "/login" }]}
      >
        <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <p className="text-muted-foreground max-w-sm">
            Please check your inbox and click the link to reset your password.
          </p>
        </div>
      </TicketBoxAuthShell>
    );
  }

  return (
    <TicketBoxAuthShell
      title="Reset password"
      description="Enter your email address and we'll send you a link to reset your password."
      sidebar={<ConcertHeroIllustration />}
      footerLinks={[{ label: "Return to sign in", href: "/login" }]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        {error && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="ticketbox-label" htmlFor="email">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
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
          className="ticketbox-button-primary w-full mt-4"
          disabled={loading || !email}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending reset link...
            </>
          ) : (
            "Send reset link"
          )}
        </button>
      </form>
    </TicketBoxAuthShell>
  );
}
