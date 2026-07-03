"use client";

import { useState, useCallback, useEffect } from "react";
import { PaymentMethodPicker, OrderSummaryCard } from "@/components/screens";
import { Loader2, Ban } from "lucide-react";
import { processPayment } from "@/services/payment.service";
import { getCheckoutReservationState } from "@/utils/checkout-state.utils";
import { getOrderById, cancelOrder } from "@/services/order.service";

import QRCode from "qrcode";

interface CheckoutFormProps {
  orderId: string;
}

type LoadingSource = "left" | "right" | null;

export function CheckoutForm({ orderId }: CheckoutFormProps) {
  const [selectedMethod] = useState<"PAYOS">("PAYOS");
  const [loadingSource, setLoadingSource] = useState<LoadingSource>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState<{
    qrCode: string;
    checkoutUrl: string;
    accountName?: string | null;
    resolvedOrderId: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const handleCancelOrder = useCallback(async () => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn hủy lượt giữ chỗ này? Hành động này sẽ hoàn lại các vé đã chọn.",
      )
    ) {
      return;
    }
    setLoadingSource("left");
    try {
      const state = getCheckoutReservationState();
      const resolvedOrderId = state?.orderId ?? orderId;
      await cancelOrder(resolvedOrderId);
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to cancel order:", err);
      alert("Hủy giữ chỗ thất bại. Vui lòng thử lại.");
    } finally {
      setLoadingSource(null);
    }
  }, [orderId]);

  useEffect(() => {
    let active = true;
    const checkInitialStatus = async () => {
      try {
        const orderData = await getOrderById(orderId);
        if (!active) return;
        if (orderData.status === "PAID") {
          window.location.href = `/payment/callback?code=00&cancel=false`;
        }
      } catch (err) {
        console.error("Failed to check initial order status:", err);
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
        if (active && orderData.status === "PAID") {
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

      const state = getCheckoutReservationState();
      const resolvedOrderId = state?.orderId ?? orderId;

      const savedKey =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem(
              `idempotency_key_${resolvedOrderId}`,
            ) || undefined
          : undefined;

      try {
        const result = await processPayment(
          {
            order_id: resolvedOrderId,
            payment_method: selectedMethod,
          },
          savedKey,
        );

        if (result.idempotency_key && typeof window !== "undefined") {
          window.sessionStorage.setItem(
            `idempotency_key_${resolvedOrderId}`,
            result.idempotency_key,
          );
        }

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
          setError(
            "Payment gateway did not return a redirect URL. Please try again.",
          );
          setLoadingSource(null);
        }
      } catch (err: unknown) {
        let message = "Unexpected error. Please retry.";
        if (err instanceof Error) {
          if (
            err.message.toLowerCase().includes("fetch") ||
            err.message.toLowerCase().includes("network")
          ) {
            message =
              "Network error — please check your connection and try again.";
          } else {
            message = err.message;
          }
        }
        setError(message);
        setLoadingSource(null);
      }
    },
    [loadingSource, orderId, selectedMethod],
  );

  const isAnyLoading = loadingSource !== null;
  const leftLoading = loadingSource === "left";
  const rightLoading = loadingSource === "right";

  if (paymentSession) {
    return (
      <>
        {/* Left column - QR Code payment panel */}
        <div className="rounded-3xl border border-outline-variant bg-surface p-6 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl font-black text-on-surface">
              Scan QR to Pay
            </h2>
            <p className="text-sm text-on-surface-variant">
              Please use your mobile banking app to scan the VietQR code below.
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
                    Generating QR...
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4 text-center space-y-1">
              {paymentSession.accountName && (
                <p className="text-xs text-on-surface-variant">
                  Account Name:{" "}
                  <span className="font-bold text-on-surface">
                    {paymentSession.accountName}
                  </span>
                </p>
              )}
              <p className="text-xs text-on-surface-variant flex items-center justify-center gap-1.5 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Waiting for payment detection...
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setPaymentSession(null);
                setQrDataUrl("");
              }}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface"
            >
              Cancel
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
              onClick={() => handlePay("left")}
              disabled={isAnyLoading}
              aria-busy={leftLoading}
              aria-label="Pay now"
              className={[
                "inline-flex items-center gap-2 rounded-xl px-6 py-3",
                "text-sm font-semibold text-white transition-all duration-200",
                leftLoading
                  ? "cursor-not-allowed bg-primary/60"
                  : isAnyLoading
                    ? "cursor-not-allowed bg-primary/40"
                    : "bg-primary hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]",
              ].join(" ")}
            >
              {leftLoading && <Loader2 size={15} className="animate-spin" />}
              {leftLoading ? "Redirecting…" : "Pay now"}
            </button>

            {/* Cancel Order */}
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={isAnyLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] cursor-pointer border border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-md hover:shadow-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingSource === "left" ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Ban size={14} />
              )}
              {loadingSource === "left" ? "Cancelling..." : "Cancel Order"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              <span className="mt-px shrink-0">⚠</span>
              <div className="flex-1">
                <p className="font-semibold">Payment failed</p>
                <p className="mt-0.5 text-rose-600/90">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dismiss"
                className="shrink-0 text-rose-400 hover:text-rose-600 transition-colors"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right column */}
      <OrderSummaryCard
        onPay={() => handlePay("right")}
        rightLoading={rightLoading}
        isAnyLoading={isAnyLoading}
        orderId={orderId}
      />
    </>
  );
}
