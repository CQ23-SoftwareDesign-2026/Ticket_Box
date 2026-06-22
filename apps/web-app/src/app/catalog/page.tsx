"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function CatalogPage() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="auth-page">
      <div className="ticketbox-shell py-6 sm:py-8">
        <div className="ticketbox-nav rounded-[28px] border border-slate-200/80 px-5 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-2xl font-black tracking-tight text-[#4f22d8]"
            >
              TicketBox
            </Link>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="ticketbox-button-primary px-5 py-2.5"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="ticketbox-button-primary px-5 py-2.5"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>

        <section className="mt-6 ticketbox-card p-6 sm:p-8 lg:p-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="ticketbox-badge">Public preview</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">
                Browse concerts
              </h1>
              <p className="ticketbox-muted mt-3 max-w-2xl">
                This public route can later be replaced with real concert data,
                while auth and profile flows already share the same TicketBox
                styling language.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "Glow Festival Night",
                time: "June 15, 2026 • Saigon Arena",
                accent: "from-[#30135f] via-[#0f62fe] to-[#ff7a59]",
              },
              {
                title: "City Lights Live",
                time: "July 03, 2026 • Riverside Hall",
                accent: "from-[#2b1b67] via-[#7c3aed] to-[#ff7a59]",
              },
              {
                title: "Echo Pulse",
                time: "August 12, 2026 • Skyline Stage",
                accent: "from-[#111827] via-[#4f46e5] to-[#0f62fe]",
              },
            ].map((event) => (
              <article
                key={event.title}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
              >
                <div
                  className={`h-44 bg-gradient-to-br ${event.accent} p-5 text-white`}
                >
                  <div className="mt-auto inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
                    Featured
                  </div>
                </div>
                <div className="p-5">
                  <h2 className="text-xl font-bold text-slate-900">
                    {event.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">{event.time}</p>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    Prototype ticket card that can later be wired to concert,
                    concept, and order data.
                  </p>
                  <button className="ticketbox-button-primary mt-5 w-full">
                    View details
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
