"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { SecurityIllustration } from "@/components/ticketbox-illustrations";

export default function VerifyClient() {
  const searchParams = useSearchParams();
  const token = useMemo(
    () => searchParams?.get("token") ?? null,
    [searchParams],
  );

  useEffect(() => {
    if (!token) return;

    window.history.replaceState({}, document.title, window.location.pathname);

    const backendBase = process.env.NEXT_PUBLIC_API_URL;
    if (!backendBase) {
      return;
    }

    window.location.href = `${backendBase.replace(/\/+$/, "")}/auth/verify?token=${encodeURIComponent(token)}`;
  }, [token]);

  return (
    <TicketBoxAuthShell
      title={token ? "Verifying your account" : "Account verified"}
      description={
        token
          ? "Redirecting to complete verification..."
          : "Your email verification is complete. You can sign in now."
      }
      sidebar={<SecurityIllustration />}
      footerLinks={[
        { label: "Back to sign in", href: "/login" },
        { label: "Resend verification", href: "/resend-verification" },
      ]}
    >
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0f62fe]/10 text-[#0f62fe]">
          <span className="text-3xl">âœ“</span>
        </div>
        <Link href="/login" className="ticketbox-button-primary w-full">
          Continue to sign in
        </Link>
      </div>
    </TicketBoxAuthShell>
  );
}
