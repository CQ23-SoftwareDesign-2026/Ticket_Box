import { fetchClient } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMethod = "PAYOS";

export interface ProcessPaymentInput {
  order_id: string;
  payment_method: PaymentMethod;
}

export interface ProcessPaymentResponse {
  payment_transaction_id: string;
  order_id: string;
  payment_method: string;
  status: string;
  gateway_status: string;
  checkout_url?: string | null;
  qr_code?: string | null;
  account_name?: string | null;
  idempotency_key: string;
  circuit_breaker_state: string;
}

type PaymentFetchError = {
  response?: {
    status?: number;
    data?: {
      message?: string | string[];
      circuit_breaker_state?: string;
    };
  };
};

export const PAYOS_UNAVAILABLE_MESSAGE =
  "Cổng PayOS đang tạm thời gián đoạn, vui lòng thử lại sau.";

/** Returns true only for the BE graceful-degradation response. */
export function isPayOsCircuitOpen(error: unknown): boolean {
  const fetchError = error as PaymentFetchError;
  const status = fetchError.response?.status;
  const data = fetchError.response?.data;
  const messages = Array.isArray(data?.message)
    ? data.message
    : data?.message
      ? [data.message]
      : [];

  return (
    status === 503 &&
    (data?.circuit_breaker_state === "OPEN" ||
      messages.some((message) =>
        /gateway is temporarily unavailable|circuit breaker is open|breaker is open/i.test(
          message,
        ),
      ))
  );
}

// ─── Service ──────────────────────────────────────────────────────────────────

function generateUUID(): string {
  if (
    typeof window !== "undefined" &&
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }
  // Robust RFC4122 v4 compliant UUID generator fallback for insecure HTTP contexts
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Submits a payment processing request to `POST /payments/process`.
 *
 * A cryptographically unique UUID v4 is generated for every call and injected
 * as the `Idempotency-Key` request header.  The backend interceptor validates
 * the format and uses it to deduplicate duplicate click events, so a fresh key
 * must be produced for each new payment attempt.
 */
export async function processPayment(
  input: ProcessPaymentInput,
  idempotencyKey?: string,
): Promise<ProcessPaymentResponse> {
  const key = idempotencyKey || generateUUID();

  return fetchClient<ProcessPaymentResponse>("/payments/process", {
    method: "POST",
    headers: {
      "Idempotency-Key": key,
    },
    body: JSON.stringify(input),
  });
}

export interface ResolveRefundInput {
  refund_tx_id?: string;
  refund_note?: string;
}

export async function resolveRefund(
  transactionId: string,
  input: ResolveRefundInput,
): Promise<{ status: string }> {
  return fetchClient<{ status: string }>(
    `/payments/transactions/${transactionId}/refund`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}
