"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function AccessDeniedPage() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="auth-page flex items-center justify-center px-4 py-12">
      <div className="ticketbox-panel max-w-xl p-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 text-4xl text-rose-600">
          403
        </div>
        <h1 className="mt-6 text-4xl font-black text-slate-900">
          Access denied
        </h1>
        <p className="ticketbox-muted mt-3">
          This route uses the same auth guard pattern future checkout and admin
          concept screens will rely on.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="ticketbox-button-primary px-5 py-3"
            >
              Back to dashboard
            </Link>
          ) : (
            <Link href="/login" className="ticketbox-button-primary px-5 py-3">
              Go to login
            </Link>
          )}
          <Link href="/" className="ticketbox-button-secondary px-5 py-3">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
