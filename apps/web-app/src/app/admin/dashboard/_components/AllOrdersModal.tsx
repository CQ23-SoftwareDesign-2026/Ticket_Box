"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { formatConcertCurrency } from "@/services/concert.service";
import { type AdminOrderListItem } from "@/services/order.service";

const ORDER_STATUS_CLASSES: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

interface AllOrdersModalProps {
  isOpen: boolean;
  modalOrders: AdminOrderListItem[];
  modalPage: number;
  modalTotalPages: number;
  modalSearch: string;
  isModalLoading: boolean;
  modalStatusFilter: string;
  onClose: () => void;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onStatusFilterChange: (v: string) => void;
}

export function AllOrdersModal({
  isOpen,
  modalOrders,
  modalPage,
  modalTotalPages,
  modalSearch,
  isModalLoading,
  modalStatusFilter,
  onClose,
  onSearchChange,
  onPageChange,
  onStatusFilterChange,
}: AllOrdersModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-5xl rounded-xl border border-border shadow-lg flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-surface-high/50">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground">
              All System Orders
            </h3>
            <p className="text-muted-foreground font-body text-xs mt-0.5">
              Browse, search, and monitor all client order records
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-high rounded-lg text-muted-foreground hover:text-foreground transition-colors font-body text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border bg-background/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="pl-10 pr-4 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body text-sm w-full transition-all"
              placeholder="Search by ID, customer name/email, concert..."
              type="text"
              value={modalSearch}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onPageChange(1);
              }}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <span className="text-xs text-muted-foreground font-body font-semibold">
              Status:
            </span>
            <select
              value={modalStatusFilter}
              onChange={(e) => {
                onStatusFilterChange(e.target.value);
                onPageChange(1);
              }}
              className="px-3 py-1.5 border border-border rounded-lg bg-surface font-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto grow p-6">
          {isModalLoading ? (
            <div className="py-20 text-center text-muted-foreground">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <span className="font-body text-sm">
                  Fetching all order records...
                </span>
              </div>
            </div>
          ) : modalOrders.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground font-body text-sm">
              No orders matched the specified filters.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="p-3 border-b border-border">Order ID</th>
                  <th className="p-3 border-b border-border">Customer</th>
                  <th className="p-3 border-b border-border">Concert</th>
                  <th className="p-3 border-b border-border text-center">
                    Tickets
                  </th>
                  <th className="p-3 border-b border-border">Amount</th>
                  <th className="p-3 border-b border-border">Status</th>
                  <th className="p-3 border-b border-border">Date</th>
                  <th className="p-3 border-b border-border text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="font-body text-sm divide-y divide-border">
                {modalOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-surface-high/50 transition-colors"
                  >
                    <td className="p-3 font-mono text-xs text-foreground font-semibold">
                      #{order.id.slice(0, 8)}...
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-foreground">
                        {order.user_name || "Unknown Customer"}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {order.user_email}
                      </p>
                    </td>
                    <td
                      className="p-3 font-semibold text-foreground max-w-[150px] truncate"
                      title={order.concert_name}
                    >
                      {order.concert_name}
                    </td>
                    <td className="p-3 text-center font-semibold text-foreground">
                      {order.ticket_count}
                    </td>
                    <td className="p-3 font-semibold text-foreground">
                      {formatConcertCurrency(Number(order.total_amount))}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-body text-[10px] font-semibold border ${ORDER_STATUS_CLASSES[order.status] ?? "bg-surface-highest text-foreground border-border"}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {new Date(order.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-3 text-center">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        onClick={onClose}
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer / Pagination */}
        {!isModalLoading && modalTotalPages > 1 && (
          <div className="p-4 border-t border-border bg-surface-high/30 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-body font-semibold">
              Page {modalPage} of {modalTotalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={modalPage <= 1}
                onClick={() => onPageChange(Math.max(modalPage - 1, 1))}
                className="px-3 py-1.5 border border-border rounded-lg font-body text-xs font-semibold hover:bg-surface-high disabled:opacity-50 disabled:hover:bg-transparent text-foreground transition-all"
              >
                Previous
              </button>
              <button
                disabled={modalPage >= modalTotalPages}
                onClick={() =>
                  onPageChange(Math.min(modalPage + 1, modalTotalPages))
                }
                className="px-3 py-1.5 border border-border rounded-lg font-body text-xs font-semibold hover:bg-surface-high disabled:opacity-50 disabled:hover:bg-transparent text-foreground transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
