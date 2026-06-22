"use client";

import Link from "next/link";
import { motion } from "framer-motion";

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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-primary sm:text-2xl"
          >
            TicketBox
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link
              href="/catalog"
              className="hidden hover:text-foreground transition-colors sm:block"
            >
              Events
            </Link>
            <Link
              href="/login"
              className="ticketbox-button-primary h-9 px-4 py-2 text-xs"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main
        className={`flex-1 ${compact ? "py-10 sm:py-14" : "py-12 sm:py-16 lg:py-20"}`}
      >
        <div
          className={`container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid items-stretch gap-8 lg:gap-16 ${sidebar ? "lg:grid-cols-[1.1fr_0.9fr]" : "lg:grid-cols-1"}`}
        >
          {sidebar ? (
            <section className="hidden min-h-[600px] overflow-hidden rounded-2xl bg-muted lg:block">
              {sidebar}
            </section>
          ) : null}

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mx-auto w-full max-w-md py-6 sm:py-8 flex flex-col justify-center"
          >
            <div className="mb-8">
              {eyebrow && (
                <span className="mb-4 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {eyebrow}
                </span>
              )}
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>

            {children}

            {footerLinks?.length ? (
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between border-t border-border pt-6 text-sm text-muted-foreground">
                {footerLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="font-semibold text-primary hover:underline underline-offset-4"
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
