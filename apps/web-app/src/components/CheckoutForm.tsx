"use client";

import { useState, useCallback } from "react";
import { PaymentMethodPicker, OrderSummaryCard } from "@/components/screens";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { processPayment } from "@/services/payment.service";
import { getCheckoutReservationState } from "@/utils/checkout-state.utils";

interface CheckoutFormProps {
  orderId: string;
}

type LoadingSource = "left" | "right" | null;

export function CheckoutForm({ orderId }: CheckoutFormProps) {
  const [selectedMethod] = useState<"PAYOS">("PAYOS");
  const [loadingSource, setLoadingSource] = useState<LoadingSource>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePay = useCallback(
    async (source: LoadingSource) => {
      if (loadingSource !== null) return;
      setLoadingSource(source);
      setError(null);

      const state = getCheckoutReservationState();
      const resolvedOrderId = state?.orderId ?? orderId;

      try {
        const result = await processPayment({
          order_id: resolvedOrderId,
          payment_method: selectedMethod,
        });

        if (result.checkout_url) {
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

            {/* Back */}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant px-5 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
            >
              <ArrowLeft size={15} />
              Back
            </Link>
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
      />
    </>
  );
}
