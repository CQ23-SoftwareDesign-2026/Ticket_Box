"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { siteNavigation, siteName } from "@/lib/constants";
import { LayoutDashboard } from "lucide-react";
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
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant sm:text-base">
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
  const { user, isAuthenticated } = useAuth();
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
            {siteNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-semibold transition ${active === item.href ? "text-primary" : "text-on-surface-variant hover:text-primary"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated && isAdmin && (
              <Link
                href="/admin/dashboard"
                className="ticketbox-button-secondary px-4 py-2 text-sm flex items-center gap-1.5"
              >
                <LayoutDashboard size={18} className="text-current" /> Admin
              </Link>
            )}
            {action}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-outline-variant/60 bg-surface">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
          <div className="space-y-4">
            <BrandMark compact />
            <p className="max-w-md text-sm leading-6 text-on-surface-variant">
              TicketBox is a premium concert booking experience with a clean
              checkout flow, live ticket management, and responsive support.
            </p>
          </div>
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              Navigate
            </p>
            <div className="space-y-3 text-sm text-on-surface-variant">
              {siteNavigation.map((item) => (
                <div key={item.href}>
                  <Link href={item.href} className="hover:text-primary">
                    {item.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              Need help?
            </p>
            <p className="text-sm leading-6 text-on-surface-variant">
              Support is available 24/7 for order, entry, and payment issues.
            </p>
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
