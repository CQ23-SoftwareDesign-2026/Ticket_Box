"use client";

import { useState } from "react";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { ConcertHeroIllustration } from "@/components/ticketbox-illustrations";
import { authService } from "@/services/auth.service";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/utils/error.utils";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.register(email, password, fullName);
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
        description="We've sent a verification link to your email address. Please verify your account to continue."
        sidebar={<ConcertHeroIllustration />}
      >
        <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
          <div className="rounded-full bg-green-50 p-3 text-green-600 dark:bg-green-950/50 dark:text-green-400">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <p className="text-muted-foreground">
            Once verified, you can sign in to your account.
          </p>
          <a
            href="/login"
            className="ticketbox-button-primary mt-4 w-full sm:w-auto"
          >
            Return to sign in
          </a>
        </div>
      </TicketBoxAuthShell>
    );
  }

  return (
    <TicketBoxAuthShell
      title="Create an account"
      description="Join TicketBox to discover and book tickets for the best events."
      sidebar={<ConcertHeroIllustration />}
      footerLinks={[
        { label: "Already have an account? Sign in", href: "/login" },
      ]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        {error && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="ticketbox-label" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            type="text"
            className="ticketbox-input"
            placeholder="John Doe"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label className="ticketbox-label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="ticketbox-input"
            placeholder="name@example.com"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label className="ticketbox-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="ticketbox-input"
            placeholder="••••••••"
            required
            minLength={8}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Must be at least 8 characters.
          </p>
        </div>

        <button
          className="ticketbox-button-primary w-full mt-4"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>
    </TicketBoxAuthShell>
  );
}
