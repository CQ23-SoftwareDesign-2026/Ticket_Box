"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { formatConcertCurrency } from "@/services/concert.service";
import { type RecentOrder } from "@/services/dashboard.service";

interface RecentOrdersListProps {
  filteredOrders: RecentOrder[];
  isLoadingOrders: boolean;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onViewAll: () => void;
}

const ORDER_STATUS_CLASSES: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

export function RecentOrdersList({
  filteredOrders,
  isLoadingOrders,
  searchQuery,
  onSearchChange,
  onViewAll,
}: RecentOrdersListProps) {
  return (
    <aside className="lg:col-span-1 bg-surface rounded-xl shadow-sm border border-border p-6 flex flex-col min-h-[400px] max-h-[500px]">
      <div className="flex flex-col gap-2 pb-4 border-b border-border mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-foreground leading-tight">
            Recent Orders
          </h3>
          <span className="font-body text-[10px] font-semibold text-muted-foreground bg-surface-high px-2 py-0.5 rounded">
            Live Feed
          </span>
        </div>
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            className="pl-8 pr-2 py-1.5 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body text-xs w-full transition-all"
            placeholder="Search orders..."
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto grow pr-1 scrollbar-thin">
        {isLoadingOrders ? (
          <div className="py-8 text-center text-muted-foreground">
            <div className="flex items-center justify-center gap-2 text-xs">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading...
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-xs">
            No orders found.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.order_id}
              className="p-3 bg-background rounded-lg border border-border flex flex-col gap-1.5 hover:border-primary/40 transition-colors"
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-[10px] text-muted-foreground">
                  #{order.order_id.slice(0, 8)}
                </span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-body text-[9px] font-semibold border ${ORDER_STATUS_CLASSES[order.status] ?? "bg-surface-highest text-foreground border-border"}`}
                >
                  {order.status}
                </span>
              </div>
              <div>
                <h4
                  className="font-body text-xs font-bold text-foreground truncate"
                  title={order.customer_name}
                >
                  {order.customer_name}
                </h4>
                <p className="text-muted-foreground text-[10px] truncate">
                  {order.customer_email}
                </p>
              </div>
              <div
                className="text-[11px] font-semibold text-foreground truncate"
                title={order.concert_name}
              >
                {order.concert_name}
              </div>
              <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground">
                  {order.ticket_count}{" "}
                  {order.ticket_count === 1 ? "ticket" : "tickets"} •{" "}
                  {formatConcertCurrency(order.total_amount)}
                </span>
                <Link
                  href={`/orders/${order.order_id}`}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  Details →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onViewAll}
        className="w-full mt-4 py-2 border border-border hover:border-primary text-foreground hover:text-primary font-body text-xs font-semibold rounded-lg transition-colors text-center"
      >
        View All Orders
      </button>
    </aside>
  );
}
