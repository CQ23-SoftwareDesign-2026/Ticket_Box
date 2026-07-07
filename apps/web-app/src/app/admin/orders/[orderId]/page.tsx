"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getOrderById, type OrderDetail } from "@/services/order.service";
import { formatConcertCurrency } from "@/services/concert.service";
import { resolveRefund } from "@/services/payment.service";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/utils/error.utils";
import {
  ChevronLeft,
  Calendar,
  FileText,
  User,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Ticket,
  Loader2,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react";
import QRCode from "qrcode";

const ORDER_STATUS_CLASSES: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const TX_STATUS_CLASSES: Record<string, string> = {
  SUCCESS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  FAILED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  REFUNDED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

interface TicketBreakdownItem {
  quantity?: number;
  unit_price?: number;
  category_id?: string;
  category_name?: string;
}

interface TicketMetadata {
  quantity?: number;
  unit_price?: number;
  category_id?: string;
  category_name?: string;
  ticket_breakdown?: TicketBreakdownItem[];
}

interface RefundInfoJson {
  refunded_by?: string;
  refunded_at?: string;
  refund_tx_id?: string;
  refund_note?: string;
}

interface RawResponseJson {
  warning?: string;
  refund_info?: RefundInfoJson;
}

interface PageProps {
  params: Promise<{ orderId: string }>;
}

function TicketQrCode({ hash, width = 96 }: { hash: string; width?: number }) {
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
      <div className="flex h-16 w-16 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={qrUrl}
      alt="Mã QR soát vé"
      className="w-full h-full object-contain"
    />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-md hover:bg-surface-highest text-muted-foreground hover:text-foreground transition-all active:scale-90 cursor-pointer shrink-0"
      title="Sao chép"
    >
      {copied ? (
        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 select-none">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
          Đã chép
        </span>
      ) : (
        <svg
          className="w-3.5 h-3.5 shrink-0 select-none"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
          />
        </svg>
      )}
    </button>
  );
}

export default function AdminOrderDetailPage({ params }: PageProps) {
  const { orderId } = use(params);
  const { success: toastSuccess, error: toastError } = useToast();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openJsonTx, setOpenJsonTx] = useState<Record<string, boolean>>({});

  // Refund resolution states
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundTxId, setRefundTxId] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      try {
        setIsLoading(true);
        const data = await getOrderById(orderId, true);
        if (data) {
          setOrder(data);
        } else {
          setError("Không tìm thấy đơn hàng.");
        }
      } catch (err) {
        console.error(err);
        setError("Lỗi tải thông tin chi tiết đơn hàng.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadOrder();
  }, [orderId]);

  const toggleJson = (txId: string) => {
    setOpenJsonTx((prev) => ({ ...prev, [txId]: !prev[txId] }));
  };

  const handleResolveRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expiredPaidTx) return;

    setIsSubmittingRefund(true);
    try {
      await resolveRefund(expiredPaidTx.id, {
        refund_tx_id: refundTxId.trim() || undefined,
        refund_note: refundNote.trim() || undefined,
      });
      toastSuccess("Ghi nhận thông tin hoàn tiền thành công!");
      setIsRefundModalOpen(false);
      setRefundTxId("");
      setRefundNote("");

      // Reload order details
      const updatedOrder = await getOrderById(orderId, true);
      if (updatedOrder) {
        setOrder(updatedOrder);
      }
    } catch (err: unknown) {
      toastError(getErrorMessage(err));
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="font-body text-sm text-muted-foreground">
            Đang tải chi tiết đơn hàng...
          </span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="font-body text-sm text-rose-400 font-semibold">
          {error || "Đã xảy ra lỗi"}
        </p>
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-high border border-border rounded-xl text-xs font-semibold text-foreground transition-all"
        >
          <ChevronLeft size={16} /> Quay lại trang tổng quan
        </Link>
      </div>
    );
  }

  // Detect payment transactions paid after expiration/cancellation
  const expiredPaidTx = order.payment_transactions.find((tx) => {
    const raw = tx.raw_response as unknown as RawResponseJson | null;
    return raw && raw.warning === "Paid after order expiration/cancellation";
  });

  const isRefunded = expiredPaidTx?.status === "REFUNDED";
  const refundInfo = (
    expiredPaidTx?.raw_response as unknown as RawResponseJson | null
  )?.refund_info;

  // Check if user has active name or email info
  const hasCustomerInfo = !!(order.user_name || order.user_email);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-body text-xs">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1 min-w-0">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mb-2 select-none"
          >
            <ChevronLeft size={14} /> Quay lại trang tổng quan
          </Link>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="font-display text-2xl font-black text-foreground break-all">
              Đơn hàng #{order.id.toUpperCase()}
            </h1>
            <CopyButton text={order.id} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Thời gian đặt:</span>
            <span className="font-semibold text-foreground">
              {new Date(order.created_at).toLocaleString("vi-VN")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 select-none">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full font-body text-xs font-bold border ${ORDER_STATUS_CLASSES[order.status] ?? "bg-surface-highest text-foreground border-border"}`}
          >
            {order.status === "PAID"
              ? "ĐÃ THANH TOÁN"
              : order.status === "PENDING"
                ? "CHỜ THANH TOÁN"
                : "ĐÃ HỦY"}
          </span>
        </div>
      </div>

      {/* Warning banner for late payment (Paid after expiration/cancellation) */}
      {expiredPaidTx && (
        <div
          className={`rounded-2xl border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm transition-all duration-300 ${
            isRefunded
              ? "bg-purple-950/15 border-purple-500/20 text-purple-300"
              : "bg-rose-950/15 border-rose-500/20 text-rose-300 animate-pulse"
          }`}
        >
          <div className="flex items-start gap-3">
            {isRefunded ? (
              <CheckCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5 md:mt-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 md:mt-0" />
            )}
            <div className="space-y-1">
              <h4 className="font-bold text-sm">
                {isRefunded
                  ? "Giao dịch thanh toán quá hạn - ĐÃ HOÀN TIỀN"
                  : "CẢNH BÁO: Phát hiện giao dịch thanh toán sau khi đơn hàng hết hạn/hủy"}
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {isRefunded
                  ? "Đã ghi nhận giao dịch lỗi thanh toán quá hạn này được hoàn tiền hoàn tất."
                  : "Khách hàng đã chuyển tiền thành công nhưng đơn hàng đã bị hủy do quá thời gian chờ (10 phút). Vui lòng hoàn lại tiền."}
              </p>
              {isRefunded && refundInfo && (
                <div className="mt-2 p-3 bg-surface border border-border/80 rounded-xl space-y-1 text-[10px] text-muted-foreground font-mono">
                  <p>
                    <strong className="text-foreground">
                      Người thực hiện:
                    </strong>{" "}
                    {refundInfo.refunded_by}
                  </p>
                  {refundInfo.refunded_at && (
                    <p>
                      <strong className="text-foreground">Thời gian:</strong>{" "}
                      {new Date(refundInfo.refunded_at).toLocaleString("vi-VN")}
                    </p>
                  )}
                  {refundInfo.refund_tx_id && (
                    <p>
                      <strong className="text-foreground">
                        Mã GD hoàn tiền:
                      </strong>{" "}
                      {refundInfo.refund_tx_id}
                    </p>
                  )}
                  {refundInfo.refund_note && (
                    <p>
                      <strong className="text-foreground">Ghi chú:</strong>{" "}
                      {refundInfo.refund_note}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          {!isRefunded && (
            <button
              onClick={() => setIsRefundModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl transition-all cursor-pointer active:scale-95 duration-200 shrink-0 hover:shadow-lg hover:shadow-rose-600/20"
            >
              Đánh dấu đã hoàn tiền
            </button>
          )}
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3 if customer info exists, otherwise full width 3/3) */}
        <div
          className={
            hasCustomerInfo
              ? "lg:col-span-2 space-y-6"
              : "lg:col-span-3 space-y-6"
          }
        >
          {/* Concert Info */}
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4 shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-display text-base font-bold text-foreground select-none">
                Thông tin Sự kiện & Hóa đơn
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block select-none">
                  Tên Sự kiện
                </span>
                <span className="font-body text-sm font-bold text-foreground">
                  {order.concert_name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block select-none">
                    Hạn thanh toán
                  </span>
                  <span className="font-body text-xs text-foreground font-semibold">
                    {new Date(order.expires_at).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block select-none">
                    Tổng số lượng vé
                  </span>
                  <span className="font-body text-xs text-foreground font-bold">
                    {order.ticket_count} vé
                  </span>
                </div>
              </div>
              <div className="pt-2 flex justify-between items-center bg-background border border-border/80 rounded-xl px-4 py-3">
                <span className="text-xs text-muted-foreground font-semibold select-none">
                  Tổng tiền hóa đơn đơn hàng
                </span>
                <span className="font-black text-primary text-base">
                  {formatConcertCurrency(Number(order.total_amount))}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket categories breakdown */}
          {order.ticket_metadata &&
            (() => {
              const metadata =
                order.ticket_metadata as unknown as TicketMetadata;
              return (
                <div className="bg-surface border border-border rounded-xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 pb-3 border-b border-border">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-display text-base font-bold text-foreground select-none">
                      Chi tiết Hạng vé Đặt
                    </h3>
                  </div>
                  <div className="space-y-4 font-body">
                    {/* Check if ticket_breakdown is an array */}
                    {Array.isArray(metadata.ticket_breakdown) ? (
                      <div className="space-y-3">
                        {metadata.ticket_breakdown.map(
                          (item: TicketBreakdownItem, idx: number) => (
                            <div
                              key={idx}
                              className="p-4 bg-background border border-border rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-foreground text-sm">
                                  {item.category_name || "Hạng vé mặc định"}
                                </p>
                                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                                  <span>Mã phân hạng:</span>
                                  <span className="font-mono font-bold break-all">
                                    {item.category_id}
                                  </span>
                                  {item.category_id && (
                                    <CopyButton text={item.category_id} />
                                  )}
                                </div>
                              </div>
                              <div className="text-left sm:text-right shrink-0">
                                <p className="text-muted-foreground">
                                  {item.quantity} vé ×{" "}
                                  {formatConcertCurrency(
                                    Number(item.unit_price || 0),
                                  )}
                                </p>
                                <p className="font-black text-primary text-sm mt-0.5">
                                  {formatConcertCurrency(
                                    Number(item.quantity || 0) *
                                      Number(item.unit_price || 0),
                                  )}
                                </p>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      // Fallback for single object metadata
                      <div className="p-4 bg-background border border-border rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-sm">
                            {String(
                              metadata.category_name || "Hạng vé mặc định",
                            )}
                          </p>
                          {metadata.category_id && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                              <span>Mã phân hạng:</span>
                              <span className="font-mono font-bold break-all">
                                {String(metadata.category_id)}
                              </span>
                              <CopyButton text={String(metadata.category_id)} />
                            </div>
                          )}
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <p className="text-muted-foreground">
                            {Number(metadata.quantity || 0)} vé ×{" "}
                            {formatConcertCurrency(
                              Number(metadata.unit_price || 0),
                            )}
                          </p>
                          <p className="font-black text-primary text-sm mt-0.5">
                            {formatConcertCurrency(Number(order.total_amount))}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Collapsible raw json for tech review */}
                    <div className="pt-2">
                      <button
                        onClick={() =>
                          setOpenJsonTx((prev) => ({
                            ...prev,
                            metadata: !prev.metadata,
                          }))
                        }
                        className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline cursor-pointer select-none"
                      >
                        {openJsonTx.metadata ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                        {openJsonTx.metadata
                          ? "Ẩn cấu trúc JSON thô"
                          : "Xem cấu trúc JSON thô của vé"}
                      </button>
                      {openJsonTx.metadata && (
                        <div className="mt-2 bg-background border border-border rounded-xl p-3 max-h-48 overflow-y-auto">
                          <pre className="font-mono text-[9px] text-indigo-400 whitespace-pre-wrap">
                            {JSON.stringify(metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Detailed tickets code list */}
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-border select-none">
              <Ticket className="w-5 h-5 text-indigo-400" />
              <h3 className="font-display text-base font-bold text-foreground">
                Danh sách Mã vé ({order.tickets.length})
              </h3>
            </div>
            {order.tickets.length === 0 ? (
              <p className="text-xs text-muted-foreground font-body select-none">
                Không có thông tin vé lẻ.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 bg-background border border-border rounded-xl flex gap-4 relative overflow-hidden"
                  >
                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-muted-foreground block select-none">
                            Vé ID (Đầy đủ)
                          </span>
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="font-mono text-[11px] font-bold text-foreground truncate">
                              #{t.id.toUpperCase()}
                            </span>
                            <CopyButton text={t.id} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-[9px] font-bold text-muted-foreground block select-none">
                            Hạng Vé
                          </span>
                          <span className="font-semibold text-foreground truncate block">
                            {t.category_name || "Mặc định"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-muted-foreground block select-none">
                            Cửa soát vé
                          </span>
                          <span className="font-semibold text-foreground">
                            Cửa {t.gate_number ?? "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="pt-1.5 border-t border-border/50 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-muted-foreground select-none">
                            Trạng thái soát:
                          </span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-body text-[9px] font-semibold border select-none ${
                              t.is_scanned
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                            }`}
                          >
                            {t.is_scanned ? "Đã Soát vé" : "Chưa Soát vé"}
                          </span>
                        </div>
                        {t.is_scanned && t.scanned_at && (
                          <span className="text-[9px] text-muted-foreground">
                            Lúc:{" "}
                            {new Date(t.scanned_at).toLocaleString("vi-VN")}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <span className="text-[9px] font-bold text-muted-foreground block select-none">
                          Mã hash QR Code
                        </span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className="font-mono text-[9px] text-muted-foreground truncate"
                            title={t.qr_code_hash}
                          >
                            {t.qr_code_hash}
                          </span>
                          <CopyButton text={t.qr_code_hash} />
                        </div>
                      </div>
                    </div>

                    {/* QR Code display on the right */}
                    <div className="w-24 h-24 bg-white p-1.5 rounded-lg flex items-center justify-center shrink-0 border border-border/50 self-center select-none shadow-sm">
                      <TicketQrCode hash={t.qr_code_hash} width={96} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Transactions Log */}
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-border select-none">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <h3 className="font-display text-base font-bold text-foreground">
                Giao dịch & Thanh toán qua Cổng
              </h3>
            </div>
            {order.payment_transactions.length === 0 ? (
              <p className="text-xs text-muted-foreground font-body text-center py-4 select-none">
                Không ghi nhận lịch sử giao dịch.
              </p>
            ) : (
              <div className="space-y-4">
                {order.payment_transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 bg-background border border-border rounded-xl flex flex-col gap-3"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 pb-2 border-b border-border/40">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block select-none">
                          Mã giao dịch nội bộ
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs font-bold text-foreground break-all">
                            {tx.id}
                          </span>
                          <CopyButton text={tx.id} />
                        </div>
                      </div>
                      <span
                        className={`self-start sm:self-center inline-flex items-center px-2 py-0.5 rounded-full font-body text-[10px] font-bold border select-none ${TX_STATUS_CLASSES[tx.status ?? ""] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}
                      >
                        {tx.status === "SUCCESS"
                          ? "THÀNH CÔNG"
                          : tx.status === "PENDING"
                            ? "CHỜ THANH TOÁN"
                            : tx.status === "REFUNDED"
                              ? "ĐÃ HOÀN TIỀN"
                              : "THẤT BẠI"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-body">
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold select-none">
                          Phương thức thanh toán
                        </span>
                        <span className="font-semibold text-foreground uppercase">
                          {tx.payment_method}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold select-none">
                          Số tiền giao dịch
                        </span>
                        <span className="font-bold text-emerald-400">
                          {formatConcertCurrency(Number(tx.amount))}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold select-none">
                          Mã tham chiếu đối tác (3rd Party ID)
                        </span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-mono text-xs text-foreground font-semibold break-all">
                            {tx.transaction_id_3rd_party || "Chưa ghi nhận"}
                          </span>
                          {tx.transaction_id_3rd_party && (
                            <CopyButton text={tx.transaction_id_3rd_party} />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] pt-1">
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold select-none">
                          Thời gian tạo giao dịch
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold select-none">
                          Cập nhật cuối
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(tx.updated_at).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    {tx.idempotency_key && (
                      <div className="text-[10px]">
                        <span className="text-[9px] text-muted-foreground block font-bold select-none">
                          Idempotency Key
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-muted-foreground break-all">
                            {tx.idempotency_key}
                          </span>
                          <CopyButton text={tx.idempotency_key} />
                        </div>
                      </div>
                    )}

                    {/* Detailed raw JSON response view for admins */}
                    {tx.raw_response && (
                      <div className="pt-2">
                        <button
                          onClick={() => toggleJson(tx.id)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline cursor-pointer select-none"
                        >
                          {openJsonTx[tx.id] ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                          {openJsonTx[tx.id]
                            ? "Ẩn phản hồi RAW từ Cổng thanh toán"
                            : "Xem phản hồi RAW từ Cổng thanh toán (PayOS / 3rd Party)"}
                        </button>
                        {openJsonTx[tx.id] && (
                          <div className="mt-2 bg-surface border border-border/80 rounded-xl p-3 max-h-60 overflow-y-auto">
                            <pre className="font-mono text-[9px] text-emerald-400 whitespace-pre-wrap">
                              {JSON.stringify(tx.raw_response, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column (1/3) - Customer details */}
        {hasCustomerInfo && (
          <div className="space-y-6">
            {/* Customer Details Card */}
            <div className="bg-surface border border-border rounded-xl p-6 space-y-4 shadow-sm animate-fade-in-quick">
              <div className="flex items-center gap-2 pb-3 border-b border-border select-none">
                <User className="w-5 h-5 text-emerald-400" />
                <h3 className="font-display text-base font-bold text-foreground">
                  Thông tin Khách hàng
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-primary-foreground flex items-center justify-center font-bold text-base shrink-0 select-none">
                  {order.user_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-body text-sm font-bold text-foreground truncate">
                    {order.user_name}
                  </h4>
                  {order.user_email && (
                    <p className="text-muted-foreground text-xs truncate">
                      {order.user_email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* REFUND RESOLUTION MODAL */}
      {isRefundModalOpen && expiredPaidTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl p-6 space-y-4 relative z-10 font-body text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="font-display text-base font-bold text-foreground">
                Ghi nhận thông tin hoàn tiền
              </h3>
              <button
                onClick={() => {
                  setIsRefundModalOpen(false);
                  setRefundTxId("");
                  setRefundNote("");
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-surface-high p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleResolveRefund} className="space-y-4">
              <div className="p-3 bg-surface-low rounded-xl border border-border space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  Thông tin giao dịch lỗi:
                </p>
                <p className="font-semibold text-foreground">
                  Số tiền: {formatConcertCurrency(Number(expiredPaidTx.amount))}
                </p>
                <p className="text-muted-foreground">
                  Mã GD đối tác:{" "}
                  {expiredPaidTx.transaction_id_3rd_party || "N/A"}
                </p>
              </div>

              <label className="space-y-1.5 block">
                <span className="font-bold text-muted-foreground uppercase tracking-wider block">
                  Mã giao dịch hoàn tiền (Tùy chọn)
                </span>
                <input
                  type="text"
                  value={refundTxId}
                  onChange={(e) => setRefundTxId(e.target.value)}
                  placeholder="Nhập mã giao dịch của ngân hàng (Ví dụ: FT123456)..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary h-11 transition-all"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="font-bold text-muted-foreground uppercase tracking-wider block">
                  Ghi chú hoàn tiền (Tùy chọn)
                </span>
                <textarea
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="Nhập thông tin tài khoản đã nhận hoàn tiền hoặc lý do..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary transition-all resize-none"
                />
              </label>

              <div className="flex gap-3 justify-end pt-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsRefundModalOpen(false);
                    setRefundTxId("");
                    setRefundNote("");
                  }}
                  className="bg-background hover:bg-surface-low border border-border text-foreground font-semibold py-2.5 px-4 rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRefund}
                  className="bg-primary hover:bg-primary-container text-white font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-1.5 hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingRefund && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
