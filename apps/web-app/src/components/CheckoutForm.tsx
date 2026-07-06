"use client";

import { useState, useCallback, useEffect } from "react";
import { PaymentMethodPicker, OrderSummaryCard, ConfirmModal } from "@/components/screens";
import { Loader2, Ban } from "lucide-react";
import { processPayment } from "@/services/payment.service";
import { getCheckoutReservationState } from "@/utils/checkout-state.utils";
import { getOrderById, cancelOrder } from "@/services/order.service";
import { useToast } from "@/context/ToastContext";

import QRCode from "qrcode";

interface CheckoutFormProps {
  orderId: string;
}

type LoadingSource = "pay-left" | "pay-right" | "cancel" | null;

export function CheckoutForm({ orderId }: CheckoutFormProps) {
  const [selectedMethod] = useState<"PAYOS">("PAYOS");
  const [loadingSource, setLoadingSource] = useState<LoadingSource>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [isOrderLoading, setIsOrderLoading] = useState(true);
  const [paymentSession, setPaymentSession] = useState<{
    qrCode: string;
    checkoutUrl: string;
    accountName?: string | null;
    resolvedOrderId: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const { error: showErrorToast } = useToast();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelOrder = useCallback(async () => {
    setLoadingSource("cancel");
    try {
      const state = getCheckoutReservationState();
      const resolvedOrderId = state?.orderId ?? orderId;
      await cancelOrder(resolvedOrderId);
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to cancel order:", err);
      showErrorToast("Hủy giữ chỗ thất bại. Vui lòng thử lại.");
    } finally {
      setLoadingSource(null);
      setShowCancelConfirm(false);
    }
  }, [orderId, showErrorToast]);

  useEffect(() => {
    let active = true;
    const checkInitialStatus = async () => {
      try {
        setIsOrderLoading(true);
        const orderData = await getOrderById(orderId);
        if (!active) return;
        if (orderData) {
          setOrderStatus(orderData.status);
          if (orderData.status === "PAID") {
            window.location.href = `/payment/callback?code=00&cancel=false`;
          } else if (orderData.status === "CANCELLED") {
            setError("Đơn hàng này đã bị hủy hoặc đã hết hạn giữ chỗ.");
          }
        }
      } catch (err) {
        console.error("Failed to check initial order status:", err);
        if (active) {
          setError("Không tìm thấy đơn hàng hoặc đơn hàng không hợp lệ.");
        }
      } finally {
        if (active) {
          setIsOrderLoading(false);
        }
      }
    };
    void checkInitialStatus();
    return () => {
      active = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (!paymentSession?.qrCode) {
      return;
    }

    let active = true;
    QRCode.toDataURL(paymentSession.qrCode, { width: 300, margin: 2 })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate QR data URL:", err);
      });

    return () => {
      active = false;
    };
  }, [paymentSession?.qrCode]);

  useEffect(() => {
    if (!paymentSession) return;

    let active = true;
    const interval = setInterval(async () => {
      try {
        const orderData = await getOrderById(paymentSession.resolvedOrderId);
        if (active && orderData && orderData.status === "PAID") {
          clearInterval(interval);
          window.location.href = `/payment/callback?code=00&cancel=false`;
        }
      } catch (err) {
        console.error("Polling order status error:", err);
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [paymentSession]);

  const handlePay = useCallback(
    async (source: LoadingSource) => {
      if (loadingSource !== null) return;
      setLoadingSource(source);
      setError(null);

      const resolvedOrderId = orderId;

      try {
        const result = await processPayment({
          order_id: resolvedOrderId,
          payment_method: selectedMethod,
        });

        if (result.qr_code && result.checkout_url) {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              "last_checkout_order_id",
              resolvedOrderId,
            );
          }
          setPaymentSession({
            qrCode: result.qr_code,
            checkoutUrl: result.checkout_url,
            accountName: result.account_name,
            resolvedOrderId,
          });
          setLoadingSource(null);
        } else if (result.checkout_url) {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              "last_checkout_order_id",
              resolvedOrderId,
            );
          }
          window.location.href = result.checkout_url;
        } else {
          const errMsg = "Cổng thanh toán không trả về thông tin. Vui lòng thử lại.";
          setError(errMsg);
          showErrorToast(errMsg);
          setLoadingSource(null);
        }
      } catch (err: unknown) {
        let message = "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.";
        if (err instanceof Error) {
          if (
            err.message.toLowerCase().includes("fetch") ||
            err.message.toLowerCase().includes("network")
          ) {
            message = "Lỗi kết nối — vui lòng kiểm tra mạng của bạn và thử lại.";
          } else {
            message = err.message;
          }
        }
        setError(message);
        showErrorToast(message);
        setLoadingSource(null);
      }
    },
    [loadingSource, orderId, selectedMethod, showErrorToast],
  );

  const isAnyLoading = loadingSource !== null;
  const leftLoading = loadingSource === "pay-left";
  const rightLoading = loadingSource === "pay-right";
  const cancelLoading = loadingSource === "cancel";

  if (isOrderLoading) {
    return (
      <div className="lg:col-span-2 flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-on-surface-variant text-sm font-semibold">
          Tải thông tin đơn hàng...
        </p>
      </div>
    );
  }

  if (error && (orderStatus === null || orderStatus === "CANCELLED")) {
    return (
      <div className="lg:col-span-2 rounded-3xl border border-outline-variant bg-surface p-8 text-center max-w-lg mx-auto space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <span className="text-2xl font-bold">⚠</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-on-surface">
            Đơn hàng không khả dụng
          </h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {error}
          </p>
        </div>
        <button
          onClick={() => {
            window.location.href = "/";
          }}
          className="inline-flex h-11 px-6 items-center justify-center rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
        >
          Quay lại Trang chủ
        </button>
      </div>
    );
  }

  if (paymentSession) {
    return (
      <>
        {/* Left column - QR Code payment panel */}
        <div className="rounded-3xl border border-outline-variant bg-surface p-6 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl font-black text-on-surface">
              Quét mã QR để Thanh toán
            </h2>
            <p className="text-sm text-on-surface-variant">
              Vui lòng sử dụng ứng dụng Mobile Banking của bạn để quét mã VietQR bên dưới.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-6 bg-primary/5 rounded-2xl border border-dashed border-outline-variant/60">
            <div className="relative aspect-square w-60 overflow-hidden rounded-xl border border-outline-variant bg-white p-3 shadow-md flex items-center justify-center">
              {qrDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrDataUrl}
                  alt="Payment QR Code"
                  className="w-full h-full"
                />
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-on-surface-variant">
                    Đang tạo mã QR...
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4 text-center space-y-1">
              {paymentSession.accountName && (
                <p className="text-xs text-on-surface-variant">
                  Tên tài khoản:{" "}
                  <span className="font-bold text-on-surface">
                    {paymentSession.accountName}
                  </span>
                </p>
              )}
              <p className="text-xs text-on-surface-variant flex items-center justify-center gap-1.5 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Đang chờ hệ thống ghi nhận thanh toán...
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant transition-colors hover:bg-slate-850 hover:text-on-surface cursor-pointer"
            >
              Hủy giao dịch
            </button>
          </div>
        </div>

        {/* Right column */}
        <OrderSummaryCard
          onPay={() => {}}
          rightLoading={false}
          isAnyLoading={true}
          orderId={orderId}
        />

        <ConfirmModal
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleCancelOrder}
          title="Xác nhận hủy giữ vé"
          message="Bạn có chắc chắn muốn hủy lượt giữ vé này? Các chỗ ngồi đang chọn của bạn sẽ được giải phóng lập tức."
          confirmText="Xác nhận hủy"
          cancelText="Quay lại"
          isLoading={cancelLoading}
        />
      </>
    );
  }

  return (
    <>
      {/* Left column */}
      <div className="space-y-4">
        <PaymentMethodPicker />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Pay now */}
            <button
              id="pay-now-btn"
              type="button"
              onClick={() => handlePay("pay-left")}
              disabled={isAnyLoading}
              aria-busy={leftLoading}
              aria-label="Thanh toán ngay"
              className={[
                "inline-flex items-center gap-2 rounded-xl px-6 py-3 cursor-pointer",
                "text-sm font-semibold text-white transition-all duration-200",
                leftLoading
                  ? "cursor-not-allowed bg-primary/60"
                  : isAnyLoading
                    ? "cursor-not-allowed bg-primary/40"
                    : "bg-primary hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]",
              ].join(" ")}
            >
              {leftLoading && <Loader2 size={15} className="animate-spin" />}
              {leftLoading ? "Đang chuyển hướng…" : "Thanh toán ngay"}
            </button>

            {/* Cancel Order */}
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              disabled={isAnyLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] cursor-pointer border border-slate-800 bg-slate-900/40 text-on-surface-variant hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Ban size={14} />
              )}
              {cancelLoading ? "Đang hủy..." : "Hủy giữ vé"}
            </button>
          </div>
        </div>
      </div>

      {/* Right column */}
      <OrderSummaryCard
        onPay={() => handlePay("pay-right")}
        rightLoading={rightLoading}
        isAnyLoading={isAnyLoading}
        orderId={orderId}
      />

      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelOrder}
        title="Xác nhận hủy giữ vé"
        message="Bạn có chắc chắn muốn hủy lượt giữ vé này? Các chỗ ngồi đang chọn của bạn sẽ được giải phóng lập tức."
        confirmText="Xác nhận hủy"
        cancelText="Quay lại"
        isLoading={cancelLoading}
      />
    </>
  );
}
