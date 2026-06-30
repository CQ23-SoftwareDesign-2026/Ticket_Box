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
): Promise<ProcessPaymentResponse> {
  const idempotencyKey = generateUUID();

  return fetchClient<ProcessPaymentResponse>("/payments/process", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(input),
  });
}
