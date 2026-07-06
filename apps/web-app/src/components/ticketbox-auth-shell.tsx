"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BrandMark, Button } from "./common";

type ShellProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footerLinks?: Array<{
    label: string;
    href: string;
  }>;
  sidebar?: React.ReactNode;
  compact?: boolean;
};

export function TicketBoxAuthShell({
  eyebrow = "TicketBox",
  title,
  description,
  children,
  footerLinks,
  sidebar,
  compact = false,
}: ShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Sleek Header */}
      <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-background/80 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            <BrandMark compact />
          </Link>
          <nav className="flex items-center gap-6 text-sm font-semibold text-on-surface-variant">
            <Link
              href="/"
              className="hidden hover:text-primary transition-colors sm:block"
            >
              Sự kiện
            </Link>
            <Button
              href="/login"
              variant="soft"
              className="px-4 py-2 text-xs rounded-lg"
            >
              Đăng nhập
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main
        className={`flex-grow flex items-center justify-center ${compact ? "py-10 sm:py-14" : "py-12 sm:py-16 lg:py-20"}`}
      >
        <div
          className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 grid items-center gap-8 lg:gap-16 ${sidebar ? "lg:grid-cols-[1.1fr_0.9fr]" : "lg:grid-cols-1"}`}
        >
          {sidebar ? (
            <section className="hidden min-h-[600px] h-full overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-low/30 backdrop-blur-md shadow-2xl lg:block">
              {sidebar}
            </section>
          ) : null}

          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`mx-auto w-full max-w-md p-6 sm:p-8 flex flex-col justify-center rounded-3xl border border-outline-variant/40 bg-surface/20 backdrop-blur-lg shadow-2xl`}
          >
            <div className="mb-6">
              {eyebrow && (
                <span className="mb-3 inline-block rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary uppercase tracking-[0.12em]">
                  {eyebrow}
                </span>
              )}
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-on-surface-variant/70 leading-relaxed">
                {description}
              </p>
            </div>

            <div className="flex-1">
              {children}
            </div>

            {footerLinks?.length ? (
              <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between border-t border-outline-variant/50 pt-5 text-sm text-on-surface-variant/80">
                {footerLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="font-bold text-primary hover:text-primary-container transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </motion.section>
        </div>
      </main>
    </div>
  );
}
