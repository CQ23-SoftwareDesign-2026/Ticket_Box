"use client";

import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";
import { siteNavigation, siteName } from "@/lib/constants";
import {
  LayoutDashboard,
  User as UserIcon,
  Ticket,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Suspense } from "react";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "soft" | "outline";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  loading?: boolean;
};

const buttonStyles = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container shadow-md hover:shadow-primary/20",
  secondary:
    "bg-secondary text-on-secondary hover:bg-secondary-container shadow-md hover:shadow-secondary/20",
  ghost: "bg-transparent text-on-surface hover:bg-surface-high/60",
  soft: "bg-primary/10 text-primary hover:bg-primary/20",
  outline:
    "border border-outline bg-transparent text-on-surface hover:bg-surface hover:border-on-surface-variant/50",
} as const;

export function Button({
  children,
  href,
  variant = "primary",
  className = "",
  onClick,
  disabled = false,
  type = "button",
  loading = false,
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer",
    buttonStyles[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
    >
      {content}
    </button>
  );
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
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] border border-outline-variant/60 bg-surface-low/80 backdrop-blur-sm text-on-surface-variant/90 shadow-sm ${className}`}
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
      className={`rounded-3xl border border-outline-variant/40 bg-surface/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.25)] transition-all duration-300 hover:border-outline-variant/70 ${className}`}
    >
      {children}
    </div>
  );
}

export function Input({
  className = "",
  disabled = false,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  if (isPassword) {
    return (
      <div className="relative w-full">
        <input
          disabled={disabled}
          type={inputType}
          {...props}
          className={`w-full rounded-xl border border-outline-variant bg-surface/50 backdrop-blur-sm pl-4 pr-10 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-on-surface-variant/60 hover:text-on-surface transition-colors cursor-pointer"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  }

  return (
    <input
      disabled={disabled}
      type={type}
      {...props}
      className={`w-full rounded-xl border border-outline-variant bg-surface/50 backdrop-blur-sm px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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

function HeaderSearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get("q") || "";
  const [prevQuery, setPrevQuery] = useState(searchQuery);
  const [value, setValue] = useState(searchQuery);

  if (searchQuery !== prevQuery) {
    setPrevQuery(searchQuery);
    setValue(searchQuery);
  }

  useEffect(() => {
    // Skip setting param if it matches the current searchQuery to avoid duplicate router actions
    if (value === searchQuery) return;

    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }

      const newUrl = pathname?.startsWith("/concerts")
        ? `/concerts?${params.toString()}`
        : `/?${params.toString()}#upcoming-concerts`;

      router.push(newUrl);
    }, 450); // 450ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [value, searchQuery, pathname, searchParams, router]);

  return (
    <input
      type="text"
      placeholder="Tìm kiếm liveshow hoặc địa điểm..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="hidden sm:block w-48 lg:w-64 rounded-full border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
    />
  );
}

