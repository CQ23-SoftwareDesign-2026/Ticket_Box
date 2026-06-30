"use client";

import { useEffect, useState } from "react";
import { SiteShell, Button } from "@/components/common";
import { getOrders, type OrderListItem, type PaginationMeta } from "@/services/order.service";
import { Calendar, Ticket, ArrowRight, Landmark, Search, AlertCircle, Sparkles, CheckCircle2, Ban } from "lucide-react";
import "@/styles/status-filter.css";

const TABS = [
  { key: "ALL", label: "All Orders" },
  { key: "PENDING", label: "Pending" },
  { key: "PAID", label: "Paid" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function MyTicketsPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      setError(null);
      try {
        // Query database with matching status filters
        const statusParam = activeTab === "ALL" ? undefined : activeTab;
        const response = await getOrders(currentPage, 30, statusParam);
        if (active) {
          setOrders(response.data);
          setMeta(response.meta);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load orders library:", err);
        if (active) {
          setError("Could not retrieve purchase logs. Please try again later.");
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [currentPage, activeTab]);

  // Reset page when switching tabs
  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    setCurrentPage(1);
  };

  // Client-side search filtration matching concert name or order id
  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      order.concert_name.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query)
    );
  });

  const renderStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-sm shadow-emerald-100">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Paid
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 shadow-sm shadow-amber-100">
            <AlertCircle size={12} className="text-amber-600 animate-pulse" />
            Pending
          </span>
        );
      case "CANCELLED":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-500">
            <Ban size={12} className="text-slate-400" />
            Cancelled
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <SiteShell active="/my-tickets">
      {/* Premium Hero Panel */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="hero-shimmer relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/90 to-primary-container p-6 text-white shadow-lg sm:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                <Sparkles size={12} />
                Ticket Library
              </span>
              <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
                My Ticket Library
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-white/80">
                Keep your confirmed entry passes, pending checkout reserves, and transaction logs organized in one centralized hub.
              </p>
            </div>

            {/* Quick action back to concerts */}
            <Button href="/concerts" variant="secondary" className="shrink-0 font-bold self-start md:self-auto shadow-md">
              Find New Events
            </Button>
          </div>
        </div>
      </section>

      {/* Main Filter and History Grid */}
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search & Interactive Tabs Row */}
        <div className="flex flex-col gap-4 border-b border-outline-variant/60 pb-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Interactive Pills */}
          <div className="status-filter-group">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`status-filter-btn ${activeTab === tab.key ? "status-filter-btn--active" : ""}`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full lg:max-w-sm">
            <input
              type="text"
              placeholder="Search by event or booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-outline-variant bg-surface px-5 py-3 pl-11 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
            <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-on-surface-variant/50" />
          </div>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
            <p className="font-semibold">{error}</p>
            <button
              onClick={() => setCurrentPage((c) => c)}
              type="button"
              className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-4 py-2 text-sm font-bold text-rose-800 hover:bg-rose-200 transition-colors"
            >
              Try Reloading
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-8 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-32 w-full animate-pulse rounded-3xl border border-outline-variant bg-surface-low"
              />
            ))}
          </div>
        ) : !error && filteredOrders.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-outline-variant py-20 text-center">
            <Landmark className="mx-auto h-12 w-12 text-on-surface-variant/30" />
            <h3 className="mt-4 text-lg font-bold text-on-surface">
              No matching tickets found
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant max-w-sm mx-auto">
              {searchQuery
                ? "We couldn't find any orders matching your search query. Try clearing or spelling differently."
                : "Your query returned no entries in this category. Browse live concerts to reserve seats."}
            </p>
            <Button href="/concerts" className="mt-6">
              Browse Concerts
            </Button>
          </div>
        ) : (
          <>
            {/* Orders Feed */}
            <div className="mt-8 space-y-4">
              {filteredOrders.map((order) => {
                const isPaid = order.status === "PAID";
                const isPending = order.status === "PENDING";

                return (
                  <div
                    key={order.id}
                    className="group relative overflow-hidden rounded-3xl border border-outline-variant bg-surface p-5 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left: General Transaction Telemetry details */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-xs font-semibold text-on-surface-variant/80">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          {renderStatusBadge(order.status)}
                        </div>
                        <h3 className="font-display text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
                          {order.concert_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                          <span className="flex items-center gap-1">
                            <Calendar size={13} />
                            Ordered {formatDate(order.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Ticket size={13} />
                            {order.ticket_count}{" "}
                            {order.ticket_count > 1 ? "tickets" : "ticket"}
                          </span>
                        </div>
                      </div>

                      {/* Right: Pricing settlement & CTA Operations */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/60 pt-4 sm:border-0 sm:pt-0">
                        <div className="text-left sm:text-right sm:space-y-0.5 min-w-[100px]">
                          <p className="text-xs uppercase tracking-[0.1em] text-on-surface-variant font-medium">
                            Total amount
                          </p>
                          <p className="text-lg font-black text-on-surface">
                            {order.total_amount}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* PAID orders show View Tickets */}
                          {isPaid && (
                            <Button
                              href={`/orders/${order.id}`}
                              className="font-bold whitespace-nowrap"
                            >
                              View Tickets
                            </Button>
                          )}

                          {/* PENDING orders show Pay Now */}
                          {isPending && (
                            <Button
                              href={`/checkout/${order.id}`}
                              className="font-bold whitespace-nowrap"
                            >
                              Pay Now
                            </Button>
                          )}

                          {/* Detail button for other states */}
                          {!isPaid && !isPending && (
                            <Button
                              href={`/orders/${order.id}`}
                              variant="soft"
                              className="inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              Details
                              <ArrowRight size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {meta && meta.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between gap-4 border-t border-outline-variant/60 pt-6">
                <span className="text-sm text-on-surface-variant">
                  Page {meta.currentPage} of {meta.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={meta.currentPage <= 1 || loading}
                    onClick={() => setCurrentPage((c) => c - 1)}
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-outline-variant px-4 text-sm font-semibold text-on-surface-variant hover:bg-surface-low disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <button
                    disabled={meta.currentPage >= meta.totalPages || loading}
                    onClick={() => setCurrentPage((c) => c + 1)}
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-outline-variant px-4 text-sm font-semibold text-on-surface-variant hover:bg-surface-low disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </SiteShell>
  );
}
