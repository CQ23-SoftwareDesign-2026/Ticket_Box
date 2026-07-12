"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell, Button } from "@/components/common";
import {
  getOrders,
  cancelOrder,
  getOrderById,
  type OrderListItem,
  type PaginationMeta,
} from "@/services/order.service";
import { formatConcertCurrency } from "@/services/concert.service";
import {
  Calendar,
  Ticket,
  ArrowRight,
  Landmark,
  Search,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Ban,
  X,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { ConfirmModal } from "@/components/screens";
import "@/styles/status-filter.css";

const TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ thanh toán" },
  { key: "PAID", label: "Đã thanh toán" },
  { key: "CANCELLED", label: "Đã hủy" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function FakeBarcode() {
  return (
    <div className="flex items-center justify-center gap-[2px] h-8 w-full opacity-35 group-hover:opacity-55 transition-opacity">
      {[
        1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1,
      ].map((width, idx) => (
        <div
          key={idx}
          className="bg-on-surface h-full"
          style={{ width: `${width}px` }}
        />
      ))}
    </div>
  );
}

export default function MyTicketsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      setError(null);
      try {
        const statusParam = activeTab === "ALL" ? undefined : activeTab;
        const response = await getOrders(currentPage, 30, statusParam);
        if (active) {
          setOrders(response.data);
          setMeta(response.meta);
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
        if (active) {
          setError("Không thể tải danh sách vé. Vui lòng thử lại sau.");
        }
      } finally {
        if (active) {
          setLoading(false);
          setIsFirstLoad(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [currentPage, activeTab]);

  const [pendingTicketCounts, setPendingTicketCounts] = useState<
    Record<string, number>
  >({});
  const fetchedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    orders.forEach((order) => {
      if (order.status === "PENDING" && !fetchedIds.current.has(order.id)) {
        fetchedIds.current.add(order.id);
        getOrderById(order.id)
          .then((details) => {
            if (details) {
              let count = 0;
              if (details.ticket_count > 0) {
                count = details.ticket_count;
              } else if (details.ticket_metadata) {
                const metadata = details.ticket_metadata as Record<
                  string,
                  unknown
                >;
                if (metadata.quantity) {
                  count = Number(metadata.quantity);
                } else if (
                  metadata.ticket_breakdown &&
                  Array.isArray(metadata.ticket_breakdown)
                ) {
                  count = (
                    metadata.ticket_breakdown as Array<Record<string, unknown>>
                  ).reduce(
                    (sum: number, item: Record<string, unknown>) =>
                      sum + (Number(item.quantity) || 0),
                    0,
                  );
                }
              }
              setPendingTicketCounts((prev) => ({
                ...prev,
                [order.id]: count,
              }));
            }
          })
          .catch((err) => {
            console.error("Failed to fetch order details for count:", err);
          });
      }
    });
  }, [orders]);

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    setCurrentPage(1);
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancelLoadingId(orderId);
    try {
      await cancelOrder(orderId);
      showSuccessToast("Hủy lượt giữ chỗ thành công!");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "CANCELLED" } : o)),
      );
    } catch (err) {
      console.error("Failed to cancel order:", err);
      showErrorToast("Hủy giữ chỗ thất bại. Vui lòng thử lại.");
    } finally {
      setCancelLoadingId(null);
      setCancelConfirmId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      order.concert_name.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query)
    );
  });

  const renderStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-250 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
            <CheckCircle2 size={12} />
            Đã thanh toán
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-250 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400">
            <AlertCircle size={12} className="animate-pulse" />
            Chờ thanh toán
          </span>
        );
      case "CANCELLED":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-400">
            <Ban size={12} />
            Đã hủy
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <SiteShell active="/my-tickets">
      {/* Premium Hero Panel */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-indigo-900/60 p-6 text-white shadow-xl sm:p-8 backdrop-blur-md">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl animate-pulse" />
          <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl animate-pulse" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles size={12} />
                Thư viện vé
              </span>
              <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
                Vé Của Tôi
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-on-surface-variant/85">
                Quản lý các vé concert đã xác nhận, các lượt giữ chỗ thanh toán
                và lịch sử giao dịch của bạn ở một nơi tập trung.
              </p>
            </div>

            <Button
              href="/concerts"
              variant="secondary"
              className="shrink-0 font-bold self-start md:self-auto shadow-md border-0 bg-primary hover:bg-primary-container text-white"
            >
              Khám phá sự kiện mới
            </Button>
          </div>
        </div>
      </section>

      {/* Main Filter and History Grid */}
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search & Interactive Tabs Row */}
        <div className="flex flex-col gap-4 border-b border-outline-variant/40 pb-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Interactive Pills */}
          <div className="flex bg-slate-900 border border-slate-600 rounded-2xl p-1 w-full lg:w-auto overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`whitespace-nowrap px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]"
                    : "text-on-surface-variant/90 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full lg:max-w-xs">
            <input
              type="text"
              placeholder="Tìm kiếm theo sự kiện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-600 bg-slate-900 px-5 py-2.5 pl-10 text-xs text-white outline-none transition focus:border-primary focus:bg-slate-800/80 focus:ring-2 focus:ring-primary/20 placeholder-on-surface-variant/70"
            />
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant/50 hover:text-on-surface cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl border border-rose-200/20 bg-rose-500/5 p-6 text-center text-rose-400">
            <p className="font-semibold text-sm">{error}</p>
            <button
              onClick={() => setCurrentPage((c) => c)}
              type="button"
              className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-5 py-2 text-xs font-bold hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              Thử tải lại
            </button>
          </div>
        )}

        {loading && isFirstLoad ? (
          <div className="mt-8 space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="relative flex flex-col md:flex-row h-52 md:h-36 w-full animate-pulse rounded-3xl border border-outline-variant/30 bg-surface-low/30 overflow-hidden"
              >
                <div className="flex-1 p-5 space-y-3">
                  <div className="h-4 w-1/4 rounded-full bg-outline-variant/30" />
                  <div className="h-6 w-1/2 rounded-full bg-outline-variant/30" />
                  <div className="h-3 w-1/3 rounded-full bg-outline-variant/20" />
                </div>
                <div className="hidden md:block absolute top-0 bottom-0 left-3/4 border-l border-dashed border-outline-variant/30" />
                <div className="w-full md:w-60 p-5 flex items-center justify-end bg-surface-low/50">
                  <div className="h-10 w-28 rounded-xl bg-outline-variant/30" />
                </div>
              </div>
            ))}
          </div>
        ) : !error && filteredOrders.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-outline-variant/40 py-20 text-center bg-surface/5">
            <Landmark className="mx-auto h-12 w-12 text-on-surface-variant/20" />
            <h3 className="mt-4 text-base font-bold text-on-surface">
              Không tìm thấy vé nào phù hợp
            </h3>
            <p className="mt-2 text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
              {searchQuery
                ? "Chúng tôi không tìm thấy đơn hàng nào khớp với từ khóa tìm kiếm của bạn. Vui lòng kiểm tra chính tả."
                : "Bạn chưa có đơn đặt vé nào trong phân mục này. Hãy đặt giữ chỗ sự kiện ngay."}
            </p>
            <Button
              href="/concerts"
              className="mt-6 border-0 bg-primary hover:bg-primary-container text-white px-6 py-2.5 text-xs font-bold"
            >
              Khám phá Sự kiện
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Smooth Top Progress Bar during async loads (stops page shifting) */}
            {loading && (
              <div className="absolute -top-4 left-0 right-0 h-1 overflow-hidden rounded-full bg-primary/10 z-20">
                <div className="h-full bg-primary animate-pulse w-full" />
              </div>
            )}

            {/* Content Feed with overlay loading indicators */}
            <div
              className={`mt-8 space-y-6 transition-all duration-300 ${
                loading
                  ? "opacity-60 blur-[0.5px] pointer-events-none"
                  : "opacity-100 blur-0"
              }`}
            >
              {filteredOrders.map((order) => {
                const isPaid = order.status === "PAID";
                const isPending = order.status === "PENDING";
                const isCancelled = order.status === "CANCELLED";
                const notchBorderClass = isPaid
                  ? "border-emerald-500/40 group-hover:border-emerald-400"
                  : isPending
                    ? "border-amber-500/40 group-hover:border-amber-400"
                    : "border-slate-700 group-hover:border-slate-500";

                return (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className={`group relative flex flex-col md:flex-row w-full rounded-3xl border shadow-lg overflow-hidden transition-all duration-350 hover:-translate-y-[2px] cursor-pointer ${
                      isPaid
                        ? "border-emerald-500/30 bg-[#16222f] hover:border-emerald-400/80 hover:shadow-lg hover:shadow-emerald-950/20"
                        : isPending
                          ? "border-amber-500/35 bg-[#201d1c] hover:border-amber-400/80 hover:shadow-lg hover:shadow-amber-950/20"
                          : "border-slate-700 bg-[#171b22] hover:border-slate-500 hover:shadow-lg hover:shadow-slate-950/10"
                    }`}
                  >
                    {/* Skeuomorphic Perforation Notches */}
                    {/* Desktop top/bottom notches */}
                    {/* Skeuomorphic Perforation Notches */}
                    {/* Desktop top/bottom notches */}
                    <div
                      className={`absolute -top-3.5 md:right-[266px] w-7 h-7 rounded-full bg-background border-b ${notchBorderClass} hidden md:block z-10 transition-colors duration-300`}
                    />
                    <div
                      className={`absolute -bottom-3.5 md:right-[266px] w-7 h-7 rounded-full bg-background border-t ${notchBorderClass} hidden md:block z-10 transition-colors duration-300`}
                    />
                    {/* Mobile left/right notches */}
                    <div
                      className={`absolute -left-3.5 top-2/3 w-7 h-7 rounded-full bg-background border-r ${notchBorderClass} md:hidden z-10 transition-colors duration-300`}
                    />
                    <div
                      className={`absolute -right-3.5 top-2/3 w-7 h-7 rounded-full bg-background border-l ${notchBorderClass} md:hidden z-10 transition-colors duration-300`}
                    />

                    {/* Perforation Line */}
                    {/* Desktop vertical dashed line */}
                    <div
                      className={`absolute top-0 bottom-0 md:right-[280px] border-l-2 border-dashed ${isPaid ? "border-emerald-500/30 group-hover:border-emerald-400/50" : isPending ? "border-amber-500/35 group-hover:border-amber-400/50" : "border-slate-700/50 group-hover:border-slate-500/50"} hidden md:block transition-colors duration-300`}
                    />
                    {/* Mobile horizontal dashed line */}
                    <div
                      className={`absolute left-0 right-0 top-2/3 border-t-2 border-dashed ${isPaid ? "border-emerald-500/30 group-hover:border-emerald-400/50" : isPending ? "border-amber-500/35 group-hover:border-amber-400/50" : "border-slate-700/50 group-hover:border-slate-500/50"} md:hidden transition-colors duration-300`}
                    />

                    {/* LEFT COLUMN: Main Ticket Stub Info */}
                    <div className="flex-1 p-5 md:p-6 space-y-4 md:pr-12">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {renderStatusBadge(order.status)}
                        </div>
                        <h3 className="font-display text-lg sm:text-xl font-bold text-on-surface group-hover:text-primary transition-colors mt-2 leading-tight">
                          {order.concert_name}
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-outline-variant/15 text-xs text-on-surface-variant/80">
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-primary/70" />
                          <span>Đặt ngày: {formatDate(order.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Ticket size={13} className="text-primary/70" />
                          <span>
                            Số lượng:{" "}
                            <span className="font-bold text-on-surface">
                              {order.status === "PENDING"
                                ? (pendingTicketCounts[order.id] ?? 0)
                                : order.ticket_count}
                            </span>{" "}
                            vé
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Settlement stub, barcode, and Actions */}
                    <div
                      className={`w-full md:w-[280px] p-5 md:p-6 flex flex-row md:flex-col justify-between items-center md:pl-8 md:pr-8 z-0 ${
                        isPaid
                          ? "bg-emerald-500/[0.04]"
                          : isPending
                            ? "bg-amber-500/[0.04]"
                            : "bg-slate-950/20"
                      }`}
                    >
                      {/* Price information */}
                      <div className="text-left md:text-center md:w-full space-y-0.5">
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-semibold">
                          Tổng cộng
                        </p>
                        <p className="text-base md:text-lg font-black text-on-surface leading-none">
                          {formatConcertCurrency(Number(order.total_amount))}
                        </p>
                      </div>

                      {/* Barcode / Actions wrapper */}
                      <div className="flex flex-col items-end md:items-center gap-3 w-auto md:w-full md:mt-4">
                        {isPaid && (
                          <>
                            <FakeBarcode />
                            <Link
                              href={`/orders/${order.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all duration-200 bg-primary hover:bg-primary/95 active:scale-[0.98] whitespace-nowrap cursor-pointer shadow-md"
                            >
                              Xem vé chi tiết
                            </Link>
                          </>
                        )}

                        {isPending && (
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/checkout/${order.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all duration-200 bg-primary hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 active:scale-[0.98] whitespace-nowrap cursor-pointer"
                            >
                              Thanh toán ngay
                            </Link>
                            <button
                              type="button"
                              disabled={cancelLoadingId !== null}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCancelConfirmId(order.id);
                              }}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] cursor-pointer border border-slate-800 bg-slate-900/40 text-on-surface-variant hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              {cancelLoadingId === order.id ? (
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Ban size={12} />
                              )}
                              {cancelLoadingId === order.id
                                ? "Đang hủy..."
                                : "Hủy vé"}
                            </button>
                          </div>
                        )}

                        {isCancelled && (
                          <Link
                            href={`/orders/${order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors bg-surface-low border border-outline-variant/40 hover:border-primary/35 px-4 py-2 rounded-xl cursor-pointer"
                          >
                            Chi tiết
                            <ArrowRight size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {!error && meta && meta.totalPages > 1 && (
          <div className="mt-10 flex items-center justify-between gap-4 border-t border-outline-variant/60 pt-6">
            <span className="text-xs text-on-surface-variant/80">
              Trang {meta.currentPage} / {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={meta.currentPage <= 1 || loading}
                onClick={() => setCurrentPage((c) => c - 1)}
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-xl border border-outline-variant px-4 text-xs font-semibold text-on-surface-variant hover:bg-surface-low disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Trước
              </button>
              <button
                disabled={meta.currentPage >= meta.totalPages || loading}
                onClick={() => setCurrentPage((c) => c + 1)}
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-xl border border-outline-variant px-4 text-xs font-semibold text-on-surface-variant hover:bg-surface-low disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
        <ConfirmModal
          isOpen={cancelConfirmId !== null}
          onClose={() => setCancelConfirmId(null)}
          onConfirm={() =>
            cancelConfirmId && handleCancelOrder(cancelConfirmId)
          }
          title="Xác nhận hủy đặt vé"
          message="Bạn có chắc chắn muốn hủy lượt giữ chỗ này? Các vé đã chọn của bạn sẽ được giải phóng hoàn toàn và không thể thanh toán tiếp."
          confirmText="Xác nhận hủy"
          cancelText="Quay lại"
          isLoading={cancelLoadingId !== null}
        />
      </section>
    </SiteShell>
  );
}
