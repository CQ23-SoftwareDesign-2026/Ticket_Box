"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, SectionHeading, SiteShell } from "@/components/common";
import { HeroCarousel } from "@/components/screens";
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

function ConcertsSection() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ConcertCardItem[]>([]);
  const [meta, setMeta] = useState<ConcertListMeta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: 3,
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
  }, [meta.itemsPerPage, page, search]);

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
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="ticketbox-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Discover"
            title="Upcoming concerts"
            description="Live data from the concert database, with server-side pagination and search."
          />
          <div className="w-full max-w-md">
            <label
              className="mb-2 block text-sm font-semibold text-slate-700"
              htmlFor="concert-search"
            >
              Search concerts
            </label>
            <input
              id="concert-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name or location"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0f62fe] focus:ring-4 focus:ring-[#0f62fe]/10"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            {loading
              ? "Loading concerts..."
              : error
                ? "Concert data unavailable"
                : meta.totalItems === 0
                  ? "No concerts found"
                  : `Showing ${startItem}-${endItem} of ${meta.totalItems} concerts`}
          </p>
          <p>
            Page {meta.currentPage} of {totalPages}
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
                >
                  <div className="h-4 w-24 rounded-full bg-slate-100" />
                  <div className="mt-4 h-6 w-3/4 rounded-full bg-slate-100" />
                  <div className="mt-3 h-4 w-full rounded-full bg-slate-100" />
                  <div className="mt-2 h-4 w-5/6 rounded-full bg-slate-100" />
                  <div className="mt-6 h-10 w-full rounded-2xl bg-slate-100" />
                </div>
              ))
            : items.map((concert) => {
                return (
                  <article
                    key={concert.id}
                    className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`ticketbox-badge w-fit border ${
                            concert.status?.toUpperCase() === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : concert.status?.toUpperCase() === "COMING_SOON"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : concert.status?.toUpperCase() === "COMPLETED"
                                  ? "bg-slate-500/10 text-slate-600 border-slate-500/20"
                                  : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                          }`}
                        >
                          {concert.status}
                        </p>
                        <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900">
                          {concert.title}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p>{concert.venue}</p>
                      <p>{concert.city || "Unknown city"}</p>
                      <p>
                        {concert.date} at {concert.time}
                      </p>
                    </div>

                    <p className="mt-4 max-h-[4.5rem] overflow-hidden text-sm leading-6 text-slate-500">
                      {concert.description}
                    </p>

                    <div className="mt-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                          Concert
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {concert.price}
                        </p>
                      </div>
                      <Link
                        href={`/concerts/${concert.id}`}
                        className="rounded-full bg-[#0f62fe]/10 px-4 py-2 text-sm font-semibold text-[#0f62fe] transition hover:bg-[#0f62fe]/15"
                      >
                        View details
                      </Link>
                    </div>
                  </article>
                );
              })}
        </div>

        {totalPages > 1 ? (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1 || loading}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
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
                    className={`min-w-[2.5rem] rounded-full px-4 py-2 text-sm font-semibold transition ${
                      pageNumber === page
                        ? "bg-primary text-white"
                        : "border border-slate-200 text-slate-700 hover:border-primary hover:text-primary"
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
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Page {meta.currentPage} of {totalPages}
            </p>
          </div>
        ) : null}
      </div>
    </section>
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
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-3 lg:px-8">
        {[
          ["Live drops", "New seats open every Friday at 9 AM."],
          [
            "Best sellers",
            "Premium floor and lounge access are the first to disappear.",
          ],
          [
            "Instant checkout",
            "Reserve seats with a short timer and a streamlined payment flow.",
          ],
        ].map(([title, description]) => (
          <Card key={title} className="card-lift p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Highlights
            </p>
            <h3 className="mt-3 font-display text-2xl font-bold text-on-surface">
              {title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              {description}
            </p>
          </Card>
        ))}
      </section>
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
