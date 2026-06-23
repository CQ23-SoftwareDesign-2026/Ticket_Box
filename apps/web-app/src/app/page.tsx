"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, SectionHeading, SiteShell } from "@/components/common";
import { HeroCarousel, ConcertCard } from "@/components/screens";
import {
  getConcerts,
  type ConcertCardItem,
  type ConcertListMeta,
} from "@/services/concert.service";

function LoadingState() {
  return (
    <main className="auth-page flex items-center justify-center px-4">
      <div className="ticketbox-panel flex items-center gap-4 px-6 py-5">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="ticketbox-muted">Restoring your session...</p>
      </div>
    </main>
  );
}

function ConcertsSectionInner() {
  const searchParams = useSearchParams();
  const search = searchParams?.get("q") || "";
  const statusFilter = searchParams?.get("status") || "PUBLISHED";
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ConcertCardItem[]>([]);
  const [meta, setMeta] = useState<ConcertListMeta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: 2,
    totalPages: 1,
    currentPage: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      const loadConcerts = async () => {
        setLoading(true);
        setError(null);

        try {
          const response = await getConcerts({
            page,
            limit: meta.itemsPerPage,
            search: search.trim() || undefined,
            status: statusFilter,
          });

          if (!isActive) {
            return;
          }

          setItems(response.items);
          setMeta(response.meta);
        } catch (loadError) {
          if (!isActive) {
            return;
          }

          setItems([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load concerts.",
          );
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      void loadConcerts();
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [meta.itemsPerPage, page, search, statusFilter]);

  const totalPages = Math.max(meta.totalPages, 1);
  const startItem =
    meta.totalItems === 0 ? 0 : (meta.currentPage - 1) * meta.itemsPerPage + 1;
  const endItem = Math.min(
    meta.currentPage * meta.itemsPerPage,
    meta.totalItems,
  );

  const visiblePages = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter((candidate) => {
    if (totalPages <= 5) {
      return true;
    }

    return (
      candidate === 1 ||
      candidate === totalPages ||
      Math.abs(candidate - meta.currentPage) <= 1
    );
  });

  return (
    <section
      id="upcoming-concerts"
      className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16 sm:px-6 lg:px-8"
    >
      <div className="ticketbox-panel p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading eyebrow="Discover" title="Upcoming concerts" />
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-b border-outline-variant/40 pb-4 text-sm text-on-surface-variant/70">
          <p className="font-medium">
            {loading ? (
              "Loading concerts..."
            ) : error ? (
              "Concert data unavailable"
            ) : meta.totalItems === 0 ? (
              "No concerts found"
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-on-surface">
                  {startItem}-{endItem}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-on-surface">
                  {meta.totalItems}
                </span>{" "}
                concerts
              </>
            )}
          </p>
          <p className="tabular-nums">
            Page {meta.currentPage} of {totalPages}
          </p>
        </div>

        {error ? (
          <div className="mt-6 flex items-center gap-3 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <span className="flex h-2 w-2 shrink-0 rounded-full bg-rose-500" />
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-[28px] border border-slate-200 bg-surface p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
                >
                  <div className="h-4 w-24 rounded-full bg-outline-variant/30" />
                  <div className="mt-4 h-6 w-3/4 rounded-full bg-outline-variant/30" />
                  <div className="mt-3 h-4 w-full rounded-full bg-outline-variant/30" />
                  <div className="mt-2 h-4 w-5/6 rounded-full bg-outline-variant/30" />
                  <div className="mt-6 h-10 w-full rounded-2xl bg-outline-variant/30" />
                </div>
              ))
            : items.map((concert, index) => (
                <div
                  key={concert.id}
                  className={`group transition-transform duration-300 ease-out hover:-translate-y-1 ${
                    index === 0 ? "md:col-span-2" : ""
                  }`}
                >
                  <div className="h-full rounded-[28px] transition-shadow duration-300 group-hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
                    <ConcertCard concert={concert} featured={index === 0} />
                  </div>
                </div>
              ))}
        </div>

        {totalPages > 1 ? (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/40 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1 || loading}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-on-surface-variant transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-transparent"
              >
                Previous
              </button>
              {visiblePages.map((pageNumber, index) => {
                const isEllipsis =
                  totalPages > 5 &&
                  index > 0 &&
                  pageNumber - visiblePages[index - 1] > 1;

                if (isEllipsis) {
                  return (
                    <span
                      key={`ellipsis-${pageNumber}`}
                      className="px-2 text-slate-400"
                    >
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    disabled={loading}
                    className={`min-w-10 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                      pageNumber === page
                        ? "bg-primary text-white shadow-sm shadow-primary/30"
                        : "border border-slate-200 text-on-surface-variant hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page === totalPages || loading}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-on-surface-variant transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-transparent"
              >
                Next
              </button>
            </div>
            <p className="text-sm text-on-surface-variant/70 tabular-nums">
              Page {meta.currentPage} of {totalPages}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ConcertsSection() {
  return (
    <Suspense
      fallback={
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <ConcertsSectionInner />
    </Suspense>
  );
}

function GuestLanding() {
  return (
    <SiteShell
      active="/"
      action={
        <div className="flex items-center gap-3">
          <Link href="/login" className="ticketbox-button-primary px-5 py-2.5">
            Login
          </Link>
          <Link
            href="/register"
            className="ticketbox-button-secondary px-5 py-2.5"
          >
            Register
          </Link>
        </div>
      }
    >
      <HeroCarousel />
      <ConcertsSection />
      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <Card className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              Public access
            </p>
            <h2 className="font-display text-3xl font-bold text-on-surface">
              Browse concerts before you sign in
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
              You can view the concert catalog without a token. Signing in only
              changes what happens when you want to reserve seats, checkout, or
              manage your account.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [
                "Public catalog",
                "Concert cards and details load without auth.",
              ],
              [
                "Same explore view",
                "The signed-out home matches the logged-in browse experience.",
              ],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl bg-surface-low p-4">
                <p className="text-sm font-semibold text-on-surface">{title}</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </SiteShell>
  );
}

function AuthenticatedHome() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <SiteShell
      active="/"
      action={
        <button
          type="button"
          onClick={handleLogout}
          className="ticketbox-button-primary px-4 py-2 text-sm"
        >
          Log out
        </button>
      }
    >
      <HeroCarousel />
      <ConcertsSection />
    </SiteShell>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState />;
  }

  return isAuthenticated ? <AuthenticatedHome /> : <GuestLanding />;
}
