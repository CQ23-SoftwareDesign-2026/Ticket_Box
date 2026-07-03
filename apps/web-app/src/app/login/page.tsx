"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { ConcertHeroIllustration } from "@/components/ticketbox-illustrations";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/context/AuthContext";
import {
  getAuthErrorMessage,
  shouldSuggestResendVerification,
} from "@/utils/error.utils";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get("returnUrl") || "/";
  const verified = searchParams?.get("verified") === "1";
  const reset = searchParams?.get("reset") === "1";
  const registered = searchParams?.get("registered") === "1";
  const { login } = useAuth();

  const [email, setEmail] = useState(searchParams?.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResendVerification, setShowResendVerification] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowResendVerification(false);

    try {
      const response = await authService.login(email, password);
      login(response.user);
      router.replace(returnUrl);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, "login"));
      setShowResendVerification(shouldSuggestResendVerification(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TicketBoxAuthShell
      title="Welcome back"
      description="Sign in to your account to manage tickets, events, and your profile."
      sidebar={<ConcertHeroIllustration />}
      footerLinks={[
        { label: "Don't have an account? Sign up", href: "/register" },
      ]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        {verified ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>Your email has been verified. You can sign in now.</p>
          </div>
        ) : null}

        {reset ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>Your password has been updated. Please sign in with your new password.</p>
          </div>
        ) : null}

        {registered ? (
          <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>Your account has been created. Check your email to verify it before signing in.</p>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="space-y-2">
              <p>{error}</p>
              {showResendVerification ? (
                <Link
                  href={`/resend-verification?email=${encodeURIComponent(email)}`}
                  className="inline-flex font-semibold text-red-900 underline underline-offset-4 dark:text-red-100"
                >
                  Resend verification email
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

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
          <div className="flex items-center justify-between">
            <label className="ticketbox-label mb-0" htmlFor="password">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-primary hover:underline hover:underline-offset-4"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="ticketbox-input"
            placeholder="********"
            required
            disabled={loading}
          />
        </div>

        <button
          className="ticketbox-button-primary mt-2 w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </TicketBoxAuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="ticketbox-panel flex items-center gap-4 px-6 py-5">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="ticketbox-muted">Loading sign in...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
