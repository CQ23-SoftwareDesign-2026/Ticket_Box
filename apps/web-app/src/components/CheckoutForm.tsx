"use client";

import { useState, useCallback } from "react";
import { PaymentMethodPicker, OrderSummaryCard } from "@/components/screens";
import { Button } from "@/components/common";
import { processPayment } from "@/services/payment.service";
import { getCheckoutReservationState } from "@/utils/checkout-state.utils";

interface CheckoutFormProps {
  orderId: string;
}

type LoadingSource = "left" | "right" | null;

/**
 * Client Component island that owns:
 *  – selectedPaymentMethod state
 *  – handlePay (shared between "Pay now" button and OrderSummaryCard "Pay {total}" button)
 *
 * Uses `loadingSource` instead of a boolean to track which button is currently
 * in-flight — this prevents the "Pay total" click from making "Pay now" show
 * a spinner or become disabled.
 */
export function CheckoutForm({ orderId }: CheckoutFormProps) {
  const [selectedMethod] = useState<"PAYOS">("PAYOS");
  const [loadingSource, setLoadingSource] = useState<LoadingSource>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePay = useCallback(
    async (source: LoadingSource) => {
      if (loadingSource !== null) return; // already in-flight
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
          // Redirect — component may stay mounted (SPA), so reset loading so
          // the user can retry if they close the gateway tab and come back.
          window.location.href = result.checkout_url;
          // Don't reset loading here — we want the spinner to stay while redirecting.
        } else {
          setError(
            "Payment gateway did not return a redirect URL. Please try again.",
          );
          setLoadingSource(null);
        }
      } catch (err: unknown) {
        let message = "Unexpected error. Please retry.";
        if (err instanceof Error) {
          // "Failed to fetch" → friendlier message
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
      {/* ── Left column ──────────────────────────────────────────────── */}
      <div className="space-y-6">
        <PaymentMethodPicker />

        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {/* Pay now button */}
            <button
              id="pay-now-btn"
              type="button"
              onClick={() => handlePay("left")}
              disabled={isAnyLoading}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5",
                "text-sm font-semibold tracking-wide text-white transition-all duration-200",
                leftLoading
                  ? "cursor-not-allowed bg-primary/60"
                  : isAnyLoading
                    ? "cursor-not-allowed bg-primary/40"
                    : "bg-primary shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98]",
              ].join(" ")}
              aria-busy={leftLoading}
              aria-label="Pay now"
            >
              {leftLoading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Redirecting…
                </>
              ) : (
                "Pay now"
              )}
            </button>

            <Button
              href="/"
              variant="ghost"
              className="border border-outline-variant"
            >
              Back to Home
            </Button>
          </div>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            >
              <span className="material-symbols-outlined text-base leading-none mt-px shrink-0">
                error
              </span>
              <div className="flex-1">
                <p className="font-semibold">Payment failed</p>
                <p className="mt-0.5 text-error/80">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="shrink-0 text-error/60 hover:text-error transition-colors"
                aria-label="Dismiss error"
              >
                <span className="material-symbols-outlined text-base">
                  close
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right column — Order summary with wired Pay {total} ──────── */}
      <OrderSummaryCard
        onPay={() => handlePay("right")}
        rightLoading={rightLoading}
        isAnyLoading={isAnyLoading}
      />
    </>
  );
}
