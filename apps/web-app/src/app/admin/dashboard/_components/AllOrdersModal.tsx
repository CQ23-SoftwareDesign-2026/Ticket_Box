"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { formatConcertCurrency } from "@/services/concert.service";
import { type AdminOrderListItem } from "@/services/order.service";

const ORDER_STATUS_CLASSES: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm select-none">
      <div className="bg-surface w-full max-w-5xl rounded-xl border border-border shadow-lg flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-surface-high/50">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground">
              Tất cả Đơn hàng Hệ thống
            </h3>
            <p className="text-muted-foreground font-body text-xs mt-0.5">
              Duyệt, tìm kiếm và giám sát tất cả các giao dịch của khách hàng
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-high rounded-lg text-muted-foreground hover:text-foreground transition-colors font-body text-sm font-semibold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border bg-background/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="pl-10 pr-4 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body text-sm w-full transition-all text-foreground"
              placeholder="Tìm kiếm theo mã đơn, tên, email..."
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
              Trạng thái:
            </span>
            <div className="relative">
              <select
                value={modalStatusFilter}
                onChange={(e) => {
                  onStatusFilterChange(e.target.value);
                  onPageChange(1);
                }}
                className="appearance-none pl-3 pr-8 py-1.5 border border-border rounded-lg bg-surface font-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground font-semibold cursor-pointer"
              >
                <option value="" className="bg-surface text-foreground font-semibold">Tất cả Trạng thái</option>
                <option value="PAID" className="bg-surface text-foreground font-semibold">ĐÃ THANH TOÁN</option>
                <option value="PENDING" className="bg-surface text-foreground font-semibold">CHỜ THANH TOÁN</option>
                <option value="CANCELLED" className="bg-surface text-foreground font-semibold">ĐÃ HỦY</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto grow p-6">
          {isModalLoading ? (
            <div className="py-20 text-center text-muted-foreground">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <span className="font-body text-sm">
                  Đang tải danh sách đơn hàng...
                </span>
              </div>
            </div>
          ) : modalOrders.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground font-body text-sm">
              Không tìm thấy đơn hàng nào khớp với bộ lọc.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="p-3 border-b border-border">Mã đơn hàng</th>
                  <th className="p-3 border-b border-border">Khách hàng</th>
                  <th className="p-3 border-b border-border">Sự kiện</th>
                  <th className="p-3 border-b border-border text-center">
                    Số vé
                  </th>
                  <th className="p-3 border-b border-border">Số tiền</th>
                  <th className="p-3 border-b border-border">Trạng thái</th>
                  <th className="p-3 border-b border-border">Ngày tạo</th>
                  <th className="p-3 border-b border-border text-center">
                    Hành động
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
                        {order.user_name || "Khách hàng ẩn danh"}
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
                        {order.status === "PAID"
                          ? "ĐÃ THANH TOÁN"
                          : order.status === "PENDING"
                            ? "CHỜ THANH TOÁN"
                            : "ĐÃ HỦY"}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {new Date(order.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-3 text-center">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        onClick={onClose}
                      >
                        Chi tiết
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
              Trang {modalPage} / {modalTotalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={modalPage <= 1}
                onClick={() => onPageChange(Math.max(modalPage - 1, 1))}
                className="px-3 py-1.5 border border-border rounded-lg font-body text-xs font-semibold hover:bg-surface-high disabled:opacity-50 disabled:hover:bg-transparent text-foreground transition-all cursor-pointer"
              >
                Trước
              </button>
              <button
                disabled={modalPage >= modalTotalPages}
                onClick={() =>
                  onPageChange(Math.min(modalPage + 1, modalTotalPages))
                }
                className="px-3 py-1.5 border border-border rounded-lg font-body text-xs font-semibold hover:bg-surface-high disabled:opacity-50 disabled:hover:bg-transparent text-foreground transition-all cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
