"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import {
  getConcerts,
  deleteConcert,
  getConcertPosterUrl,
  type ConcertCardItem,
} from "@/services/concert.service";
import {
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  CalendarOff,
  Pencil,
  Eye,
  Trash2,
  Hourglass,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ConcertWorkerDrawer } from "./_components/ConcertWorkerDrawer";

export default function AdminEventsPage() {
  const { success, error: toastError, warning } = useToast();
  const [concerts, setConcerts] = useState<ConcertCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedWorkerConcert, setSelectedWorkerConcert] =
    useState<ConcertCardItem | null>(null);
  const [isWorkerDrawerOpen, setIsWorkerDrawerOpen] = useState(false);

  // Debounce search input to prevent API spamming
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    async function fetchConcerts() {
      setIsLoading(true);
      try {
        const response = await getConcerts({
          page,
          limit,
          search: debouncedSearch || undefined,
          status: statusFilter === "All" ? undefined : statusFilter,
        });
        setConcerts(response.items);
        setTotalPages(response.meta.totalPages);
      } catch (error) {
        console.error("Failed to load concerts", error);
      } finally {
        setIsLoading(false);
      }
    }
    void fetchConcerts();
  }, [page, limit, debouncedSearch, statusFilter]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setIsDeleting(id);
    setDeleteTarget(null);
    try {
      await deleteConcert(id);
      setConcerts((prev) => prev.filter((c) => c.id !== id));
      success("Xóa sự kiện thành công!");
    } catch (error) {
      console.error("Failed to delete concert", error);
      toastError("Xóa sự kiện thất bại. Sự kiện có thể đã có đơn hàng.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExport = () => {
    if (concerts.length === 0) {
      warning("Không có dữ liệu để xuất.");
      return;
    }
    const headers = ["ID", "Tên sự kiện", "Địa điểm", "Thành phố", "Ngày", "Giờ", "Trạng thái"];
    const csvContent = [
      headers.join(","),
      ...concerts.map((c) =>
        [
          c.id,
          `"${c.title}"`,
          `"${c.venue}"`,
          `"${c.city}"`,
          c.date,
          c.time,
          c.status,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `danh_sach_su_kien_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-1">
            Quản lý Sự kiện
          </h2>
          <p className="text-muted-foreground font-body text-sm">
            Theo dõi, chỉnh sửa và quản lý tất cả các sự kiện bán vé trên hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="hidden md:flex items-center gap-2 px-4 py-2 text-primary border border-border rounded-lg hover:bg-surface-high transition-all font-semibold text-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Xuất danh sách
          </button>
          <Link
            href="/admin/create-event"
            className="flex-1 md:flex-none bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Tạo sự kiện
          </Link>
        </div>
      </header>

      {/* Search and Filter Bar */}
      <section className="bg-surface p-4 rounded-xl shadow-sm border border-border flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all text-foreground"
            placeholder="Tìm kiếm sự kiện theo tên, ID hoặc địa điểm..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto font-semibold">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="flex-1 md:w-48 px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-foreground"
          >
            <option value="All">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("All");
              setPage(1);
            }}
            className="p-2.5 bg-background border border-border hover:bg-surface-high hover:border-primary text-muted-foreground hover:text-primary rounded-lg transition-all flex items-center justify-center cursor-pointer active:scale-95 duration-200"
            title="Đặt lại bộ lọc"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Data Table */}
      <section className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-6 py-4 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tên sự kiện
                </th>
                <th className="px-6 py-4 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ngày & Giờ
                </th>
                <th className="px-6 py-4 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Địa điểm
                </th>
                <th className="px-6 py-4 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                  Trạng thái
                </th>
                <th className="px-6 py-4 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <p className="text-sm font-medium">Đang tải danh sách sự kiện...</p>
                    </div>
                  </td>
                </tr>
              ) : concerts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <CalendarOff className="w-10 h-10 text-border" />
                      <p className="text-sm font-medium">
                        Không tìm thấy sự kiện nào khớp với bộ lọc.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                concerts.map((concert) => (
                  <tr
                    key={concert.id}
                    className="hover:bg-surface-high/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg bg-primary/10 overflow-hidden shrink-0 bg-cover bg-center"
                          style={{
                            backgroundImage: `url('${getConcertPosterUrl(concert.posterUrl)}')`,
                          }}
                        ></div>
                        <div>
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {concert.title}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-body text-sm font-medium text-foreground">
                        {concert.date}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {concert.time}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-body text-sm font-medium text-foreground">
                      {concert.venue}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          concert.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : concert.status === "COMING_SOON"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : concert.status === "COMPLETED"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : concert.status === "CANCELLED"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        }`}
                      >
                        {concert.status === "PUBLISHED" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        )}
                        {concert.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/admin/create-event?edit=${concert.id}`}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Chỉnh sửa sự kiện"
                        >
                          <Pencil className="w-5 h-5" />
                        </Link>
                        <Link
                          href={`/concerts/${concert.id}`}
                          target="_blank"
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Xem trang công khai"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedWorkerConcert(concert);
                            setIsWorkerDrawerOpen(true);
                          }}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer"
                          title="Tác vụ AI & Import khách mời"
                        >
                          <Sparkles className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(concert.id, concert.title)
                          }
                          disabled={isDeleting === concert.id}
                          className="p-2 text-muted-foreground hover:text-error hover:bg-error/10 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                          title="Xóa sự kiện"
                        >
                          {isDeleting === concert.id ? (
                            <Hourglass className="w-5 h-5" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {!isLoading && totalPages > 1 && (
          <div className="px-6 py-4 bg-background border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-muted-foreground font-body">
                Trang <span className="font-bold text-foreground">{page}</span> trên{" "}
                <span className="font-bold text-foreground">{totalPages}</span>
              </span>

              {/* Limit Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Hiển thị:
                </span>
                <div className="relative">
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="appearance-none pl-2.5 pr-7 py-1 border border-border rounded-lg bg-surface font-body text-xs focus:outline-none focus:border-primary text-foreground font-semibold cursor-pointer"
                  >
                    <option value={10}>10 dòng</option>
                    <option value={20}>20 dòng</option>
                    <option value={50}>50 dòng</option>
                    <option value={100}>100 dòng</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-muted-foreground">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-border rounded-lg hover:border-primary/50 hover:text-primary transition-all disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5">
                {getPageNumbers().map((p: number | string, idx: number) => {
                  if (p === "...") {
                    return (
                      <span key={`dots-${idx}`} className="px-2 text-muted-foreground text-xs font-semibold select-none">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = p === page;
                  return (
                    <button
                      key={`page-${p}`}
                      onClick={() => setPage(p as number)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-primary border-primary text-white"
                          : "border-border hover:border-primary/50 text-foreground hover:text-primary"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-border rounded-lg hover:border-primary/50 hover:text-primary transition-all disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      <ConcertWorkerDrawer
        isOpen={isWorkerDrawerOpen}
        onClose={() => {
          setIsWorkerDrawerOpen(false);
          setSelectedWorkerConcert(null);
        }}
        concert={
          selectedWorkerConcert
            ? {
                id: selectedWorkerConcert.id,
                title: selectedWorkerConcert.title,
                venue: selectedWorkerConcert.venue,
                date: selectedWorkerConcert.date,
              }
            : null
        }
      />

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Xác nhận xóa sự kiện"
        message={`Bạn có chắc chắn muốn xóa sự kiện "${deleteTarget?.name}" không? Hành động này sẽ hủy sự kiện và không thể hoàn tác.`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
        <p className="font-body text-sm text-muted-foreground leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-border text-foreground hover:bg-surface-high transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

