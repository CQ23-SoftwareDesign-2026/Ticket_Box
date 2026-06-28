"use client";

import { Suspense, useEffect, useState, useRef, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SiteShell } from "@/components/common";
import {
  getConcerts,
  type ConcertCardItem,
  type ConcertListMeta,
} from "@/services/concert.service";

const ITEMS_PER_PAGE = 12;

// ─── Mini Concert Card ────────────────────────────────────────────────────────
function ConcertGridCard({ concert }: { concert: ConcertCardItem }) {
  return (
    <Link
      href={`/concerts/${concert.id}`}
      className="group flex flex-col gap-3 focus:outline-none"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            concert.posterUrl && concert.posterUrl.startsWith("http")
              ? concert.posterUrl
              : "/Mockimg.webp"
          }
          alt={concert.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <h3 className="line-clamp-2 text-sm font-bold text-on-surface transition-colors group-hover:text-primary">
          {concert.title}
        </h3>
        <p className="text-[13px] font-bold text-primary">{concert.price}</p>
        <div className="flex items-center gap-1 text-xs text-on-surface-variant/70">
          <Calendar size={11} />
          <span>{concert.date}</span>
        </div>
        {concert.venue && (
          <div className="flex items-center gap-1 truncate text-xs text-on-surface-variant/60">
            <MapPin size={11} />
            <span className="truncate">{concert.venue}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Concert List with pagination ────────────────────────────────────────────
function ConcertList() {
  const searchParams = useSearchParams();
  const status = (searchParams?.get("status") || "PUBLISHED") as
    | "PUBLISHED"
    | "COMPLETED";
  const search = searchParams?.get("q") || "";

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ConcertCardItem[]>([]);
  const [meta, setMeta] = useState<ConcertListMeta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: ITEMS_PER_PAGE,
    totalPages: 1,
    currentPage: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset to page 1 when filter changes — handled inside the effect via a separate
  // ref that is only read (never mutated) during render, satisfying react-hooks/refs.
  const filterRef = useRef({ status, search });

  useEffect(() => {
    // Detect filter change and reset page
    const prev = filterRef.current;
    const filterChanged = prev.status !== status || prev.search !== search;
    filterRef.current = { status, search };
    const targetPage = filterChanged ? 1 : page;
    if (filterChanged) setPage(1);

    let isActive = true;
    const id = window.setTimeout(() => {
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const r = await getConcerts({
            page: targetPage,
            limit: ITEMS_PER_PAGE,
            status,
            search: search.trim() || undefined,
          });
          if (!isActive) return;
          setItems(r.items);
          setMeta(r.meta);
        } catch (e) {
          if (!isActive) return;
          setItems([]);
          setError(e instanceof Error ? e.message : "Không thể tải concert.");
        } finally {
          if (isActive) setLoading(false);
        }
      };
      void load();
    }, 150);
    return () => {
      isActive = false;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, search]);

  const totalPages = Math.max(meta.totalPages, 1);
  const label = status === "PUBLISHED" ? "Sắp diễn ra" : "Đã kết thúc";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant/60 hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            Trang chủ
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            {status}
          </p>
          <h1 className="font-display text-3xl font-black text-on-surface">
            {label}
          </h1>
          {search && (
            <p className="mt-1 text-sm text-on-surface-variant/60">
              Kết quả cho:{" "}
              <span className="font-semibold text-on-surface">
                &ldquo;{search}&rdquo;
              </span>
            </p>
          )}
        </div>
        <p className="text-sm text-on-surface-variant/60 tabular-nums">
          {loading ? "..." : `${meta.totalItems} sự kiện`}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex animate-pulse flex-col gap-3">
                <div className="aspect-[4/3] w-full rounded-2xl bg-outline-variant/30" />
                <div className="h-4 w-3/4 rounded-full bg-outline-variant/30" />
                <div className="h-3 w-1/2 rounded-full bg-outline-variant/20" />
              </div>
            ))
          : items.map((concert) => (
              <ConcertGridCard key={concert.id} concert={concert} />
            ))}
      </div>

      {!loading && items.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
          <p className="text-base font-semibold text-on-surface-variant">
            Không có sự kiện nào
          </p>
          <p className="text-sm text-on-surface-variant/50">
            Thử bộ lọc khác hoặc quay lại sau
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t border-outline-variant/40 pt-8">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            aria-label="Trang trước"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1,
            )
            .map((n, idx, arr) => (
              <Fragment key={n}>
                {idx > 0 && arr[idx - 1] !== n - 1 && (
                  <span className="px-1 text-on-surface-variant/40">…</span>
                )}
                <button
                  type="button"
                  onClick={() => setPage(n)}
                  disabled={loading}
                  className={`min-w-[40px] cursor-pointer rounded-full px-3 py-2 text-sm font-bold transition-all duration-200 disabled:opacity-40 ${
                    n === page
                      ? "bg-primary text-white shadow-sm"
                      : "border border-outline-variant text-on-surface-variant hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {n}
                </button>
              </Fragment>
            ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            aria-label="Trang sau"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ConcertsPage() {
  return (
    <SiteShell active="/">
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }
      >
        <ConcertList />
      </Suspense>
    </SiteShell>
  );
}
