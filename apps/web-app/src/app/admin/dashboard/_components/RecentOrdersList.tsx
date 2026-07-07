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
}

const ORDER_STATUS_CLASSES: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export function RecentOrdersList({
  filteredOrders,
  isLoadingOrders,
  searchQuery,
  onSearchChange,
}: RecentOrdersListProps) {
  return (
    <aside className="lg:col-span-1 bg-surface rounded-xl shadow-sm border border-border p-6 flex flex-col min-h-[400px] max-h-[500px]">
      <div className="flex flex-col gap-2 pb-4 border-b border-border mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-foreground leading-tight">
            Đơn hàng Gần đây
          </h3>
        </div>
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            className="pl-8 pr-2 py-1.5 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body text-xs w-full transition-all text-foreground"
            placeholder="Tìm kiếm đơn hàng..."
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
              Đang tải...
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-xs">
            Không tìm thấy đơn hàng nào.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.order_id}
              className="p-3 bg-background rounded-lg border border-border flex flex-col gap-1.5 hover:border-primary/40 transition-colors"
            >
              <div className="flex justify-between items-start">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-body text-[9px] font-semibold border ${ORDER_STATUS_CLASSES[order.status] ?? "bg-surface-highest text-foreground border-border"}`}
                >
                  {order.status === "PAID"
                    ? "ĐÃ THANH TOÁN"
                    : order.status === "PENDING"
                      ? "CHỜ THANH TOÁN"
                      : "ĐÃ HỦY"}
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
                  {order.ticket_count} vé •{" "}
                  {formatConcertCurrency(order.total_amount)}
                </span>
                <Link
                  href={`/admin/orders/${order.order_id}`}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  Chi tiết →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <Link
        href="/admin/orders"
        className="w-full mt-4 py-2 border border-border hover:border-primary text-foreground hover:text-primary font-body text-xs font-semibold rounded-lg transition-colors text-center block cursor-pointer select-none"
      >
        Xem tất cả đơn hàng
      </Link>
    </aside>
  );
}
