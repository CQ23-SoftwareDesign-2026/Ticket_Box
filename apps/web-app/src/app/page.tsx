"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense, Fragment } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, SectionHeading, SiteShell } from "@/components/common";
import { HeroCarousel } from "@/components/screens";
import {
  getConcerts,
  type ConcertCardItem,
  type ConcertListMeta,
} from "@/services/concert.service";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  MapPin,
  Calendar,
} from "lucide-react";

// ─── Mini Concert Card (carousel style) ──────────────────────────────────────
function MiniConcertCard({ concert }: { concert: ConcertCardItem }) {
  return (
    <Link
      href={`/concerts/${concert.id}`}
      className="group flex w-full flex-col gap-3 focus:outline-none"
    >
      {/* Poster */}
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
      {/* Info */}
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
          <div className="flex items-center gap-1 text-xs text-on-surface-variant/60 truncate">
            <MapPin size={11} />
            <span className="truncate">{concert.venue}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Explore More tile ────────────────────────────────────────────────────────
function ExploreMoreTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant/50 bg-surface/50 text-center transition-all duration-300 hover:border-primary/50 hover:bg-surface cursor-pointer"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
        <ChevronRight size={24} className="text-primary" />
      </div>
      <span className="text-sm font-bold text-on-surface-variant group-hover:text-primary transition-colors">
        Khám phá thêm sự kiện
      </span>
    </button>
  );
}

function ConcertsFullList() {
  const searchParams = useSearchParams();
  const search = searchParams?.get("q") || "";
  // URL is the single source of truth — status comes from URL params
  const activeStatus = (searchParams?.get("status") || "PUBLISHED") as
    | "PUBLISHED"
    | "COMPLETED";
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ConcertCardItem[]>([]);
  const [meta, setMeta] = useState<ConcertListMeta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: 12,
    totalPages: 1,
    currentPage: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset page when status changes via URL
  const prevStatus = useRef(activeStatus);
  if (prevStatus.current !== activeStatus) {
    prevStatus.current = activeStatus;
    if (page !== 1) setPage(1);
  }

  useEffect(() => {
    let isActive = true;
    const id = window.setTimeout(() => {
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const r = await getConcerts({
            page,
            limit: meta.itemsPerPage,
            search: search.trim() || undefined,
            status: activeStatus,
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
    }, 250);
    return () => {
      isActive = false;
      clearTimeout(id);
    };
  }, [meta.itemsPerPage, page, search, activeStatus]);

  const totalPages = Math.max(meta.totalPages, 1);

  return (
    <div className="mt-6">
      {/* Search context & count row */}
      <div className="flex flex-col gap-1 mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {search ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Tìm kiếm
              </p>
              <p className="text-sm text-on-surface-variant">
                Kết quả cho:{" "}
                <span className="font-semibold text-on-surface">
                  &ldquo;{search}&rdquo;
                </span>
              </p>
            </>
          ) : null}
        </div>
        <p className="text-sm text-on-surface-variant/60 tabular-nums">
          {loading ? "..." : `${meta.totalItems} sự kiện`}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="animate-pulse flex flex-col gap-3">
                <div className="aspect-[4/3] w-full rounded-2xl bg-outline-variant/30" />
                <div className="h-4 w-3/4 rounded-full bg-outline-variant/30" />
                <div className="h-3 w-1/2 rounded-full bg-outline-variant/20" />
              </div>
            ))
          : items.map((concert) => (
              <MiniConcertCard key={concert.id} concert={concert} />
            ))}
      </div>
      {!loading && items.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-base font-semibold text-on-surface-variant">
            Không có sự kiện nào
          </p>
          <p className="text-sm text-on-surface-variant/50">
            {search
              ? `Không tìm thấy sự kiện nào với từ khóa “${search}”`
              : "Thử bộ lọc khác hoặc quay lại sau"}
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-outline-variant/40 pt-6">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Trước
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1,
            )
            .map((n, idx, arr) => (
              <Fragment key={n}>
                {idx > 0 && arr[idx - 1] !== n - 1 && (
                  <span
                    key={`el-${n}`}
                    className="px-1 text-on-surface-variant/40"
                  >
                    …
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setPage(n)}
                  disabled={loading}
                  className={`min-w-[40px] rounded-full px-3 py-2 text-sm font-bold transition-all duration-200 cursor-pointer ${
                    n === page
                      ? "bg-primary text-white shadow-sm"
                      : "border border-outline-variant text-on-surface-variant hover:border-primary/40 hover:text-primary"
                  } disabled:opacity-40`}
                >
                  {n}
                </button>
              </Fragment>
            ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Tiếp
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
function ConcertsSectionInner() {
  const searchParams = useSearchParams();
  const search = searchParams?.get("q") || "";
  // Auto-expand to full list when a search query is present
  const [showAll, setShowAll] = useState(() => !!search);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  // When search changes, auto-switch to full list
  const prevSearch = useRef(search);
  if (prevSearch.current !== search) {
    prevSearch.current = search;
    if (search && !showAll) setShowAll(true);
  }

  const CARD_WIDTH = 300; // matches carousel card + gap (280px + 20px)
  const STEP = CARD_WIDTH * 4;

  const slide = (dir: 1 | -1) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dir * STEP, behavior: "smooth" });
  };

  const onScroll = () => {
    if (!trackRef.current) return;
    setScrollPos(trackRef.current.scrollLeft);
    setMaxScroll(trackRef.current.scrollWidth - trackRef.current.clientWidth);
  };

  // Recalculate dimensions when view shifts
  useEffect(() => {
    if (!showAll) {
      const timer = setTimeout(onScroll, 600);
      return () => clearTimeout(timer);
    }
  }, [showAll]);

  return (
    <section
      id="upcoming-concerts"
      className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16 sm:px-6 lg:px-8"
    >
      <div className="ticketbox-panel p-6 sm:p-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <SectionHeading eyebrow="Khám phá" title="Sự kiện nổi bật" />
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            {showAll ? "Thu gọn" : "Xem thêm"}
            <ArrowRight
              size={15}
              className={`transition-transform duration-300 ${showAll ? "rotate-90" : ""}`}
            />
          </button>
        </div>

        {!showAll ? (
          /* ── CAROUSEL MODE ── */
          <div className="relative">
            {/* Left arrow */}
            <button
              type="button"
              onClick={() => slide(-1)}
              aria-label="Cuộn trái"
              disabled={scrollPos <= 5}
              className="absolute -left-4 top-[calc(50%-48px)] z-10 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface shadow-md transition-all duration-200 hover:border-primary hover:text-primary disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Scrollable track */}
            <div
              ref={trackRef}
              onScroll={onScroll}
              className="flex gap-5 overflow-x-auto scrollbar-none pb-1"
            >
              <Suspense
                fallback={
                  <div className="flex gap-5">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className="shrink-0 w-[280px] animate-pulse">
                        <div className="aspect-[4/3] rounded-2xl bg-outline-variant/30" />
                        <div className="mt-3 h-4 w-3/4 rounded-full bg-outline-variant/20" />
                      </div>
                    ))}
                  </div>
                }
              >
                <CarouselItems
                  onShowAll={() => setShowAll(true)}
                  onLoaded={() => setTimeout(onScroll, 100)}
                />
              </Suspense>
            </div>

            {/* Right arrow */}
            <button
              type="button"
              onClick={() => slide(1)}
              aria-label="Cuộn phải"
              disabled={scrollPos >= maxScroll - 5}
              className="absolute -right-4 top-[calc(50%-48px)] z-10 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface shadow-md transition-all duration-200 hover:border-primary hover:text-primary disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          /* ── FULL LIST MODE ── */
          <Suspense
            fallback={
              <div className="h-64 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            }
          >
            <ConcertsFullList />
          </Suspense>
        )}
      </div>
    </section>
  );
}

