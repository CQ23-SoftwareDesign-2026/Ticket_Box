"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { siteNavigation, siteName } from "@/lib/constants";
import {
  LayoutDashboard,
  User as UserIcon,
  Ticket,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "soft";
  className?: string;
};

const buttonStyles = {
  primary: "bg-primary text-on-primary hover:bg-primary-container",
  secondary: "bg-secondary text-on-secondary hover:bg-secondary-container",
  ghost: "bg-transparent text-on-surface hover:bg-surface-high",
  soft: "bg-primary/10 text-primary hover:bg-primary/15",
} as const;

export function Button({
  children,
  href,
  variant = "primary",
  className = "",
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
    buttonStyles[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <button className={classes}>{children}</button>;
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-outline-variant/80 bg-surface shadow-[0_4px_20px_rgba(15,23,42,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 ${className}`}
    />
  );
}

export function Tabs({
  items,
  active,
}: {
  items: readonly string[];
  active: string;
}) {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-full border border-outline-variant bg-surface-low p-2">
      {items.map((item) => (
        <span
          key={item}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${item === active ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant"}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function Avatar({
  initials,
  className = "",
}: {
  initials: string;
  className?: string;
}) {
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary ${className}`}
    >
      {initials}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  tone = "light",
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** "light" = original surface styling, "dark" = for use on dark/hero backgrounds */
  tone?: "light" | "dark";
}) {
  const isDark = tone === "dark";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl space-y-2">
        {eyebrow ? (
          <div
            className={
              "text-xs font-semibold uppercase tracking-[0.24em] " +
              (isDark ? "text-[#d8b56e]" : "text-primary")
            }
          >
            {eyebrow}
          </div>
        ) : null}
        <h2
          className={
            "font-display text-2xl font-bold tracking-tight sm:text-3xl " +
            (isDark ? "text-[#f6f2ec]" : "text-on-surface")
          }
        >
          {title}
        </h2>
        {description ? (
          <p
            className={
              "max-w-2xl text-sm leading-6 sm:text-base " +
              (isDark ? "text-[#f6f2ec]/65" : "text-on-surface-variant")
            }
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg
        className={compact ? "h-9 w-9" : "h-10 w-10"}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="ticketbox-brand-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <path
          d="M40 60Q40 50 50 50H150Q160 50 160 60V85Q150 100 160 115V140Q160 150 150 150H50Q40 150 40 140V115Q50 100 40 85Z"
          fill="url(#ticketbox-brand-gradient)"
        />
        <rect
          x="85"
          y="85"
          width="30"
          height="30"
          rx="4"
          fill="white"
          transform="rotate(45 100 100)"
        />
      </svg>
      <div>
        <div className="font-display text-xl font-black italic tracking-tight text-primary">
          {siteName}
        </div>
        {!compact ? (
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
            Concert ticketing
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SiteShell({
  children,
  active = "/",
  action,
}: {
  children: ReactNode;
  active?: string;
  action?: ReactNode;
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const isAdmin =
    user?.roles?.includes("Admin") ||
    (typeof user === "object" &&
      user !== null &&
      "role" in user &&
      (user as { role?: string }).role === "Admin");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-outline-variant/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="shrink-0">
            <BrandMark compact />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {/* Navigation hidden per request, could add other links here if needed */}
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-primary-foreground font-bold hover:ring-2 hover:ring-primary transition-all">
                  {user?.fullName?.charAt(0).toUpperCase() || "U"}
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-surface-low rounded-xl shadow-lg border border-outline-variant opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                  <div className="p-2 flex flex-col gap-1 text-left">
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface rounded-lg transition-colors"
                    >
                      <UserIcon size={16} /> Profile
                    </Link>
                    <Link
                      href="/my-tickets"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface rounded-lg transition-colors"
                    >
                      <Ticket size={16} /> My Tickets
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface rounded-lg transition-colors"
                      >
                        <LayoutDashboard size={16} /> Admin
                      </Link>
                    )}
                    <div className="h-px bg-outline-variant my-1" />
                    <button
                      onClick={() => {
                        void logout().then(() => router.replace("/login"));
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <LogOut size={16} /> Log out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              action
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-800 bg-[#2b2d31]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 px-4 py-12 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 transition-transform hover:scale-105"
            >
              <svg
                className="h-10 w-10"
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient
                    id="ticketbox-brand-gradient-footer"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
                <path
                  d="M40 60Q40 50 50 50H150Q160 50 160 60V85Q150 100 160 115V140Q160 150 150 150H50Q40 150 40 140V115Q50 100 40 85Z"
                  fill="url(#ticketbox-brand-gradient-footer)"
                />
                <rect
                  x="85"
                  y="85"
                  width="30"
                  height="30"
                  rx="15"
                  fill="white"
                  className="animate-pulse"
                />
                <path
                  d="M100 70V130M70 100H130"
                  stroke="white"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-display text-3xl font-black italic tracking-tight text-white drop-shadow-sm">
                TicketBox
              </span>
            </Link>
            <div className="flex items-center gap-4 text-white/70">
              <Link
                href="#"
                className="hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </Link>
              <Link
                href="#"
                className="hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </Link>
              <Link
                href="#"
                className="hover:text-white transition-colors"
                aria-label="YouTube"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                </svg>
              </Link>
            </div>
            <p className="text-xs font-semibold text-white/50 tracking-wide mt-2">
              © 2026 TicketBox. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-x-8 gap-y-4 text-sm font-bold text-white/80">
            <Link
              href="/#upcoming-concerts"
              className="hover:text-white transition-colors"
            >
              Concerts
            </Link>
            <Link
              href="/private-policy"
              className="hover:text-white transition-colors"
            >
              Private Policy
            </Link>
            <Link
              href="/support"
              className="hover:text-white transition-colors"
            >
              Support
            </Link>
          </div>
        </div>
      </footer>
      <div className="sticky bottom-0 z-40 border-t border-outline-variant bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          {siteNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold ${active === item.href ? "text-primary" : "text-on-surface-variant"}`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {item.label === "My Tickets"
                  ? "local_activity"
                  : item.label === "Profile"
                    ? "account_circle"
                    : item.label === "Support"
                      ? "support_agent"
                      : "explore"}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CheckoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0">
          <BrandMark compact />
        </Link>
      </div>
      <main>{children}</main>
    </div>
  );
}
