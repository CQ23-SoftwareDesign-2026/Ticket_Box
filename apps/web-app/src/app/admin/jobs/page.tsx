"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Cpu,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  Copy,
  Check,
} from "lucide-react";
import {
  getBackgroundJobs,
  type BackgroundJobWithMeta,
  type BackgroundJobsListResponse,
} from "@/services/worker.service";

// ── Display maps ────────────────────────────────────────────────
const JOB_TYPE_MAP: Record<string, { label: string; className: string }> = {
  GENERATE_BIO: {
    label: "Tạo Bio AI",
    className: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  },
  GUEST_LIST_IMPORT: {
    label: "Import khách mời",
    className: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  },
};

const STATUS_MAP: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "Đang chờ",
    className: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    icon: <Clock className="w-3 h-3" />,
  },
  PROCESSING: {
    label: "Đang xử lý",
    className:
      "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  COMPLETED: {
    label: "Hoàn thành",
    className:
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  FAILED: {
    label: "Thất bại",
    className: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    icon: <XCircle className="w-3 h-3" />,
  },
};

// ── Utility components ──────────────────────────────────────────
function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      onClick={handleCopy}
      title="Sao chép ID đầy đủ"
      className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-all active:scale-90 cursor-pointer shrink-0"
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-400" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
}