// ─── Carousel items (needs useSearchParams → Suspense boundary) ──────────────
function CarouselItems({
  onShowAll,
  onLoaded,
}: {
  onShowAll: () => void;
  onLoaded?: () => void;
}) {
  const searchParams = useSearchParams();
  const statusFilter = (searchParams?.get("status") || "PUBLISHED") as
    | "PUBLISHED"
    | "COMPLETED";
  const [items, setItems] = useState<ConcertCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const id = window.setTimeout(() => {
      const load = async () => {
        setLoading(true);
        try {
          const r = await getConcerts({
            page: 1,
            limit: 9,
            status: statusFilter,
          });
          if (!isActive) return;
          setItems(r.items);
        } catch {
          if (!isActive) return;
          setItems([]);
        } finally {
          if (isActive) {
            setLoading(false);
            onLoaded?.();
          }
        }
      };
      void load();
    }, 0);
    return () => {
      isActive = false;
      clearTimeout(id);
    };
  }, [statusFilter]);

  if (loading) {
    return (
      <>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="shrink-0 w-[280px] animate-pulse">
            <div className="aspect-[4/3] rounded-2xl bg-outline-variant/30" />
            <div className="mt-3 h-4 w-3/4 rounded-full bg-outline-variant/20" />
            <div className="mt-2 h-3 w-1/2 rounded-full bg-outline-variant/20" />
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {items.map((concert) => (
        <div key={concert.id} className="shrink-0 w-[280px]">
          <MiniConcertCard concert={concert} />
        </div>
      ))}
      <div className="shrink-0 w-[280px]">
        <ExploreMoreTile onClick={onShowAll} />
      </div>
    </>
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

function LoadingState() {
  return (
    <main className="auth-page flex items-center justify-center px-4">
      <div className="ticketbox-panel flex items-center gap-4 px-6 py-5">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="ticketbox-muted">Đang khôi phục phiên...</p>
      </div>
    </main>
  );
}

function GuestLanding() {
  return (
    <SiteShell
      active="/"
      action={
        <div className="flex items-center gap-3">
          <Link href="/login" className="ticketbox-button-primary px-5 py-2.5">
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="ticketbox-button-secondary px-5 py-2.5"
          >
            Đăng ký
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
              Khám phá concert trước khi đăng nhập
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
              Bạn có thể xem danh sách concert mà không cần tài khoản. Đăng nhập
              chỉ cần thiết khi bạn muốn đặt chỗ, thanh toán hoặc quản lý vé.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [
                "Danh mục công khai",
                "Thẻ concert và chi tiết tải mà không cần xác thực.",
              ],
              [
                "Cùng trải nghiệm",
                "Giao diện duyệt giống nhau dù bạn đăng nhập hay không.",
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
          Đăng xuất
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