export function SiteShell({
  children,
  action,
}: {
  children: ReactNode;
  active?: string;
  action?: ReactNode;
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin =
    user?.roles?.some((role) =>
      ["admin", "organizer", "checker"].includes(role.toLowerCase()),
    ) || false;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-on-surface">
      <header className="sticky top-0 z-50 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Brand & Left Navigation */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="shrink-0 transition-opacity hover:opacity-80"
            >
              <BrandMark compact />
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-on-surface-variant/80">
              <Link
                href="/concerts"
                className={`relative transition-colors hover:text-primary ${
                  pathname?.startsWith("/concerts") ? "text-primary" : ""
                }`}
              >
                Sự kiện
              </Link>
              <Link
                href="/my-tickets"
                className={`relative transition-colors hover:text-primary ${
                  pathname === "/my-tickets" ? "text-primary" : ""
                }`}
              >
                Vé của tôi
              </Link>
              <Link
                href="/support"
                className={`relative transition-colors hover:text-primary ${
                  pathname === "/support" ? "text-primary" : ""
                }`}
              >
                Trợ giúp
              </Link>
              <Link
                href="/private-policy"
                className={`relative transition-colors hover:text-primary ${
                  pathname === "/private-policy" ? "text-primary" : ""
                }`}
              >
                Chính sách
              </Link>
            </nav>
          </div>

          {/* Search & Right Action Menu */}
          <div className="flex items-center gap-4">
            <Suspense
              fallback={
                <div className="hidden sm:block w-48 lg:w-64 h-9 rounded-full bg-slate-900/30 animate-pulse" />
              }
            >
              <HeaderSearchInput />
            </Suspense>

            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-purple-500 text-white font-bold shadow-md shadow-primary/10 ring-2 ring-transparent transition-all duration-200 hover:ring-primary/45 hover:shadow-lg active:scale-95 cursor-pointer">
                  {user?.fullName?.charAt(0).toUpperCase() || "U"}
                </button>

                {/* Dropdown Menu */}
                <div
                  className="absolute right-0 mt-3 w-52 origin-top-right rounded-2xl border border-slate-800 bg-[#16222f]/95 backdrop-blur-md shadow-2xl ring-1 ring-black/5
              opacity-0 invisible translate-y-1 scale-95
              group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:scale-100
              transition-all duration-200 ease-out z-50 overflow-hidden"
                >
                  <div className="p-1.5 flex flex-col gap-0.5 text-left">
                    <Link
                      href="/profile"
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-on-surface-variant/90 hover:bg-slate-900 hover:text-on-surface rounded-xl transition-colors"
                    >
                      <UserIcon
                        size={16}
                        className="text-on-surface-variant/70"
                      />{" "}
                      Hồ sơ cá nhân
                    </Link>
                    <Link
                      href="/my-tickets"
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-on-surface-variant/90 hover:bg-slate-900 hover:text-on-surface rounded-xl transition-colors"
                    >
                      <Ticket
                        size={16}
                        className="text-on-surface-variant/70"
                      />{" "}
                      Thư viện vé
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-on-surface-variant/90 hover:bg-slate-900 hover:text-on-surface rounded-xl transition-colors"
                      >
                        <LayoutDashboard
                          size={16}
                          className="text-on-surface-variant/70"
                        />{" "}
                        Quản trị hệ thống
                      </Link>
                    )}

                    <div className="h-px bg-slate-850 my-1.5 mx-1" />

                    <button
                      onClick={() => {
                        void logout().then(() => router.replace("/login"));
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              action || (
                <Link
                  href="/login"
                  className="flex items-center justify-center rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 shadow-sm transition-all duration-200"
                >
                  Đăng nhập
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-900 bg-slate-950">
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
            <div className="flex items-center gap-4 text-white/50">
              <Link
                href="#"
                className="hover:text-primary transition-colors duration-200"
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
                className="hover:text-primary transition-colors duration-200"
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
                className="hover:text-primary transition-colors duration-200"
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
            <p className="text-xs font-semibold text-white/40 tracking-wide mt-2">
              © 2026 TicketBox. Bản quyền được bảo lưu.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-x-8 gap-y-4 text-sm font-bold text-white/70">
            <Link
              href="/concerts"
              className="hover:text-white transition-colors duration-150"
            >
              Sự kiện
            </Link>
            <Link
              href="/private-policy"
              className="hover:text-white transition-colors duration-150"
            >
              Chính sách bảo mật
            </Link>
            <Link
              href="/support"
              className="hover:text-white transition-colors duration-150"
            >
              Trung tâm trợ giúp
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Nav */}
      <div className="sticky bottom-0 z-40 border-t border-slate-900 bg-slate-950/85 px-4 py-2.5 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          {siteNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-bold ${
                pathname === item.href
                  ? "text-primary"
                  : "text-on-surface-variant/75"
              }`}
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
              {item.label === "My Tickets"
                ? "Vé của tôi"
                : item.label === "Profile"
                  ? "Cá nhân"
                  : item.label === "Support"
                    ? "Trợ giúp"
                    : "Khám phá"}
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
