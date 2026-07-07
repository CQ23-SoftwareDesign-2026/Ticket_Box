"use client";

import { useEffect, useState, useRef } from "react";
import { useToast } from "@/context/ToastContext";
import {
  X,
  Upload,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  importCsv,
  getJobStatus,
  getGuestList,
  type GuestListItem,
  type BackgroundJob,
} from "@/services/worker.service";

interface ConcertWorkerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  concert: {
    id: string;
    title: string;
    venue: string;
    date: string;
  } | null;
}

export function ConcertWorkerDrawer({
  isOpen,
  onClose,
  concert,
}: ConcertWorkerDrawerProps) {
  const { success, error: toastError } = useToast();

  // Guest List Import Job State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importJob, setImportJob] = useState<BackgroundJob | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Guest List Table State
  const [guests, setGuests] = useState<GuestListItem[]>([]);
  const [totalGuests, setTotalGuests] = useState(0);
  const [isGuestsLoading, setIsGuestsLoading] = useState(false);
  const [guestSearch, setGuestSearch] = useState("");
  const [guestScanStatus, setGuestScanStatus] = useState("All");
  const [guestPage, setGuestPage] = useState(1);
  const [guestLimit, setGuestLimit] = useState(10);
  const [guestTotalPages, setGuestTotalPages] = useState(1);

  // Polling intervals refs
  const importIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean intervals on unmount
  useEffect(() => {
    return () => {
      if (importIntervalRef.current) clearInterval(importIntervalRef.current);
    };
  }, []);

  // Fetch guest list
  const fetchGuests = async () => {
    if (!concert?.id) return;
    setIsGuestsLoading(true);
    try {
      const scanParam =
        guestScanStatus === "All" ? undefined : guestScanStatus === "SCANNED";

      const res = await getGuestList(concert.id, {
        page: guestPage,
        limit: guestLimit,
        search: guestSearch || undefined,
        category: undefined,
        is_scanned: scanParam,
      });

      setGuests(res.data);
      setTotalGuests(res.meta.total);
      setGuestTotalPages(res.meta.totalPages);
    } catch (err) {
      console.error("Failed to load guest list:", err);
    } finally {
      setIsGuestsLoading(false);
    }
  };

  // Load data when drawer opens or page/search/limit changes
  useEffect(() => {
    if (isOpen && concert) {
      const timer = setTimeout(() => {
        void fetchGuests();
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, concert, guestPage, guestLimit, guestSearch, guestScanStatus]);

  // Handle CSV Import
  const handleCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concert?.id || !csvFile) return;

    setIsImporting(true);
    setImportJob(null);

    try {
      const job = await importCsv(concert.id, csvFile);
      setImportJob(job);
      pollImportJob(job.id);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Đăng tải danh sách khách mời thất bại.");
      setIsImporting(false);
    }
  };

  // Poll CSV Import Job Status
  const pollImportJob = (jobId: string) => {
    if (importIntervalRef.current) clearInterval(importIntervalRef.current);

    const checkStatus = async () => {
      try {
        const job = await getJobStatus(jobId);
        setImportJob(job);

        if (job.status === "COMPLETED") {
          if (importIntervalRef.current)
            clearInterval(importIntervalRef.current);
          setIsImporting(false);
          setCsvFile(null);
          setGuestPage(1);
          success("Đăng tải và nhập danh sách khách mời thành công!");
          void fetchGuests();
        } else if (job.status === "FAILED") {
          if (importIntervalRef.current)
            clearInterval(importIntervalRef.current);
          setIsImporting(false);
          toastError(job.error_message || "Tiến trình nhập danh sách thất bại.");
        }
      } catch (err) {
        console.error("Failed to check import job status:", err);
      }
    };

    void checkStatus();
    importIntervalRef.current = setInterval(checkStatus, 2000);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (guestTotalPages <= 5) {
      for (let i = 1; i <= guestTotalPages; i++) pages.push(i);
    } else {
      if (guestPage <= 2) {
        pages.push(1, 2, 3, "...", guestTotalPages);
      } else if (guestPage >= guestTotalPages - 1) {
        pages.push(1, "...", guestTotalPages - 2, guestTotalPages - 1, guestTotalPages);
      } else {
        pages.push(1, "...", guestPage, "...", guestTotalPages);
      }
    }
    return pages;
  };

  if (!isOpen || !concert) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 max-w-full pl-10 flex">
        <div className="w-screen max-w-2xl bg-surface border-l border-border flex flex-col shadow-2xl relative">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between select-none">
            <div>
              <h3 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Tác vụ danh sách khách mời
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Sự kiện: <span className="font-semibold">{concert.title}</span>{" "}
                • {concert.venue}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-high text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-6">
              {/* Guest List CSV Import */}
              <div className="bg-background rounded-xl p-5 border border-border space-y-4">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2 select-none">
                  <Upload className="w-4 h-4 text-primary" />
                  Nhập danh sách khách mời từ file CSV
                </h4>
                <p className="text-xs text-muted-foreground select-none">
                  Tải lên tệp CSV chứa các cột bắt buộc:{" "}
                  <code className="bg-surface px-1.5 py-0.5 rounded font-mono text-[10px]">
                    email
                  </code>
                  ,{" "}
                  <code className="bg-surface px-1.5 py-0.5 rounded font-mono text-[10px]">
                    full_name
                  </code>
                  , và{" "}
                  <code className="bg-surface px-1.5 py-0.5 rounded font-mono text-[10px]">
                    ticket_category
                  </code>
                  .
                </p>

                <form onSubmit={handleCsvSubmit} className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-xl cursor-pointer bg-surface hover:bg-surface-high/50 hover:border-primary/50 transition-all relative">
                      <div className="flex flex-col items-center justify-center pt-4 pb-4">
                        <Upload className="w-7 h-7 text-muted-foreground mb-1.5" />
                        <p className="text-xs text-muted-foreground text-center px-4">
                          {csvFile ? (
                            <span className="font-semibold text-foreground">
                              {csvFile.name}
                            </span>
                          ) : (
                            "Click để chọn file hoặc kéo thả tệp CSV vào đây"
                          )}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            setCsvFile(e.target.files[0]);
                        }}
                        disabled={isImporting}
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!csvFile || isImporting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-98 cursor-pointer"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang đăng tải danh sách...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Tải danh sách khách mời lên
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Import Job Progress */}
              {importJob && (
                <div className="p-4 rounded-xl border border-border bg-background space-y-3 select-none">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Mã tác vụ: {importJob.id.slice(0, 8)}...
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        importJob.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : importJob.status === "FAILED"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                      }`}
                    >
                      {importJob.status}
                    </span>
                  </div>

                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-500"
                      style={{ width: `${importJob.progress_percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Tiến trình: {importJob.progress_percentage}%</span>
                    {importJob.status === "COMPLETED" &&
                      importJob.result_data && (
                        <span className="text-emerald-500 font-semibold">
                          Đã thêm: {String(importJob.result_data.processed || 0)} khách mời
                        </span>
                      )}
                    {importJob.error_message && (
                      <span className="text-rose-500 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {importJob.error_message}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Guest Table Filters */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm khách mời theo tên hoặc email..."
                      value={guestSearch}
                      onChange={(e) => {
                        setGuestSearch(e.target.value);
                        setGuestPage(1);
                      }}
                      className="w-full pl-9 pr-4 py-2 border border-border bg-background rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={guestScanStatus}
                      onChange={(e) => {
                        setGuestScanStatus(e.target.value);
                        setGuestPage(1);
                      }}
                      className="px-3 py-2 border border-border bg-background rounded-lg text-xs font-semibold cursor-pointer focus:outline-none"
                    >
                      <option value="All">Tất cả trạng thái check-in</option>
                      <option value="SCANNED">Đã check-in</option>
                      <option value="NOT_SCANNED">Chưa check-in</option>
                    </select>
                  </div>
                </div>

                {/* Guests Table */}
                <div className="border border-border rounded-xl overflow-hidden bg-background">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-high/40 text-xs font-semibold text-muted-foreground uppercase select-none">
                          <th className="px-4 py-3">Khách mời</th>
                          <th className="px-4 py-3">Hạng vé</th>
                          <th className="px-4 py-3 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-xs">
                        {isGuestsLoading ? (
                          <tr>
                            <td colSpan={3} className="p-8 text-center select-none">
                              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                              Đang tải danh sách khách mời...
                            </td>
                          </tr>
                        ) : guests.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="p-8 text-center text-muted-foreground select-none"
                            >
                              Không tìm thấy khách mời nào.
                            </td>
                          </tr>
                        ) : (
                          guests.map((g) => (
                            <tr key={g.id} className="hover:bg-surface/30">
                              <td className="px-4 py-2.5">
                                <p className="font-bold text-foreground">
                                  {g.full_name}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 select-all">
                                  {g.email}
                                </p>
                              </td>
                              <td className="px-4 py-2.5 font-mono text-[10px] font-semibold text-on-surface-variant select-all">
                                {g.ticket_category}
                              </td>
                              <td className="px-4 py-2.5 text-center select-none">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                    g.is_scanned
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                                  }`}
                                >
                                  {g.is_scanned ? "Checked In" : "Pending"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {!isGuestsLoading && guests.length > 0 && (
                    <div className="px-4 py-3 bg-surface-high/10 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs select-none">
                      <div className="flex items-center justify-between sm:justify-start gap-4">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Tổng số: {totalGuests} khách mời
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-semibold">Hiển thị:</span>
                          <select
                            value={guestLimit}
                            onChange={(e) => {
                              setGuestLimit(Number(e.target.value));
                              setGuestPage(1);
                            }}
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
                          disabled={guestPage === 1}
                          onClick={() => setGuestPage((p) => Math.max(1, p - 1))}
                          className="p-1 rounded border border-border bg-background hover:bg-surface-high disabled:opacity-40 transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex gap-1">
                          {getPageNumbers().map((p, idx) => {
                            if (p === "...") {
                              return (
                                <span
                                  key={`ellipsis-${idx}`}
                                  className="px-2 py-1 text-[10px] text-muted-foreground font-bold self-center"
                                >
                                  ...
                                </span>
                              );
                            }
                            return (
                              <button
                                key={`page-${p}`}
                                onClick={() => setGuestPage(Number(p))}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                  guestPage === p
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-border hover:border-primary/50 text-foreground hover:text-primary bg-background"
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          disabled={guestPage === guestTotalPages}
                          onClick={() => setGuestPage((p) => Math.min(guestTotalPages, p + 1))}
                          className="p-1 rounded border border-border bg-background hover:bg-surface-high disabled:opacity-40 transition-all cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
