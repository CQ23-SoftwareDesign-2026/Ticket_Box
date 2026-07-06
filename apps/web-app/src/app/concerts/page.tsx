"use client";

import { Suspense, useEffect, useState, useRef, Fragment, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { SiteShell } from "@/components/common";
import { useToast } from "@/context/ToastContext";
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
      className="group flex flex-col rounded-3xl border border-outline-variant/30 bg-surface/10 p-3 hover:bg-surface/20 hover:-translate-y-1 hover:shadow-xl hover:border-outline-variant/50 transition-all duration-300 shadow-md focus:outline-none"
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
      <div className="flex flex-col gap-2 p-2 flex-1 justify-between">
        <h3 className="line-clamp-2 text-sm font-bold text-on-surface transition-colors group-hover:text-primary leading-snug">
          {concert.title}
        </h3>
        <div className="space-y-1.5 mt-auto">
          <p className="text-xs font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg w-fit">
            {concert.price}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant/70">
            <Calendar size={12} className="text-primary/60" />
            <span>{concert.date}</span>
          </div>
          {concert.venue && (
            <div className="flex items-center gap-1.5 truncate text-[11px] text-on-surface-variant/60">
              <MapPin size={12} className="text-primary/60 shrink-0" />
              <span className="truncate">{concert.venue}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Concert List with pagination ────────────────────────────────────────────
function ConcertList() {
  const router = useRouter();
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
  const { error: showErrorToast } = useToast();

  const [searchVal, setSearchVal] = useState(search);
  const [prevSearch, setPrevSearch] = useState(search);

  if (prevSearch !== search) {
    setPrevSearch(search);
    setSearchVal(search);
  }

  // Reset to page 1 when filter changes — handled inside the effect via a separate
  // ref that is only read (never mutated) during render, satisfying react-hooks/refs.
  const filterRef = useRef({ status, search });

  const handleStatusChange = (newStatus: "PUBLISHED" | "COMPLETED") => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("status", newStatus);
    params.set("page", "1");
    router.push(`/concerts?${params.toString()}`);
  };

  const handleSearchChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    params.set("page", "1");
    router.push(`/concerts?${params.toString()}`);
  }, [searchParams, router]);

  // Debounced search logic
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearch = useCallback((val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearchChange(val);
    }, 450);
  }, [handleSearchChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
          showErrorToast(e instanceof Error ? e.message : "Không thể tải concert.");
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
  }, [page, status, search, showErrorToast]);

  const totalPages = Math.max(meta.totalPages, 1);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant/60 hover:text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            Trang chủ
          </Link>
          <h1 className="font-display text-3xl font-black text-on-surface">
            Danh sách Sự kiện
          </h1>
          {search && (
            <p className="mt-1 text-sm text-on-surface-variant/60">
              Tìm thấy <span className="font-bold text-primary">{meta.totalItems}</span> kết quả cho &ldquo;{search}&rdquo;
            </p>
          )}
        </div>
        <p className="text-sm text-on-surface-variant/60 tabular-nums">
          {loading ? "Đang tải..." : `${meta.totalItems} sự kiện`}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-surface/10 border border-outline-variant/30 rounded-3xl p-4 backdrop-blur-lg">
        {/* Status Tabs */}
        <div className="flex bg-surface-low border border-outline-variant/20 rounded-2xl p-1 w-full md:w-auto">
          <button
            type="button"
            onClick={() => handleStatusChange("PUBLISHED")}
            className={`flex-1 md:flex-none text-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
              status === "PUBLISHED"
                ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-high/50"
            }`}
          >
            Sắp diễn ra
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange("COMPLETED")}
            className={`flex-1 md:flex-none text-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
              status === "COMPLETED"
                ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-high/50"
            }`}
          >
            Đã kết thúc
          </button>
        </div>

        {/* Search input on the catalog page */}
        <div className="relative w-full md:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-on-surface-variant/50">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm sự kiện..."
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              debouncedSearch(e.target.value);
            }}
            className="w-full rounded-2xl border border-outline-variant/50 bg-surface px-10 py-2.5 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {searchVal && (
            <button
              type="button"
              onClick={() => {
                setSearchVal("");
                handleSearchChange("");
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant/50 hover:text-on-surface cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
          <p className="text-base font-semibold text-on-surface-variant">
            Không tìm thấy sự kiện nào
          </p>
          <p className="text-sm text-on-surface-variant/50">
            Thử bộ lọc khác hoặc thay đổi từ khóa tìm kiếm
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 border-t border-outline-variant/40 pt-8">
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
    <SiteShell active="/concerts">
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