function MiniProgressBar({ value, status }: { value: number; status: string }) {
  const barColor =
    status === "COMPLETED"
      ? "bg-emerald-500"
      : status === "FAILED"
        ? "bg-rose-500"
        : status === "PROCESSING"
          ? "bg-blue-500"
          : "bg-amber-500";
  return (
    <div className="flex items-center gap-2 w-full min-w-[80px]">
      <div className="flex-1 bg-border rounded-full h-1.5 overflow-hidden">
        <div
          className={`${barColor} h-full rounded-full transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] font-bold tabular-nums text-muted-foreground w-7 text-right">
        {value}%
      </span>
    </div>
  );
}

function formatDt(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function StatCard({
  label,
  value,
  colorClass,
  icon,
}: {
  label: string;
  value: number;
  colorClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 flex items-center gap-4 shadow-sm">
      <div className={`p-3 rounded-xl ${colorClass}`}>{icon}</div>
      <div>
        <p className="text-2xl font-black font-display text-foreground tabular-nums">
          {value}
        </p>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function computePageNumbers(page: number, totalPages: number): (number | "...")[] {
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (page <= 3) {
    pages.push(1, 2, 3, 4, "...", totalPages);
  } else if (page >= totalPages - 2) {
    pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
  }
  return pages;
}

// ── Main Page ───────────────────────────────────────────────────
export default function AdminJobsPage() {
  const [response, setResponse] = useState<BackgroundJobsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchJobs = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      try {
        const data = await getBackgroundJobs({
          page,
          limit,
          status: statusFilter || undefined,
          job_type: typeFilter || undefined,
          concert_id: debouncedSearch || undefined,
        });
        setResponse(data);
      } catch (err) {
        console.error("Failed to fetch background jobs:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, limit, statusFilter, typeFilter, debouncedSearch],
  );

  useEffect(() => {
    void fetchJobs(false);
  }, [fetchJobs]);

  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    const hasActive = response?.data.some(
      (j) => j.status === "PENDING" || j.status === "PROCESSING",
    );
    if (hasActive) {
      autoRefreshRef.current = setInterval(() => {
        void fetchJobs(true);
      }, 5000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [response, fetchJobs]);

  const jobs: BackgroundJobWithMeta[] = response?.data ?? [];
  const meta = response?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const pending = jobs.filter((j) => j.status === "PENDING").length;
  const processing = jobs.filter((j) => j.status === "PROCESSING").length;
  const failed = jobs.filter((j) => j.status === "FAILED").length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Cpu className="w-6 h-6 text-primary" />
            Tác vụ nền
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi tất cả background jobs trong hệ thống (AI Bio, Import khách mời…)
          </p>
        </div>
        <button
          onClick={() => void fetchJobs(false)}
          disabled={isLoading || isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-border rounded-lg text-foreground hover:bg-surface-high transition-all disabled:opacity-50 cursor-pointer select-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Đang cập nhật..." : "Làm mới"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng số tác vụ"
          value={meta?.total ?? 0}
          colorClass="bg-primary/10 text-primary"
          icon={<Cpu className="w-5 h-5" />}
        />
        <StatCard
          label="Đang chờ"
          value={pending}
          colorClass="bg-amber-500/10 text-amber-400"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Đang xử lý"
          value={processing}
          colorClass="bg-blue-500/10 text-blue-400"
          icon={<Loader2 className="w-5 h-5" />}
        />
        <StatCard
          label="Thất bại"
          value={failed}
          colorClass="bg-rose-500/10 text-rose-400"
          icon={<XCircle className="w-5 h-5" />}
        />
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-border p-4 flex flex-col sm:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo Concert ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border bg-background rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border bg-background rounded-lg text-sm font-semibold cursor-pointer focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Đang chờ</option>
          <option value="PROCESSING">Đang xử lý</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="FAILED">Thất bại</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border bg-background rounded-lg text-sm font-semibold cursor-pointer focus:outline-none"
        >
          <option value="">Tất cả loại tác vụ</option>
          <option value="GENERATE_BIO">Tạo Bio AI</option>
          <option value="GUEST_LIST_IMPORT">Import khách mời</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-high/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider select-none">
                <th className="px-4 py-3">ID Tác vụ</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Sự kiện</th>
                <th className="px-4 py-3">Người tạo</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 w-36">Tiến trình</th>
                <th className="px-4 py-3 whitespace-nowrap">Tạo lúc</th>
                <th className="px-4 py-3 whitespace-nowrap">Hoàn thành lúc</th>
                <th className="px-4 py-3">Lỗi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center select-none">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Đang tải dữ liệu…</p>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center select-none">
                    <Cpu className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Không tìm thấy tác vụ nào.</p>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const typeInfo = JOB_TYPE_MAP[job.job_type] ?? {
                    label: job.job_type,
                    className: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
                  };
                  const statusInfo = STATUS_MAP[job.status] ?? {
                    label: job.status,
                    className: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
                    icon: null,
                  };
                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-surface/50 transition-colors"
                    >
                      {/* Job ID */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-[10px] text-muted-foreground select-all">
                            {job.id.slice(0, 8)}…
                          </code>
                          <CopyIdButton id={job.id} />
                        </div>
                      </td>

                      {/* Job type */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${typeInfo.className}`}
                        >
                          {typeInfo.label}
                        </span>
                      </td>

                      {/* Concert name */}
                      <td className="px-4 py-3 max-w-[200px]">
                        {job.concert_name ? (
                          <Link
                            href={`/admin/create-event?id=${job.target_id}`}
                            className="text-primary hover:underline font-semibold line-clamp-2 leading-snug"
                            title={job.concert_name}
                          >
                            {job.concert_name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/40 italic">—</span>
                        )}
                      </td>

                      {/* Triggered by */}
                      <td className="px-4 py-3">
                        {job.triggered_by_name ? (
                          <div>
                            <p className="font-semibold text-foreground">
                              {job.triggered_by_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground select-all">
                              {job.triggered_by_email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 italic">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusInfo.className}`}
                        >
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-3">
                        <MiniProgressBar
                          value={job.progress_percentage}
                          status={job.status}
                        />
                      </td>

                      {/* Created at */}
                      <td className="px-4 py-3 text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDt(job.created_at)}
                      </td>

                      {/* Completed at */}
                      <td className="px-4 py-3 text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDt(job.completed_at)}
                      </td>

                      {/* Error */}
                      <td className="px-4 py-3 max-w-[180px]">
                        {job.error_message ? (
                          <span
                            className="text-rose-400 text-[10px] leading-snug line-clamp-2"
                            title={job.error_message}
                          >
                            {job.error_message}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && jobs.length > 0 && meta && (
          <div className="px-4 py-3 border-t border-border bg-surface-high/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-semibold">
                {meta.total} tác vụ · Trang {meta.page}/{meta.totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Hiển thị:
                </span>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="px-1.5 py-0.5 border border-border bg-background rounded text-[10px] font-semibold cursor-pointer focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex justify-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-border bg-background hover:bg-surface-high disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {computePageNumbers(page, totalPages).map((p, idx) =>
                p === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 py-1 text-[10px] text-muted-foreground font-bold self-center"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    onClick={() => setPage(Number(p))}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                      page === p
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border hover:border-primary/50 text-foreground hover:text-primary bg-background"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-border bg-background hover:bg-surface-high disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      {response?.data.some(
        (j) => j.status === "PENDING" || j.status === "PROCESSING",
      ) && (
        <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 select-none">
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
          Đang có tác vụ hoạt động — tự động làm mới mỗi 5 giây
        </p>
      )}
    </div>
  );
}
