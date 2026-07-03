"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { getAuthErrorMessage } from "@/utils/error.utils";

export default function VerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token] = useState<string | null>(
    () => searchParams?.get("token") ?? null,
  );
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState<string | null>(
    token ? null : "Missing verification token. Please request a new verification email.",
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    window.history.replaceState({}, document.title, window.location.pathname);

    let active = true;

    const verify = async () => {
      try {
        const response = await fetch(
          `/api/auth/verify?token=${encodeURIComponent(token)}`,
        );
        const data = (await response.json()) as { message?: string };

        if (!active) {
          return;
        }

        if (!response.ok) {
          throw {
            response: {
              status: response.status,
              data,
            },
          };
        }

        setStatus("success");
        setMessage(data.message ?? "Your email has been verified.");

        setTimeout(() => {
          router.replace("/login?verified=1");
        }, 1800);
      } catch (error) {
        if (!active) {
          return;
        }

        setStatus("error");
        setMessage(getAuthErrorMessage(error, "verify-email"));
      }
    };

    void verify();

    return () => {
      active = false;
    };
  }, [router, token]);

  return (
    <TicketBoxAuthShell
      title={
        status === "loading"
          ? "Verifying your account"
          : status === "success"
            ? "Email verified"
            : "Verification failed"
      }
      description={
        status === "loading"
          ? "We're checking your verification link now."
          : status === "success"
            ? "Your email has been verified. You can sign in now."
            : "This verification link is no longer valid."
      }
      compact
      footerLinks={[
        { label: "Back to sign in", href: "/login" },
        { label: "Resend verification", href: "/resend-verification" },
      ]}
    >
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0f62fe]/10 text-[#0f62fe]">
          {status === "loading" ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : status === "success" ? (
            <CheckCircle2 className="h-10 w-10" />
          ) : (
            <AlertCircle className="h-10 w-10" />
          )}
        </div>
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
        <Link href="/login" className="ticketbox-button-primary w-full">
          {status === "success" ? "Continue to sign in" : "Back to sign in"}
        </Link>
        {status === "error" ? (
          <Link
            href="/resend-verification"
            className="inline-flex text-sm font-semibold text-primary hover:underline hover:underline-offset-4"
          >
            Request a new verification email
          </Link>
        ) : null}
      </div>
    </TicketBoxAuthShell>
  );
}
