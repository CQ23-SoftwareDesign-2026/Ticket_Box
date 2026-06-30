"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SiteShell, Button } from "@/components/common";
import {
  getOrderById,
  getOrders,
  type OrderDetail,
} from "@/services/order.service";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

// Hashing function matching backend to map orderCode back to orderId
function generateOrderCode(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function CallbackContent() {
  const searchParams = useSearchParams();

  const code = searchParams.get("code");
  const cancel = searchParams.get("cancel") === "true";
  const orderCodeParam = searchParams.get("orderCode");

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function resolveAndVerifyOrder() {
      try {
        let resolvedOrderId = window.sessionStorage.getItem(
          "last_checkout_order_id",
        );

        // Validate sessionStorage orderId against orderCode if orderCode is present
        if (resolvedOrderId && orderCodeParam) {
          const expectedCode = generateOrderCode(resolvedOrderId);
          if (expectedCode !== Number(orderCodeParam)) {
            resolvedOrderId = null; // Session mismatch, fallback to history search
          }
        }

        // Fallback to history search if sessionStorage is missing/mismatched
        if (!resolvedOrderId && orderCodeParam) {
          const history = await getOrders(1, 20);
          const matched = history.data.find(
            (o) => generateOrderCode(o.id) === Number(orderCodeParam),
          );
          if (matched) {
            resolvedOrderId = matched.id;
          }
        }

        if (!resolvedOrderId) {
          if (active) {
            setError("Could not locate the details of this transaction.");
            setLoading(false);
          }
          return;
        }

        // Fetch the order status
        const orderData = await getOrderById(resolvedOrderId);

        // If transaction is marked success in query parameters but PENDING in backend, poll for webhook completion
        const isQuerySuccess = code === "00" && !cancel;
        if (
          orderData.status === "PENDING" &&
          isQuerySuccess &&
          pollingCount < 5
        ) {
          setTimeout(() => {
            if (active) setPollingCount((prev) => prev + 1);
          }, 2000);
          return;
        }

        if (active) {
          setOrder(orderData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error verifying payment callback:", err);
        if (active) {
          setError(
            "Failed to fetch order status. Please check your internet connection.",
          );
          setLoading(false);
        }
      }
    }

    resolveAndVerifyOrder();

    return () => {
      active = false;
    };
  }, [code, cancel, orderCodeParam, pollingCount]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center space-y-4 px-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h2 className="font-display text-2xl font-bold text-on-surface">
          Verifying your transaction
        </h2>
        <p className="text-sm text-on-surface-variant max-w-sm">
          Please wait while we establish secure credentials and verify the
          settlement status with the portal.
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <AlertCircle size={28} />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-on-surface">
          Verification Error
        </h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          {error || "We encountered an error loading your order data."}
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button href="/my-tickets" className="w-full">
            Go to order history
          </Button>
          <Button href="/" variant="soft" className="w-full">
            Back to homepage
          </Button>
        </div>
      </div>
    );
  }

  const isSuccess = order.status === "PAID";

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
        <div className="overflow-hidden rounded-3xl border border-outline-variant bg-surface p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="mt-6 font-display text-3xl font-black text-on-surface">
              Payment Successful!
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Your tickets are ready and confirmed. We have successfully
              processed your settlement.
            </p>
          </div>

          <div className="mt-8 space-y-4 border-t border-b border-outline-variant/60 py-6">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Booking ID</span>
              <span className="font-mono font-semibold text-on-surface">
                {order.id.slice(0, 8).toUpperCase()}-
                {order.id.slice(9, 13).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Event</span>
              <span className="font-semibold text-on-surface text-right">
                {order.concert_name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Total Amount</span>
              <span className="font-semibold text-on-surface">
                {order.total_amount}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Tickets Purchased</span>
              <span className="font-semibold text-on-surface">
                {order.ticket_count}{" "}
                {order.ticket_count > 1 ? "tickets" : "ticket"}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href={`/orders/${order.id}`} className="w-full">
              View tickets & QR
            </Button>
            <Button href="/my-tickets" variant="soft" className="w-full">
              Order history
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Failure or Cancelled Screen
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <div className="overflow-hidden rounded-3xl border border-outline-variant bg-surface p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <XCircle size={28} />
          </div>
          <h2 className="mt-6 font-display text-3xl font-black text-on-surface">
            Payment Cancelled
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Your transaction was cancelled or failed to complete. No charges
            were made.
          </p>
        </div>

        <div className="mt-8 space-y-4 border-t border-b border-outline-variant/60 py-6">
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Order ID</span>
            <span className="font-mono font-semibold text-on-surface">
              {order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Event</span>
            <span className="font-semibold text-on-surface text-right">
              {order.concert_name}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Total Amount</span>
            <span className="font-semibold text-on-surface">
              {order.total_amount}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Status</span>
            <span className="font-bold text-rose-600 uppercase tracking-wider text-xs">
              {order.status}
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href={`/checkout/${order.id}`} className="w-full">
            Retry checkout
          </Button>
          <Button href="/" variant="soft" className="w-full">
            Back to concerts
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <SiteShell active="/">
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center space-y-4 px-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h2 className="font-display text-2xl font-bold text-on-surface">
                Loading callback details
              </h2>
            </div>
          }
        >
          <CallbackContent />
        </Suspense>
      </section>
    </SiteShell>
  );
}
