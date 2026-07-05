"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { authService } from "@/services/auth.service";
import { AlertCircle, CheckCircle2, Loader2, Lock } from "lucide-react";
import { getAuthErrorMessage } from "@/utils/error.utils";

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token] = useState<string | null>(
    () => searchParams?.get("token") ?? null,
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError(
        "Missing recovery token. Please request a new password reset link.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, newPassword);
      setSuccess(true);

      setTimeout(() => {
        router.replace("/login?reset=1");
      }, 3000);
    } catch (requestError: unknown) {
      setError(getAuthErrorMessage(requestError, "reset-password"));
      setLoading(false);
    }
  };

  if (success) {
    return (
      <TicketBoxAuthShell
        title="Password updated"
        description="Your password has been successfully reset."
        compact
        footerLinks={[{ label: "Back to sign in", href: "/login" }]}
      >
        <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
          <div className="rounded-full bg-green-50 p-3 text-green-600 dark:bg-green-950/50 dark:text-green-400">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <p className="text-muted-foreground">
            You will be redirected to the sign in page momentarily.
          </p>
          <Link
            href="/login?reset=1"
            className="ticketbox-button-primary mt-4 w-full sm:w-auto"
          >
            Go to sign in now
          </Link>
        </div>
      </TicketBoxAuthShell>
    );
  }

  if (!token) {
    return (
      <TicketBoxAuthShell
        title="Reset link unavailable"
        description="This password reset link is missing or no longer available."
        compact
        footerLinks={[{ label: "Back to sign in", href: "/login" }]}
      >
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300">
            <AlertCircle className="h-10 w-10" />
          </div>
          <p className="text-sm text-muted-foreground">
            Please request a new password reset email and try again.
          </p>
          <Link
            href="/forgot-password"
            className="ticketbox-button-primary w-full"
          >
            Request a new reset link
          </Link>
        </div>
      </TicketBoxAuthShell>
    );
  }

  return (
    <TicketBoxAuthShell
      title="Create new password"
      description="Set a new password for your account to continue."
      compact
      footerLinks={[{ label: "Back to sign in", href: "/login" }]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        {error ? (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="space-y-1">
          <label className="ticketbox-label" htmlFor="password">
            New password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              id="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              className="ticketbox-input pl-10"
              placeholder="********"
              required
              disabled={loading}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Must be at least 8 characters.
          </p>
        </div>

        <div className="space-y-1">
          <label className="ticketbox-label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              className="ticketbox-input pl-10"
              placeholder="********"
              required
              disabled={loading}
            />
          </div>
        </div>

        <button
          className="ticketbox-button-primary mt-4 w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting password...
            </>
          ) : (
            "Reset password"
          )}
        </button>
      </form>
    </TicketBoxAuthShell>
  );
}
