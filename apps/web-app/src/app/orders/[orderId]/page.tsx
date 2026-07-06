"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { SiteShell, Button } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import {
  getOrderById,
  cancelOrder,
  type OrderDetail,
} from "@/services/order.service";
import { formatConcertCurrency } from "@/services/concert.service";
import { ConfirmModal } from "@/components/screens";
import {
  Calendar,
  Ticket,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  Ban,
  RefreshCw,
  X,
  QrCode,
  Sparkles,
} from "lucide-react";
import QRCode from "qrcode";
import { useToast } from "@/context/ToastContext";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

function TicketQrCode({ hash, width = 150 }: { hash: string; width?: number }) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(hash, { width, margin: 1 })
      .then((url) => {
        if (active) setQrUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate ticket QR:", err);
      });
    return () => {
      active = false;
    };
  }, [hash, width]);

  if (!qrUrl) {
    return (
      <div className="flex h-32 w-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={qrUrl} alt="Mã QR soát vé" className="w-full h-full" />
  );
}

export default function OrderDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;

  const { user } = useAuth();
  const isAdmin = !!(
    user?.roles?.includes("Admin") ||
    (user && "role" in user && (user as { role?: string }).role === "Admin")
  );

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedQrHash, setSelectedQrHash] = useState<string | null>(null);
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const getTicketCount = (orderData: OrderDetail | null) => {
    if (!orderData) return 0;
    if (orderData.ticket_count > 0) return orderData.ticket_count;
    if (orderData.ticket_metadata) {
      const metadata = orderData.ticket_metadata as Record<string, unknown>;
      if (metadata.quantity) return Number(metadata.quantity);
      if (metadata.ticket_breakdown && Array.isArray(metadata.ticket_breakdown)) {
        return (metadata.ticket_breakdown as Array<Record<string, unknown>>).reduce(
          (sum: number, item: Record<string, unknown>) => sum + (Number(item.quantity) || 0),
          0
        );
      }
    }
    return 0;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await getOrderById(orderId, isAdmin);
      if (!data) {
        throw new Error("Không tìm thấy đơn hàng");
      }
      setOrder(data);
      showSuccessToast("Đã cập nhật trạng thái đơn hàng!");
    } catch (err) {
      console.error("Failed to refresh order details:", err);
      showErrorToast("Không thể tải thông tin đơn hàng lúc này.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function load() {
      setInitialLoading(true);
      try {
        const data = await getOrderById(orderId, isAdmin);
        if (!data) {
          throw new Error("Không tìm thấy đơn hàng");
        }
        if (active) {
          setOrder(data);
        }
      } catch (err) {
        console.error("Failed to load order details:", err);
        if (active) {
          setError(
            "Không thể tải thông tin chi tiết đơn đặt vé. Vui lòng thử lại sau.",
          );
        }
      } finally {
        if (active) {
          setInitialLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [orderId, isAdmin]);

  const handleCancelOrder = async () => {
    setCancelLoading(true);
    try {
      const updated = await cancelOrder(orderId);
      setOrder(updated);
      showSuccessToast("Hủy đơn hàng thành công!");
    } catch (err) {
      console.error("Error cancelling order:", err);
      showErrorToast("Hủy đơn hàng thất bại. Vui lòng thử lại.");
    } finally {
      setCancelLoading(false);
      setShowCancelConfirm(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (initialLoading) {
    return (
      <SiteShell active="/my-tickets">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 animate-pulse space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="h-8 w-48 bg-outline-variant/30 rounded-lg" />
            <div className="h-10 w-24 bg-outline-variant/30 rounded-xl" />
          </div>
          
          {/* Two Column */}
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-32 bg-outline-variant/30 rounded-3xl" />
              <div className="h-64 bg-outline-variant/30 rounded-3xl" />
            </div>
            <div className="h-48 bg-outline-variant/30 rounded-3xl" />
          </div>
        </div>
      </SiteShell>
    );
  }

  if (error || !order) {
    return (
      <SiteShell active="/my-tickets">
        <section className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/25">
            <AlertTriangle size={28} />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold text-on-surface">
            Không tìm thấy đơn hàng
          </h2>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant/80">
            {error ||
              "Chúng tôi không tìm thấy thông tin của đơn đặt vé được yêu cầu."}
          </p>
          <div className="mt-8">
            <Button href="/my-tickets" className="w-full">
              Quay lại thư viện vé
            </Button>
          </div>
        </section>
      </SiteShell>
    );
  }

  const isPaid = order.status === "PAID";
  const isPending = order.status === "PENDING";
  const isCancelled = order.status === "CANCELLED";

  return (
    <SiteShell active="/my-tickets">
      {/* Background loading overlay line during refreshing state */}
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-primary/20 overflow-hidden z-50">
          <div className="h-full bg-primary animate-pulse w-full" />
        </div>
      )}

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header Title */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-black text-on-surface sm:text-4xl">
              Chi tiết đơn đặt vé
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-on-surface-variant hover:bg-slate-800 hover:border-slate-700 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              title="Cập nhật trạng thái đơn hàng"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
            {isPending && (
              <>
                <Link
                  href={`/checkout/${order.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all duration-200 bg-primary hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98] whitespace-nowrap"
                >
                  Thanh toán ngay
                </Link>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={cancelLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] cursor-pointer border border-slate-800 bg-slate-900/40 text-on-surface-variant hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {cancelLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Ban size={14} />
                  )}
                  {cancelLoading ? "Đang hủy..." : "Hủy đơn hàng"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Two Column Details Layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Status Alert Banner */}
            {isPending && (
              <div className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-5 text-amber-300">
                <div className="flex gap-3">
                  <AlertTriangle className="shrink-0 text-amber-500" />
                  <div>
                    <h4 className="font-bold text-amber-300">
                      Chờ thanh toán
                    </h4>
                    <p className="mt-1 text-sm text-on-surface-variant/90 leading-relaxed">
                      Lượt giữ vé này đã được đăng ký, nhưng thanh toán chưa được xác nhận. Vui lòng hoàn tất thanh toán trước khi hết hạn giữ vé.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="rounded-3xl border border-slate-700 bg-slate-900/40 p-5 text-slate-300">
                <div className="flex gap-3">
                  <Ban className="shrink-0 text-slate-500" />
                  <div>
                    <h4 className="font-bold text-slate-300">
                      Đơn hàng đã hủy
                    </h4>
                    <p className="mt-1 text-sm text-on-surface-variant/90 leading-relaxed">
                      Đơn hàng này đã bị hủy và các vé giữ chỗ đã được giải phóng trở lại hệ thống để người khác đăng ký.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Event & Overview Card */}
            <div className="overflow-hidden rounded-3xl border border-slate-700 bg-[#16222f] p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold text-on-surface leading-snug">
                {order.concert_name}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
                <div className="flex items-center gap-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 p-3.5">
                  <Calendar size={18} className="text-primary" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/75 font-semibold">
                      Ngày đặt vé
                    </p>
                    <p className="font-semibold text-on-surface mt-0.5">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 p-3.5">
                  <Ticket size={18} className="text-primary" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/75 font-semibold">
                      Số lượng đặt
                    </p>
                    <p className="font-semibold text-on-surface mt-0.5">
                      {getTicketCount(order)} vé
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Passes & QR Section */}
            {order.tickets && order.tickets.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-display text-xl font-bold text-on-surface flex items-center gap-2">
                  <ShieldCheck size={20} className="text-primary" />
                  Vé vào cổng điện tử
                </h3>

                <div className="grid gap-6 sm:grid-cols-2">
                  {order.tickets.map((ticket, index) => {
                    const ticketNotchClass = isPaid ? "border-emerald-500/30" : "border-slate-800";
                    return (
                      <div
                        key={ticket.id}
                        className={`group relative overflow-hidden rounded-3xl border shadow-md flex flex-col justify-between transition-all duration-300 ${
                          isPaid
                            ? "border-emerald-500/20 bg-slate-900/90"
                            : "border-slate-800 bg-[#171b22]"
                        }`}
                      >
                        {/* Ticket stub content (top) */}
                        <div className="p-5 space-y-4 pb-4">
                          <div className="flex justify-between items-center gap-2 border-b border-slate-700 pb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">
                              VÉ VÀO CỬA #{index + 1}
                            </span>
                            {ticket.is_scanned ? (
                              <span className="inline-flex items-center rounded-full bg-slate-850 border border-slate-750 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                Đã sử dụng
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                Hợp lệ
                              </span>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div>
                              <p className="text-[10px] uppercase text-on-surface-variant/80 font-semibold">
                                Hạng vé
                              </p>
                              <p className="text-sm font-bold text-on-surface mt-0.5">
                                {ticket.category_name || "General Admission"}
                              </p>
                            </div>
                            {ticket.gate_number !== null && (
                              <div>
                                <p className="text-[10px] uppercase text-on-surface-variant/80 font-semibold">
                                  Cổng soát vé
                                </p>
                                <p className="text-sm font-bold text-on-surface mt-0.5">
                                  Cổng {ticket.gate_number}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Perforation Divider Line and Notches */}
                        <div className="relative w-full py-1">
                          {/* Skeuomorphic Die-cut Notches */}
                          <div className={`absolute top-1/2 -translate-y-1/2 -left-3.5 w-7 h-7 rounded-full bg-background border-r ${ticketNotchClass} z-10`} />
                          <div className={`absolute top-1/2 -translate-y-1/2 -right-3.5 w-7 h-7 rounded-full bg-background border-l ${ticketNotchClass} z-10`} />

                          {/* Perforation Divider Line */}
                          <div className={`border-t-2 border-dashed ${isPaid ? "border-emerald-500/20" : "border-slate-800"}`} />
                        </div>

                        {/* QR Code stub section (bottom) */}
                        <div className="p-5 pt-4 flex flex-col items-center justify-center space-y-3 z-0">
                          {isPaid ? (
                            <div
                              onClick={() =>
                                setSelectedQrHash(ticket.qr_code_hash)
                              }
                              className="relative aspect-square w-32 overflow-hidden rounded-xl border border-slate-650 bg-white p-1 shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
                              title="Bấm để phóng to mã QR"
                            >
                              <TicketQrCode hash={ticket.qr_code_hash} />
                            </div>
                          ) : (
                            <div className="flex aspect-square w-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-center">
                              <AlertTriangle
                                size={20}
                                className="text-on-surface-variant/50 mx-auto"
                              />
                              <p className="mt-1 text-[10px] font-bold text-on-surface-variant">
                                QR Đã Khóa
                              </p>
                              <p className="mt-0.5 text-[8px] text-on-surface-variant/60 leading-tight">
                                Yêu cầu đơn hàng hoàn tất thanh toán
                              </p>
                            </div>
                          )}
                          <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/70 font-bold flex items-center gap-1.5 mt-1">
                            <QrCode size={12} className="text-primary/70" />
                            Quét tại cổng vào
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column / Invoice Ledger */}
          <div className="space-y-6">
            {/* Invoice Summary Card */}
            <div className="rounded-3xl border border-slate-700 bg-[#16222f] p-6 shadow-sm space-y-5">
              <h3 className="font-display text-lg font-bold text-on-surface flex items-center gap-2 pb-3.5 border-b border-slate-700">
                <Receipt size={18} className="text-primary" />
                Hóa đơn thanh toán
              </h3>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant/80">Trạng thái đơn</span>
                  <span className={`font-bold uppercase tracking-wider text-xs ${
                    isPaid ? "text-emerald-400" : isPending ? "text-amber-400 animate-pulse" : "text-slate-400"
                  }`}>
                    {isPaid ? "Đã thanh toán" : isPending ? "Chờ thanh toán" : "Đã hủy"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant/80">Số lượng đặt</span>
                  <span className="font-semibold text-on-surface">{getTicketCount(order)}x</span>
                </div>

                {/* Detailed Ticket breakdown list */}
                {order.ticket_metadata && !!(order.ticket_metadata as Record<string, unknown>).ticket_breakdown && (
                  <div className="border-t border-slate-700 pt-3.5 space-y-2.5 text-xs text-on-surface-variant/80">
                    {((order.ticket_metadata as Record<string, unknown>).ticket_breakdown as Array<Record<string, unknown>>).map((item, idx) => {
                      const metadata = order.ticket_metadata as Record<string, unknown>;
                      const name = (item.category_name as string) || (metadata.category_name as string) || "General Admission";
                      const price = Number(item.unit_price) || Number(metadata.unit_price) || 0;
                      const qty = Number(item.quantity) || Number(metadata.quantity) || 1;
                      return (
                        <div key={idx} className="flex justify-between">
                          <span>{name} (x{qty})</span>
                          <span className="font-semibold text-on-surface">{formatConcertCurrency(price * qty)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-700 pt-4 text-base font-black">
                  <span className="text-on-surface">Tổng cộng</span>
                  <span className="text-primary">{formatConcertCurrency(Number(order.total_amount))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enlarged QR Modal */}
      {selectedQrHash && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in-quick"
          onClick={() => setSelectedQrHash(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl border border-slate-650 bg-slate-900 p-6 shadow-2xl flex flex-col items-center space-y-4 animate-fade-in-quick"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedQrHash(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-on-surface-variant hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Sparkles size={11} />
                Vé vào cổng điện tử
              </span>
              <p className="text-xs text-on-surface-variant/80 mt-2">
                Đưa mã QR này cho nhân viên tại lối vào cửa
              </p>
            </div>
            <div className="relative aspect-square w-64 overflow-hidden rounded-2xl border border-slate-700 bg-white p-2 shadow-inner">
              <TicketQrCode hash={selectedQrHash} width={300} />
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelOrder}
        title="Xác nhận hủy đơn hàng"
        message="Bạn có chắc chắn muốn hủy đơn hàng giữ vé này? Các chỗ ngồi đang giữ sẽ được giải phóng hoàn toàn và không thể thanh toán tiếp."
        confirmText="Xác nhận hủy"
        cancelText="Quay lại"
        isLoading={cancelLoading}
      />
    </SiteShell>
  );
}
