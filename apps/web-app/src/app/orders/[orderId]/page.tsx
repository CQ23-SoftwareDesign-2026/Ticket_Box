"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { SiteShell, Button } from "@/components/common";
import {
  getOrderById,
  cancelOrder,
  type OrderDetail,
} from "@/services/order.service";
import {
  Calendar,
  Ticket,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  Ban,
  RefreshCw,
  Landmark,
} from "lucide-react";
import QRCode from "qrcode";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

function TicketQrCode({ hash }: { hash: string }) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(hash, { width: 150, margin: 1 })
      .then((url) => {
        if (active) setQrUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate ticket QR:", err);
      });
    return () => {
      active = false;
    };
  }, [hash]);

  if (!qrUrl) {
    return (
      <div className="flex h-32 w-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={qrUrl} alt="Entry QR Code" className="w-full h-full" />
  );
}

export default function OrderDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [openTelemetryId, setOpenTelemetryId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrderById(orderId);
      setOrder(data);
    } catch (err) {
      console.error("Failed to load order details:", err);
      setError(
        "Unable to retrieve order details. Please verify your order ID.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await getOrderById(orderId);
        if (active) {
          setOrder(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load order details:", err);
        if (active) {
          setError(
            "Unable to retrieve order details. Please verify your order ID.",
          );
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (
      !window.confirm(
        "Are you sure you want to cancel this pending order? This will release reserved seats.",
      )
    ) {
      return;
    }
    setCancelLoading(true);
    try {
      const updated = await cancelOrder(orderId);
      setOrder(updated);
    } catch (err) {
      console.error("Error cancelling order:", err);
      alert("Failed to cancel order. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
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

  const toggleTelemetry = (txId: string) => {
    setOpenTelemetryId(openTelemetryId === txId ? null : txId);
  };

  if (loading) {
    return (
      <SiteShell active="/my-tickets">
        <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-on-surface-variant font-medium">
            Loading order details...
          </p>
        </div>
      </SiteShell>
    );
  }

  if (error || !order) {
    return (
      <SiteShell active="/my-tickets">
        <section className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertTriangle size={28} />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold text-on-surface">
            Order Not Found
          </h2>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            {error ||
              "We couldn't find the requested order in your account history."}
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button href="/my-tickets" className="w-full">
              Back to history
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
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header Breadcrumbs */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant">
              <span
                className="hover:text-primary cursor-pointer"
                onClick={() => window.history.back()}
              >
                Orders
              </span>
              <span>/</span>
              <span className="text-on-surface/60">Detail</span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-black text-on-surface sm:text-4xl">
              Order Details
            </h1>
            <p className="mt-1 text-xs font-mono text-on-surface-variant">
              ID: {order.id}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-low transition-all"
              title="Refresh order status"
            >
              <RefreshCw size={16} />
            </button>
            {isPending && (
              <>
                <Link
                  href={`/checkout/${order.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all duration-200 bg-primary hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98] whitespace-nowrap"
                >
                  Pay Now
                </Link>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] cursor-pointer border border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-md hover:shadow-rose-100 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {cancelLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Ban size={14} />
                  )}
                  {cancelLoading ? "Cancelling..." : "Cancel Order"}
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
              <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 text-amber-900">
                <div className="flex gap-3">
                  <AlertTriangle className="shrink-0 text-amber-600" />
                  <div>
                    <h4 className="font-bold text-amber-900">
                      Payment Pending
                    </h4>
                    <p className="mt-1 text-sm text-amber-800">
                      This order is reserved, but payment has not been
                      confirmed. Please complete the settlement process before
                      the reservation expires.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 text-slate-800">
                <div className="flex gap-3">
                  <Ban className="shrink-0 text-slate-500" />
                  <div>
                    <h4 className="font-bold text-slate-900">
                      Order Cancelled
                    </h4>
                    <p className="mt-1 text-sm text-slate-700">
                      This order was cancelled and seat allocations have been
                      released back into the ticket pool inventory.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Event & Overview Card */}
            <div className="overflow-hidden rounded-3xl border border-outline-variant bg-surface p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold text-on-surface">
                {order.concert_name}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
                <div className="flex items-center gap-2.5 rounded-2xl bg-surface-low p-3.5">
                  <Calendar size={18} className="text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">
                      Created Date
                    </p>
                    <p className="font-semibold text-on-surface">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl bg-surface-low p-3.5">
                  <Ticket size={18} className="text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">
                      Tickets Quantity
                    </p>
                    <p className="font-semibold text-on-surface">
                      {order.ticket_count} tickets
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Passes & QR Section */}
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold text-on-surface flex items-center gap-2">
                <ShieldCheck size={20} className="text-primary" />
                Digital Entry Passes
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                {order.tickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="overflow-hidden rounded-3xl border border-outline-variant bg-surface shadow-sm flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-center gap-2 border-b border-outline-variant/60 pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          Pass #{index + 1}
                        </span>
                        {ticket.is_scanned ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            Scanned
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] uppercase text-on-surface-variant font-medium">
                            Category
                          </p>
                          <p className="text-sm font-semibold text-on-surface">
                            {ticket.category_name || "General Admission"}
                          </p>
                        </div>
                        {ticket.gate_number !== null && (
                          <div>
                            <p className="text-[10px] uppercase text-on-surface-variant font-medium">
                              Gate Number
                            </p>
                            <p className="text-sm font-semibold text-on-surface">
                              Gate {ticket.gate_number}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] uppercase text-on-surface-variant font-medium">
                            QR Hash Reference
                          </p>
                          <p className="text-[11px] font-mono text-on-surface-variant truncate">
                            {ticket.qr_code_hash}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* QR Display */}
                    <div className="bg-primary/5 p-5 border-t border-outline-variant/40 flex flex-col items-center justify-center space-y-3">
                      {isPaid ? (
                        <div className="relative aspect-square w-32 overflow-hidden rounded-xl border border-outline-variant bg-surface p-1 shadow-sm">
                          <TicketQrCode hash={ticket.qr_code_hash} />
                        </div>
                      ) : (
                        <div className="flex aspect-square w-32 flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-low p-4 text-center">
                          <AlertTriangle
                            size={20}
                            className="text-on-surface-variant/60 mx-auto"
                          />
                          <p className="mt-1 text-[9px] font-semibold text-on-surface-variant/80">
                            QR Locked
                          </p>
                          <p className="mt-0.5 text-[8px] text-on-surface-variant/60 leading-tight">
                            Requires paid order status
                          </p>
                        </div>
                      )}
                      <p className="text-[9px] uppercase tracking-wider text-on-surface-variant/70 font-semibold">
                        Scan at entry gate
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column / Invoice Ledger & Telemetry */}
          <div className="space-y-6">
            {/* Invoice Summary Card */}
            <div className="rounded-3xl border border-outline-variant bg-surface p-5 shadow-sm space-y-4">
              <h3 className="font-display text-lg font-bold text-on-surface flex items-center gap-2 pb-3 border-b border-outline-variant/60">
                <Receipt size={18} className="text-primary" />
                Settlement Invoice
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Order Status</span>
                  <span className="font-bold uppercase tracking-wider text-xs">
                    {order.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Ticket Count</span>
                  <span>{order.ticket_count}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span>{order.total_amount}</span>
                </div>
                <div className="flex justify-between border-t border-outline-variant/60 pt-3 text-base font-bold">
                  <span className="text-on-surface">Total Amount</span>
                  <span className="text-primary">{order.total_amount}</span>
                </div>
              </div>
            </div>

            {/* Payment Transactions Ledger & Deep JSONB inspector */}
            <div className="space-y-4">
              <h3 className="font-display text-lg font-bold text-on-surface flex items-center gap-2">
                <Landmark size={18} className="text-primary" />
                Payment Operations
              </h3>

              {order.payment_transactions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">
                  No payment attempts recorded for this order.
                </div>
              ) : (
                <div className="space-y-4">
                  {order.payment_transactions.map((tx) => {
                    const isOpen = openTelemetryId === tx.id;
                    return (
                      <div
                        key={tx.id}
                        className="rounded-3xl border border-outline-variant bg-surface p-4 shadow-sm space-y-3"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-on-surface-variant">
                              TX: {tx.id.slice(0, 8).toUpperCase()}
                            </span>
                            <h4 className="text-sm font-bold text-on-surface mt-0.5">
                              {tx.payment_method} Sandbox
                            </h4>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              tx.status === "SUCCESS"
                                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                : tx.status === "FAILED"
                                  ? "bg-rose-50 border border-rose-200 text-rose-700"
                                  : "bg-amber-50 border border-amber-200 text-amber-700"
                            }`}
                          >
                            {tx.status || "PENDING"}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs border-t border-outline-variant/40 pt-2 text-on-surface-variant">
                          <div className="flex justify-between">
                            <span>Amount:</span>
                            <span className="font-semibold text-on-surface">
                              {tx.amount}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Date:</span>
                            <span>{formatDate(tx.created_at)}</span>
                          </div>
                          {tx.transaction_id_3rd_party && (
                            <div className="flex justify-between">
                              <span>3rd Party ID:</span>
                              <span className="font-mono">
                                {tx.transaction_id_3rd_party}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-col pt-1">
                            <span className="text-[10px] font-medium">
                              Idempotency Key:
                            </span>
                            <span className="font-mono text-[10px] text-on-surface truncate">
                              {tx.idempotency_key}
                            </span>
                          </div>
                        </div>

                        {/* Collapsible raw response JSONB database logs */}
                        {tx.raw_response && (
                          <div className="pt-2">
                            <button
                              onClick={() => toggleTelemetry(tx.id)}
                              className="w-full flex items-center justify-between gap-1 rounded-xl bg-surface-low border border-outline-variant/60 px-3 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-high transition-colors"
                            >
                              <span className="inline-flex items-center gap-1">
                                <Receipt size={12} />
                                Raw Telemetry Log
                              </span>
                              {isOpen ? (
                                <ChevronUp size={13} />
                              ) : (
                                <ChevronDown size={13} />
                              )}
                            </button>

                            {isOpen && (
                              <div className="mt-2 rounded-xl bg-surface-low border border-outline-variant/60 p-3 overflow-x-auto text-[10px] font-mono text-on-surface-variant shadow-inner max-h-48">
                                <pre>
                                  {JSON.stringify(tx.raw_response, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
