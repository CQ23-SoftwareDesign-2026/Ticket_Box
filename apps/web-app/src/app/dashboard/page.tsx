"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { authService } from "@/services/auth.service";

function DashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await authService.logout();
    logout();
    router.push("/");
  };

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
            <button
              onClick={handleLogout}
              className="ticketbox-button-primary px-5 py-2.5"
            >
              Logout
            </button>
          </div>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="ticketbox-card p-6 sm:p-8 lg:p-10">
            <p className="ticketbox-badge">Dashboard</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">
              Your TicketBox account
            </h1>
            <p className="ticketbox-muted mt-3 max-w-2xl">
              This space shows the authenticated state that future ticket,
              order, and concept flows can inherit without redesigning auth
              layouts.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["My tickets", "View and manage your concert tickets."],
                ["My orders", "Track purchase history and order states."],
                [
                  "Account security",
                  "Protect your session and password lifecycle.",
                ],
              ].map(([title, body]) => (
                <div key={title} className="rounded-[24px] bg-slate-50 p-5">
                  <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {body}
                  </p>
                  <button className="ticketbox-button-primary mt-4 w-full">
                    Open
                  </button>
                </div>
              ))}
            </div>
          </div>

          <aside className="ticketbox-panel p-6 sm:p-8">
            <h2 className="text-2xl font-black text-slate-900">
              User information
            </h2>
            <div className="mt-5 space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <strong>Email:</strong> {user?.email}
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <strong>Roles:</strong> {user?.roles?.join(", ") || "User"}
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <strong>Permissions:</strong>{" "}
                {user?.permissions?.join(", ") || "None"}
              </div>
            </div>
            <div className="mt-6 rounded-[24px] border border-[#0f62fe]/20 bg-[#eff6ff] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#0f62fe]">
                Prototype note
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep this dashboard shell simple so later ticket and concept
                sections can plug in without changing the auth baseline.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
