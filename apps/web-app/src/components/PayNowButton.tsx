"use client";

import { useState } from "react";
import {
  isPayOsCircuitOpen,
  PAYOS_UNAVAILABLE_MESSAGE,
  processPayment,
  type PaymentMethod,
} from "@/services/payment.service";
import { getCheckoutReservationState } from "@/utils/checkout-state.utils";

interface PayNowButtonProps {
  orderId: string;
  selectedMethod: PaymentMethod;
}

/**
 * Client Component that handles the final payment submission:
 *
 * 1. Calls `POST /payments/process` with the selected payment method.
 * 2. A fresh UUID v4 `Idempotency-Key` is auto-generated per attempt inside
 *    `payment.service.ts` — no duplicate charges can occur from double-clicks.
 * 3. On success the browser is redirected to the `checkout_url` returned by the
 *    payment gateway (PayOS sandbox).
 * 4. On error an inline message is shown without navigating away.
 */
export function PayNowButton({ orderId, selectedMethod }: PayNowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    // Prevent re-entrant clicks while a request is in-flight.
    if (loading) return;

    setLoading(true);
    setError(null);

    // Prefer the orderId stored in local checkout state; fall back to the
    // URL param so the component works even if the state was cleared.
    const state = getCheckoutReservationState();
    const resolvedOrderId = state?.orderId ?? orderId;

    try {
      const result = await processPayment({
        order_id: resolvedOrderId,
        payment_method: selectedMethod,
      });

      if (result.checkout_url) {
        // Redirect user to the payment gateway sandbox.
        window.location.href = result.checkout_url;
      } else {
        // Gateway responded but did not return a redirect URL — rare edge case.
        setError(
          "Payment gateway did not return a redirect URL. Please try again.",
        );
        setLoading(false);
      }
    } catch (err: unknown) {
      const message = isPayOsCircuitOpen(err)
        ? PAYOS_UNAVAILABLE_MESSAGE
        : err instanceof Error
          ? err.message
          : "Unexpected error. Please retry.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        id="pay-now-btn"
        type="button"
        onClick={handlePay}
        disabled={loading}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5",
          "text-sm font-semibold tracking-wide text-white",
          "transition-all duration-200",
          loading
            ? "cursor-not-allowed bg-primary/60"
            : "bg-primary shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98]",
        ].join(" ")}
        aria-busy={loading}
        aria-label="Pay now"
      >
        {loading ? (
          <>
            {/* Spinner */}
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
            Redirecting to gateway…
          </>
        ) : (
          "Pay now"
        )}
      </button>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-error/10 px-4 py-3 text-sm text-error"
        >
          <span className="material-symbols-outlined text-base leading-none mt-px shrink-0">
            error
          </span>
          {error}
        </p>
      )}
    </div>
  );
}
